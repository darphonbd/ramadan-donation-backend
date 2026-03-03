const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // মোট ডোনেশন (পেনিতে)
    const { data: totalData, error: totalError } = await supabase
      .from('donations')
      .select('amount');

    if (totalError) throw totalError;

    const totalRaised = totalData.reduce((acc, row) => acc + row.amount, 0);

    // সাম্প্রতিক ৫টি ডোনেশন
    const { data: recentData, error: recentError } = await supabase
      .from('donations')
      .select('donor_name, amount, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentError) throw recentError;

    res.status(200).json({
      totalRaised,          // পেনিতে
      recentDonations: recentData,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
