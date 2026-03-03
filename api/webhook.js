const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

module.exports = async (req, res) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.log(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    const amount = session.amount_total; // পেনিতে
    const currency = session.currency;
    const metadata = session.metadata || {};
    const donorEmail = session.customer_email || metadata.donorEmail || '';
    const donorName = metadata.donorName || 'Anonymous';
    const message = metadata.message || '';

    const { error } = await supabase.from('donations').insert([
      {
        amount,
        currency,
        donor_name: donorName,
        donor_email: donorEmail,
        message,
        stripe_session_id: session.id,
      },
    ]);

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Database insert failed' });
    }
  }

  res.status(200).json({ received: true });
};
