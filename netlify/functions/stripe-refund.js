const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.Supabase_URL,
  process.env.Supabase_Service_Role_Key
);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { order_id, amount, reason } = body;
  if (!order_id || !amount || !reason) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing required fields' }) };
  }

  try {
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('stripe_session_id, total, order_status')
      .eq('id', order_id)
      .single();

    if (orderErr || !order) {
      return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: 'Order not found' }) };
    }

    if (order.order_status === 'refunded') {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Order already refunded' }) };
    }

    const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
    if (!session.payment_intent) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'No payment intent found for this order' }) };
    }

    const refund = await stripe.refunds.create({
      payment_intent: session.payment_intent,
      amount: Math.round(Number(amount) * 100),
    });

    await supabase.from('refunds').insert({
      order_id,
      amount: Number(amount),
      reason,
      stripe_refund_id: refund.id,
    });

    await supabase.from('orders').update({ order_status: 'refunded' }).eq('id', order_id);

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ success: true, stripe_refund_id: refund.id }),
    };
  } catch (err) {
    console.error('[Refund] Error:', err.message);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: err.message || 'Refund failed' }),
    };
  }
};
