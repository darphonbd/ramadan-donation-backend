const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

module.exports = async (req, res) => {
  try {
    const rawBody = await new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => data += chunk);
      req.on('end', () => resolve(data));
      req.on('error', err => reject(err));
    });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const sig = req.headers['stripe-signature'];

    const event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      // upsert with ignoreDuplicates
      const { error } = await supabase
        .from('donations')
        .upsert(
          {
            amount: session.amount_total,
            currency: session.currency,
            donor_name: session.metadata?.donorName || 'Anonymous',
            donor_email: session.metadata?.donorEmail || '',
            message: session.metadata?.message || '',
            stripe_session_id: session.id,
          },
          {
            onConflict: 'stripe_session_id', // যে কলামটি unique
            ignoreDuplicates: true,           // duplicate হলে ignore করবে
          }
        );

      if (error) throw error;
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(400).json({ error: err.message });
  }
};
