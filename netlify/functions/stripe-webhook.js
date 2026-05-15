const stripe       = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

/* ── Supabase client (module-scope — reused across warm invocations) ── */
const supabaseUrl = process.env.Supabase_URL;
const supabaseKey = process.env.Supabase_Service_Role_Key;

if (!supabaseUrl || !supabaseKey) {
  console.error('[BOOT] MISSING Supabase env vars — Supabase_URL or Supabase_Service_Role_Key not set');
}

const supabase = createClient(supabaseUrl, supabaseKey);

/* ── Helpers ─────────────────────────────────────────────────────────── */
function getStripeSignature(headers) {
  // Netlify can normalise headers to lowercase or preserve original casing
  return (
    headers['stripe-signature'] ||
    headers['Stripe-Signature'] ||
    headers['STRIPE-SIGNATURE'] ||
    null
  );
}

function safeParseOrderItems(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn('[PARSE] order metadata is not an array:', typeof parsed);
      return [];
    }
    return parsed.map((i, idx) => {
      if (typeof i !== 'object' || i === null) {
        console.warn(`[PARSE] item[${idx}] is not an object:`, i);
        return { name: 'Unknown', quantity: 1, price: 0 };
      }
      return {
        name:     i.n || i.name     || 'Unknown',
        quantity: i.q || i.quantity || 1,
        price:    i.p || i.price    || 0,
      };
    });
  } catch (err) {
    console.error('[PARSE] Failed to parse order JSON:', err.message, '| raw value:', raw);
    return [];
  }
}

