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

  // Only allow DELETE requests
  if (event.httpMethod !== 'DELETE') {
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
    const id = event.queryStringParameters && event.queryStringParameters.id;
    const all = event.queryStringParameters && event.queryStringParameters.all === 'true';

    if (!id && !all) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing id or all parameter in query string.' })
      };
    }

    const hasSupabase = !!(process.env.SUPABASE_URL && (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY));
    if (!hasSupabase) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Supabase URL or Key is not configured.' })
      };
    }

    if (all) {
      console.log('[Netlify Function] Deleting all records from Supabase DB...');
      
      // Delete all records from DB (using id not equal to -1 as a bypass for select filters requirement)
      await callSupabase({
        path: '/rest/v1/history?id=neq.-1',
        method: 'DELETE'
      });

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true })
      };
    }

    console.log(`[Netlify Function] Querying item details for id: ${id} to verify storage deletion...`);

    // 1. Fetch item to check if it's a live image stored in Storage
    const itemRes = await callSupabase({
      path: `/rest/v1/history?id=eq.${id}&select=img_url,is_simulated`,
      method: 'GET'
    });
    const items = await itemRes.json();

    if (items && items.length > 0) {
      const item = items[0];
      // If it's a live image, delete it from storage
      if (!item.is_simulated && item.img_url) {
        const match = item.img_url.match(/\/character-history\/([^?#]+)/);
        if (match) {
          const filename = match[1];
          console.log(`[Netlify Function] Deleting file from Storage bucket: ${filename}`);
          try {
            await callSupabase({
              path: '/storage/v1/object/character-history',
              method: 'DELETE',
              body: { prefixes: [filename] }
            });
          } catch (storageErr) {
            console.warn('[Netlify Function Warning] Failed to delete image from storage:', storageErr.message);
          }
        }
      }
    }

    // 2. Delete DB record
    console.log(`[Netlify Function] Deleting DB record for id: ${id}`);
    await callSupabase({
      path: `/rest/v1/history?id=eq.${id}`,
      method: 'DELETE'
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true })
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
