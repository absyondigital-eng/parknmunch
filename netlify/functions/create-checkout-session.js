const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.Supabase_URL,
  process.env.Supabase_Service_Role_Key
);

const ORDER_CHUNK_LEN  = 490; // per-key budget, under Stripe's 500-char-per-value limit
const ORDER_MAX_CHUNKS = 20;  // ~9.8k chars of headroom across order_0..order_19 — hundreds of items

// Stripe metadata values are capped at 500 chars EACH, but a checkout session
// can hold many metadata keys. Rather than squeezing the whole order into one
// value (which silently loses items once it overflows a single field), the
// order JSON is split across order_0, order_1, ... (see buildOrderMetadata)
// and stripe-webhook.js reassembles them by concatenation before parsing.
// packOrderMetadata still guards the truly pathological case — an order so
// large it exceeds even ORDER_MAX_CHUNKS worth of space — by dropping the
// excess with a visible "+N more" marker instead of ever losing everything.
function packOrderMetadata(items, maxLen) {
  const mapped = items.map(({ name, quantity, price }) => ({ n: name, q: quantity, p: price }));

  const full = JSON.stringify(mapped);
  if (full.length <= maxLen) return full;

  const markerFor  = (n) => ({ n: `+${n} more item${n > 1 ? 's' : ''} - see Stripe session for full order`, q: 1, p: 0 });
  const markerRoom = JSON.stringify(markerFor(mapped.length)).length + 1; // +1 for the joining comma
  const packBudget = maxLen - markerRoom;

  let fitCount = 0;
  for (let i = 1; i <= mapped.length; i++) {
    if (JSON.stringify(mapped.slice(0, i)).length > packBudget) break;
    fitCount = i;
  }

  const remaining = mapped.length - fitCount;
  const withMarker = JSON.stringify([...mapped.slice(0, fitCount), markerFor(remaining)]);

  // Safety net — should always fit given the reserved room above.
  return withMarker.length <= maxLen ? withMarker : JSON.stringify(mapped.slice(0, fitCount));
}

// Splits the (already length-guarded) order JSON string across order_0,
// order_1, ... metadata keys, plus order_count so the webhook knows how many
// to reassemble.
function buildOrderMetadataChunks(items) {
  const raw = packOrderMetadata(items, ORDER_CHUNK_LEN * ORDER_MAX_CHUNKS);
  const chunks = {};
  let count = 0;
  for (let i = 0; i < raw.length; i += ORDER_CHUNK_LEN) {
    chunks[`order_${count}`] = raw.slice(i, i + ORDER_CHUNK_LEN);
    count++;
  }
  chunks.order_count = String(count);
  return chunks;
}

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
        notes:          (customer.notes || '').slice(0, 500),
        ...buildOrderMetadataChunks(items),
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