/* ── Handler ─────────────────────────────────────────────────────────── */
exports.handler = async (event) => {
  const reqId = Date.now(); // lightweight correlation ID per invocation
  console.log(`[${reqId}] ── Webhook invoked ──────────────────────────────`);
  console.log(`[${reqId}] Method:`, event.httpMethod);
  console.log(`[${reqId}] Body present:`, !!event.body, '| isBase64:', event.isBase64Encoded);
  console.log(`[${reqId}] Headers:`, JSON.stringify(
    Object.fromEntries(
      Object.entries(event.headers || {}).map(([k, v]) =>
        // redact signature value in logs — we only need to know it exists
        [k, k.toLowerCase() === 'stripe-signature' ? '[PRESENT]' : v]
      )
    )
  ));

  /* ── 1. Signature header ────────────────────────────────────────── */
  const sig = getStripeSignature(event.headers || {});
  console.log(`[${reqId}] stripe-signature header:`, sig ? '[PRESENT]' : '[MISSING]');

  if (!sig) {
    console.error(`[${reqId}] No Stripe signature header found — rejecting`);
    return { statusCode: 400, body: 'Webhook Error: No Stripe signature header' };
  }

  /* ── 2. Raw body ────────────────────────────────────────────────── */
  if (!event.body) {
    console.error(`[${reqId}] Empty body — rejecting`);
    return { statusCode: 400, body: 'Webhook Error: No webhook payload was provided.' };
  }

  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;

  console.log(`[${reqId}] Raw body length:`, rawBody.length);

  /* ── 3. Signature verification ──────────────────────────────────── */
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error(`[${reqId}] STRIPE_WEBHOOK_SECRET env var is not set`);
    return { statusCode: 500, body: 'Webhook Error: Webhook secret not configured' };
  }

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    console.log(`[${reqId}] Signature verification PASSED`);
  } catch (err) {
    console.error(`[${reqId}] Signature verification FAILED:`, err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  console.log(`[${reqId}] Event type:`, stripeEvent.type);
  console.log(`[${reqId}] Event ID:`,   stripeEvent.id);

  /* ── 4. Handle checkout.session.completed ───────────────────────── */
  if (stripeEvent.type !== 'checkout.session.completed') {
    console.log(`[${reqId}] Unhandled event type — returning 200`);
    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  }

  const session = stripeEvent.data.object;
  console.log(`[${reqId}] Session ID:`, session.id);
  console.log(`[${reqId}] Payment status:`, session.payment_status);
  console.log(`[${reqId}] Amount total (pence):`, session.amount_total);
  console.log(`[${reqId}] Customer details:`, JSON.stringify(session.customer_details || {}));

  /* ── 5. Metadata ─────────────────────────────────────────────────── */
  const metadata = session.metadata || {};
  console.log(`[${reqId}] Metadata raw:`, JSON.stringify(metadata));

  const customerName  = metadata.name   || '';
  const customerPhone = metadata.phone  || '';
  const carReg        = metadata.carReg || '';
  const orderRaw      = metadata.order  || '[]';

  if (!customerName)  console.warn(`[${reqId}] metadata.name is empty`);
  if (!customerPhone) console.warn(`[${reqId}] metadata.phone is empty`);
  if (!carReg)        console.warn(`[${reqId}] metadata.carReg is empty`);

  const orderItems  = safeParseOrderItems(orderRaw);
  const totalPounds = session.amount_total / 100;

  console.log(`[${reqId}] Parsed order items (${orderItems.length}):`, JSON.stringify(orderItems));
  console.log(`[${reqId}] Total: £${totalPounds.toFixed(2)}`);

  /* ── 6. Duplicate check ─────────────────────────────────────────── */
  console.log(`[${reqId}] Checking for duplicate session in Supabase...`);

  let existing = null;
  try {
    const { data, error: lookupErr } = await supabase
      .from('orders')
      .select('id')
      .eq('stripe_session_id', session.id)
      .maybeSingle();

    if (lookupErr) {
      console.error(`[${reqId}] Supabase LOOKUP error:`, JSON.stringify(lookupErr));
      return { statusCode: 500, body: JSON.stringify({ error: 'Database lookup failed' }) };
    }

    existing = data;
    console.log(`[${reqId}] Duplicate check result:`, existing ? `EXISTS (id=${existing.id})` : 'NOT FOUND — proceeding');
  } catch (err) {
    console.error(`[${reqId}] Unexpected error during lookup:`, err.message);
    return { statusCode: 500, body: JSON.stringify({ error: 'Database lookup exception' }) };
  }

  if (existing) {
    console.log(`[${reqId}] Duplicate webhook — session already in DB, returning 200`);
    return { statusCode: 200, body: JSON.stringify({ received: true, duplicate: true }) };
  }

  /* ── 7. Build insert record ─────────────────────────────────────── */
  const record = {
    stripe_session_id: session.id,
    customer_name:     customerName,
    customer_phone:    customerPhone,
    car_registration:  carReg,
    bay_number:        null,
    order_items:       orderItems,
    subtotal:          totalPounds,
    total:             totalPounds,
    payment_status:    'paid',
    order_status:      'new',
    notes:             null,
  };

  console.log(`[${reqId}] Insert payload:`, JSON.stringify(record));

  /* ── 8. Insert into Supabase ────────────────────────────────────── */
  try {
    const { data: inserted, error: insertErr } = await supabase
      .from('orders')
      .insert(record)
      .select(); // return the created row so we can log its id

    if (insertErr) {
      console.error(`[${reqId}] Supabase INSERT error code:`,    insertErr.code);
      console.error(`[${reqId}] Supabase INSERT error message:`, insertErr.message);
      console.error(`[${reqId}] Supabase INSERT error details:`, insertErr.details);
      console.error(`[${reqId}] Supabase INSERT error hint:`,    insertErr.hint);
      console.error(`[${reqId}] Full insertErr:`, JSON.stringify(insertErr));
      return { statusCode: 500, body: JSON.stringify({ error: 'Database insert failed', detail: insertErr.message }) };
    }

    console.log(`[${reqId}] ✓ Order SAVED successfully. Row:`, JSON.stringify(inserted));
  } catch (err) {
    console.error(`[${reqId}] Unexpected error during insert:`, err.message, err.stack);
    return { statusCode: 500, body: JSON.stringify({ error: 'Database insert exception' }) };
  }

  console.log(`[${reqId}] ── Handler complete ────────────────────────────`);
  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
