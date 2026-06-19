const fetch = require('node-fetch');
const { GoogleAuth } = require('google-auth-library');

// Helper to generate access token from Google Service Account on Netlify
async function getVertexToken() {
  let credentials;
  if (process.env.GOOGLE_CREDS_JSON) {
    try {
      credentials = JSON.parse(process.env.GOOGLE_CREDS_JSON);
    } catch (e) {
      console.error('[Netlify Auth Error] Failed to parse GOOGLE_CREDS_JSON:', e);
    }
  }

  const auth = new GoogleAuth({
    scopes: 'https://www.googleapis.com/auth/cloud-platform',
    credentials
  });
  
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const projectId = credentials ? credentials.project_id : await auth.getProjectId();
  
  return {
    token: tokenResponse.token,
    projectId: projectId
  };
}

// Supabase REST helper
async function callSupabase({ path, method = 'GET', headers = {}, body = null, isBinary = false }) {
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

  if (!isBinary && method !== 'GET') {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const requestOptions = {
    method,
    headers: { ...defaultHeaders, ...headers }
  };

  if (body) {
    requestOptions.body = isBinary ? body : JSON.stringify(body);
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

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
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
    const body = JSON.parse(event.body);
    const { prompt, apiType, projectId, token, simulate, character, action, matchedFile, generationCount } = body;
    const refImages = body.refImages || (body.refBase64 ? [body.refBase64] : []);
    const refBase64 = refImages[0] || '';

    // Verify Supabase Config exists
    const hasSupabase = !!(process.env.SUPABASE_URL && (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY));
    if (!hasSupabase) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Supabase URL or Key is not configured in Netlify environment variables.' })
      };
    }

    const finalAssetName = `${simulate ? matchedFile.replace('.png', '') : 'IMAGEN_OUTPUT'}_${generationCount || Date.now()}`;

    // --- CASE 1: SIMULATED GENERATION ---
    if (simulate) {
      console.log('[Netlify Function] Processing simulated request and saving metadata...');
      // Simulated image points to the static file hosted on the domain
      const staticImgUrl = `/example/${matchedFile}`;

      const insertRes = await callSupabase({
        path: '/rest/v1/history',
        method: 'POST',
        headers: { 'Prefer': 'return=representation' },
        body: {
          name: finalAssetName,
          character: character || 'dalsu',
          action: action || 'default',
          prompt: prompt,
          img_url: staticImgUrl,
          is_simulated: true
        }
      });

      const insertedRows = await insertRes.json();
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          item: insertedRows[0]
        })
      };
    }

    // --- CASE 2: LIVE IMAGE GENERATION ---
    let url = '';
    let headers = {
      'Content-Type': 'application/json'
    };
    let usingGcpCreds = false;
    let requestBody = {};
    let isGeminiCall = false;

    // 1. Check if Server-Side Service Account is configured (Method 2 Permanent Connection)
    if (apiType === 'vertex' && process.env.GOOGLE_CREDS_JSON) {
      try {
        console.log('[Netlify Function] Authenticating with server-side Google Service Account...');
        const authInfo = await getVertexToken();
        url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${authInfo.projectId}/locations/us-central1/publishers/google/models/imagen-3.0-capability-001:predict`;
        headers['Authorization'] = `Bearer ${authInfo.token}`;
        usingGcpCreds = true;
      } catch (err) {
        console.error('[Netlify Function] Server-side credential check failed, falling back:', err.message);
      }
    }

    const finalPrompt = prompt;

    if (usingGcpCreds) {
      requestBody = {
        instances: [
          {
            prompt: finalPrompt,
            image: {
              bytesBase64Encoded: refBase64
            }
          }
        ],
        parameters: {
          sampleCount: 1,
          aspectRatio: "1:1",
          imageFormat: "png",
          outputMimeType: "image/png"
        }
      };
    } else {
      if (apiType === 'vertex') {
        const targetProjectId = projectId || process.env.PROJECT_ID || '914250995391';
        if (!token) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Google Cloud OAuth Access Token is required when not using server-side credentials.' })
          };
        }
        url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${targetProjectId}/locations/us-central1/publishers/google/models/imagen-3.0-capability-001:predict`;
        headers['Authorization'] = `Bearer ${token}`;
        requestBody = {
          instances: [
            {
              prompt: finalPrompt,
              image: { bytesBase64Encoded: refBase64 }
            }
          ],
          parameters: {
            sampleCount: 1,
            aspectRatio: "1:1",
            imageFormat: "png",
            outputMimeType: "image/png"
          }
        };
      } else {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'GEMINI_API_KEY is not configured in Netlify environment variables.' })
          };
        }
        url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;
        isGeminiCall = true;
        
        const parts = [];
        for (const img of refImages) {
          parts.push({ inlineData: { mimeType: "image/png", data: img } });
        }
        parts.push({ text: finalPrompt });
        requestBody = {
          contents: [{ parts }],
          generationConfig: {
            responseModalities: ["IMAGE"]
          }
        };
      }
    }

    console.log(`[Netlify Function] Forwarding request to Google API (using ${usingGcpCreds ? 'Vertex AI Server Credentials' : (isGeminiCall ? 'Gemini API' : 'Vertex AI Direct')})...`);
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Netlify Upstream Error] Status ${response.status}: ${errText}`);
      return {
        statusCode: response.status,
        headers: corsHeaders,
        body: JSON.stringify({ error: `Upstream error: ${errText}` })
      };
    }

    const data = await response.json();
    
    // Extract base64 image data
    let outputB64 = '';
    if (data.predictions && data.predictions.length > 0) {
      outputB64 = data.predictions[0].bytesBase64Encoded;
    } else if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts) {
      const imgPart = data.candidates[0].content.parts.find(p => p.inlineData && p.inlineData.mimeType.startsWith('image/'));
      if (imgPart) {
        outputB64 = imgPart.inlineData.data;
      }
    }

    if (!outputB64) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Google API response is missing image payload.' })
      };
    }

    // Convert base64 to binary buffer for upload
    const buffer = Buffer.from(outputB64, 'base64');
    const storageFilename = `img_${Date.now()}_${Math.round(Math.random() * 100000)}.png`;
    
    console.log(`[Netlify Function] Uploading generated image to Supabase Storage as ${storageFilename}...`);
    
    // Upload image to Supabase Storage bucket 'character-history'
    await callSupabase({
      path: `/storage/v1/object/character-history/${storageFilename}`,
      method: 'POST',
      headers: { 'Content-Type': 'image/png' },
      body: buffer,
      isBinary: true
    });

    const publicImgUrl = `${process.env.SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/character-history/${storageFilename}`;

    console.log(`[Netlify Function] Image uploaded. Saving metadata to Supabase DB: ${publicImgUrl}`);

    // Insert meta row in Supabase DB
    const insertRes = await callSupabase({
      path: '/rest/v1/history',
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: {
        name: finalAssetName,
        character: character || 'dalsu',
        action: action || 'default',
        prompt: prompt,
        img_url: publicImgUrl,
        is_simulated: false
      }
    });

    const insertedRows = await insertRes.json();

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        item: insertedRows[0]
      })
    };
  } catch (error) {
    console.error(`[Netlify Function Error]`, error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.message })
    };
  }
};
