const fetch = require('node-fetch');

// Supabase REST helper
async function callSupabase({ path, method = 'GET', headers = {}, body = null }) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL or SUPABASE_ANON_KEY is not configured in environment variables.');
  }

  const url = `${supabaseUrl.replace(/\/$/, '')}${path}`;
  const defaultHeaders = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`
  };

  if (method !== 'GET') {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const requestOptions = {
    method,
    headers: { ...defaultHeaders, ...headers }
  };

  if (body) {
    requestOptions.body = JSON.stringify(body);
  }

  const res = await fetch(url, requestOptions);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase API error (${res.status}): ${text}`);
  }
  return res;
}

exports.handler = async (event, context) => {
  // Handle preflight OPTIONS requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE'
      },
      body: ''
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE'
  };

  try {
    const hasSupabase = !!(process.env.SUPABASE_URL && (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY));
    if (!hasSupabase) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Supabase URL or Key is not configured.' })
      };
    }

    console.log('[Netlify Function] Fetching character generation history from Supabase DB...');
    
    // Query last 20 records ordered by created_at descending
    const dbRes = await callSupabase({
      path: '/rest/v1/history?select=*&order=created_at.desc&limit=20',
      method: 'GET'
    });

    const items = await dbRes.json();

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        items: items
      })
    };
  } catch (error) {
    console.error('[Netlify Function Error]', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.message })
    };
  }
};
