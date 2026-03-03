const Stripe = require('stripe');

module.exports = async (req, res) => {
  // CORS headers – Blogspot থেকে কল করার অনুমতি
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const { amount, isMonthly, donorName, donorEmail, message } = req.body;

    // amount পেনিতে আসবে (Blogspot থেকে পাঠানোর সময় পাউন্ড → পেনি করে পাঠাতে হবে)
    const unitAmount = parseInt(amount);
    if (isNaN(unitAmount) || unitAmount < 100) {
      return res.status(400).json({ error: 'Invalid amount (minimum 100 pence)' });
    }

    const sessionParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: isMonthly
                ? 'Ramadan Sadaqah (Monthly)'
                : 'Ramadan Sadaqah (One-time)',
              description: 'Help save a child with severe hemophilia A',
            },
            unit_amount: unitAmount,
            recurring: isMonthly ? { interval: 'month' } : undefined,
          },
          quantity: 1,
        },
      ],
      mode: isMonthly ? 'subscription' : 'payment',
      success_url: 'https://www.ruhanshope.site/p/success_3.html?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://ruhanshope.site/p/cancel.html',
      metadata: {
        donorName: donorName || 'Anonymous',
        donorEmail: donorEmail || '',
        message: message || '',
      },
    };

    if (donorEmail) {
      sessionParams.customer_email = donorEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    res.status(200).json({ sessionId: session.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
