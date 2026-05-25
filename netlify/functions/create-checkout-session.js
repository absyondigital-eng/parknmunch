const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.Supabase_URL,
  process.env.Supabase_Service_Role_Key
);

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let items, customer, discountCode;
  try {
    ({ items, customer = {}, discountCode } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  if (!Array.isArray(items) || items.length === 0) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'No items provided' }) };
  }

  if (!customer.name || !customer.phone || !customer.carReg) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing customer details' }) };
  }

  try {
    // Server-side discount validation (source of truth — frontend check is UX only)
    let discount = null;
    if (discountCode && typeof discountCode === 'string') {
      const code = discountCode.trim().toUpperCase();
      const { data } = await supabase
        .from('discount_codes')
        .select('code, percentage, active, uses, max_uses')
        .eq('code', code)
        .eq('active', true)
        .maybeSingle();

      if (data && (data.max_uses === null || data.uses < data.max_uses)) {
        discount = data;
      }
    }

    const lineItems = items.map(({ name, price, quantity }) => ({
      price_data: {
        currency: 'gbp',
        product_data: { name },
        unit_amount: Math.round(price * 100),
      },
      quantity,
    }));

    const orderRaw = JSON.stringify(
      items.map(({ name, quantity, price }) => ({ n: name, q: quantity, p: price }))
    );
    const orderMeta = orderRaw.length > 490 ? orderRaw.slice(0, 487) + '...' : orderRaw;

    const baseUrl = process.env.URL || 'http://localhost:8888';

    // Create Stripe coupon for validated discount
    let stripeCoupons = [];
    if (discount) {
      const coupon = await stripe.coupons.create({
        percent_off: discount.percentage,
        duration: 'once',
        name: `${discount.percentage}% off`,
      });
      stripeCoupons = [{ coupon: coupon.id }];
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${baseUrl}/success`,
      cancel_url: `${baseUrl}/order.html`,
      discounts: stripeCoupons.length ? stripeCoupons : undefined,
      metadata: {
        name:           customer.name,
        phone:          customer.phone,
        carReg:         customer.carReg,
        customer_email: customer.email || '',
        order:          orderMeta,
        discount_code:  discount ? discount.code : '',
        discount_pct:   discount ? String(discount.percentage) : '',
      },
    });

    return { statusCode: 200, headers, body: JSON.stringify({ url: session.url }) };
  } catch (err) {
    console.error('Stripe checkout error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
