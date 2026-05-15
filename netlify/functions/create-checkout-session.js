const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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

  let items, customer;
  try {
    ({ items, customer = {} } = JSON.parse(event.body));
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
    const lineItems = items.map(({ name, price, quantity }) => ({
      price_data: {
        currency: 'gbp',
        product_data: { name },
        unit_amount: Math.round(price * 100),
      },
      quantity,
    }));

    // Compact order summary — keep within Stripe's 500-char metadata limit per value
    const orderRaw = JSON.stringify(
      items.map(({ name, quantity, price }) => ({ n: name, q: quantity, p: price }))
    );
    const orderMeta = orderRaw.length > 490 ? orderRaw.slice(0, 487) + '...' : orderRaw;

    const baseUrl = process.env.URL || 'http://localhost:8888';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${baseUrl}/success`,
      cancel_url:  `${baseUrl}/order.html`,
      metadata: {
        name:   customer.name,
        phone:  customer.phone,
        carReg: customer.carReg,
        order:  orderMeta,
      },
    });

    return { statusCode: 200, headers, body: JSON.stringify({ url: session.url }) };
  } catch (err) {
    console.error('Stripe checkout error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
