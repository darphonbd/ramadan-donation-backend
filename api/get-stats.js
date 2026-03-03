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
    // মোট টাকা
    const { data: totalData, error: totalError } = await supabase
      .from('donations')
      .select('amount');

    if (totalError) throw totalError;

    const totalRaised = totalData.reduce((acc, row) => acc + row.amount, 0);
    
    // মোট ডোনারের সংখ্যা (স্বতন্ত্র সেশন আইডি গণনা)
    const { count, error: countError } = await supabase
      .from('donations')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;

    // সাম্প্রতিক ডোনেশন
    const { data: recentData, error: recentError } = await supabase
      .from('donations')
      .select('donor_name, amount, created_at')
      .order('created_at', { ascending: true })
      .limit(5);

    if (recentError) throw recentError;

    res.status(200).json({
      totalRaised,          // পেনিতে
      totalDonors: count,   // মোট ডোনার সংখ্যা
      recentDonations: recentData,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
