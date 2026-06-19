const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { GoogleAuth } = require('google-auth-library');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Allow large image base64 payloads

// Serve static frontend files directly
app.use(express.static(__dirname));

// Helper to generate access token from Google Service Account
async function getVertexToken() {
  let credentials;
  if (process.env.GOOGLE_CREDS_JSON) {
    try {
      credentials = JSON.parse(process.env.GOOGLE_CREDS_JSON);
    } catch (e) {
      console.error('[Auth Error] Failed to parse GOOGLE_CREDS_JSON environment variable:', e);
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
    throw new Error('SUPABASE_URL or SUPABASE_ANON_KEY is not configured in your .env file.');
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

// 1. Unified Endpoint to Google AI Studio/Vertex AI (with Supabase saving)
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, userPrompt, apiType, projectId, token, simulate, character, action, matchedFile, generationCount } = req.body;
    const dbPrompt = userPrompt || prompt;
    const refImages = req.body.refImages || (req.body.refBase64 ? [req.body.refBase64] : []);
    const refBase64 = refImages[0] || '';

    // Verify Supabase config exists
    const hasSupabase = !!(process.env.SUPABASE_URL && (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY));
    if (!hasSupabase) {
      return res.status(500).json({ error: 'Supabase URL or Key is not configured on the server. Please add them to your .env file.' });
    }

    const finalAssetName = `${simulate ? matchedFile.replace('.png', '') : 'IMAGEN_OUTPUT'}_${generationCount || Date.now()}`;

    // --- CASE 1: SIMULATED MODE ---
    if (simulate) {
      console.log('[Local Server] Processing simulated request and saving metadata...');
      const staticImgUrl = `/example/${matchedFile}`;

      const insertRes = await callSupabase({
        path: '/rest/v1/history',
        method: 'POST',
        headers: { 'Prefer': 'return=representation' },
        body: {
          name: finalAssetName,
          character: character || 'dalsu',
          action: action || 'default',
          prompt: dbPrompt,
          img_url: staticImgUrl,
          is_simulated: true
        }
      });

      const insertedRows = await insertRes.json();
      return res.json({
        success: true,
        item: insertedRows[0]
      });
    }

    // --- CASE 2: LIVE MODE ---
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
        console.log('[Local Server] Generating access token using server-side Google Service Account...');
        const authInfo = await getVertexToken();
        url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${authInfo.projectId}/locations/us-central1/publishers/google/models/imagen-3.0-capability-001:predict`;
        headers['Authorization'] = `Bearer ${authInfo.token}`;
        usingGcpCreds = true;
      } catch (err) {
        console.error('[Local Server] Failed to authenticate with server-side credentials, falling back:', err.message);
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
          return res.status(400).json({ error: 'Google Cloud OAuth Access Token is required when not using server-side credentials.' });
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
          return res.status(400).json({ error: 'GEMINI_API_KEY is not configured on the server. Please add GEMINI_API_KEY to your .env file.' });
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

    console.log(`[Local Server] Forwarding request to Google model (using ${usingGcpCreds ? 'Vertex AI Server Credentials' : (isGeminiCall ? 'Gemini API' : 'Vertex AI Direct')})...`);
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Local Server Error] Upstream returned status ${response.status}: ${errText}`);
      return res.status(response.status).json({ error: `Upstream error: ${errText}` });
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
      return res.status(500).json({ error: 'Google API response is missing image payload.' });
    }

    // Convert base64 to Buffer
    const buffer = Buffer.from(outputB64, 'base64');
    const storageFilename = `img_${Date.now()}_${Math.round(Math.random() * 100000)}.png`;

    console.log(`[Local Server] Uploading image to Supabase Storage: ${storageFilename}...`);

    // Upload to Supabase Storage
    await callSupabase({
      path: `/storage/v1/object/character-history/${storageFilename}`,
      method: 'POST',
      headers: { 'Content-Type': 'image/png' },
      body: buffer,
      isBinary: true
    });

    const publicImgUrl = `${process.env.SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/character-history/${storageFilename}`;

    console.log(`[Local Server] Image uploaded. Saving metadata to Supabase DB: ${publicImgUrl}`);

    // Insert DB record
    const insertRes = await callSupabase({
      path: '/rest/v1/history',
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: {
        name: finalAssetName,
        character: character || 'dalsu',
        action: action || 'default',
        prompt: dbPrompt,
        img_url: publicImgUrl,
        is_simulated: false
      }
    });

    const insertedRows = await insertRes.json();

    res.json({
      success: true,
      item: insertedRows[0]
    });
  } catch (error) {
    console.error(`[Local Server Error]`, error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Fetch history endpoint
app.get('/api/get-history', async (req, res) => {
  try {
    const hasSupabase = !!(process.env.SUPABASE_URL && (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY));
    if (!hasSupabase) {
      return res.status(500).json({ error: 'Supabase URL or Key is not configured on the server.' });
    }

    console.log('[Local Server] Fetching history from Supabase DB...');
    const dbRes = await callSupabase({
      path: '/rest/v1/history?select=*&order=created_at.desc&limit=20',
      method: 'GET'
    });

    const items = await dbRes.json();
    res.json({
      success: true,
      items: items
    });
  } catch (error) {
    console.error('[Local Server Error]', error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Delete history endpoint
app.delete('/api/delete-history', async (req, res) => {
  try {
    const id = req.query.id;
    const all = req.query.all === 'true';

    if (!id && !all) {
      return res.status(400).json({ error: 'Missing id or all query parameter.' });
    }

    const hasSupabase = !!(process.env.SUPABASE_URL && (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY));
    if (!hasSupabase) {
      return res.status(500).json({ error: 'Supabase URL or Key is not configured on the server.' });
    }

    if (all) {
      console.log('[Local Server] Deleting all records from Supabase DB...');
      await callSupabase({
        path: '/rest/v1/history?id=neq.-1',
        method: 'DELETE'
      });
      return res.json({ success: true });
    }

    console.log(`[Local Server] Deleting history details for id: ${id}...`);

    // 1. Fetch item to verify storage file deletion
    const itemRes = await callSupabase({
      path: `/rest/v1/history?id=eq.${id}&select=img_url,is_simulated`,
      method: 'GET'
    });
    const items = await itemRes.json();

    if (items && items.length > 0) {
      const item = items[0];
      if (!item.is_simulated && item.img_url) {
        const match = item.img_url.match(/\/character-history\/([^?#]+)/);
        if (match) {
          const filename = match[1];
          console.log(`[Local Server] Deleting storage file: ${filename}`);
          try {
            await callSupabase({
              path: '/storage/v1/object/character-history',
              method: 'DELETE',
              body: { prefixes: [filename] }
            });
          } catch (storageErr) {
            console.warn('[Local Server Warning] Storage file deletion failed:', storageErr.message);
          }
        }
      }
    }

    // 2. Delete DB record
    console.log(`[Local Server] Deleting DB record for id: ${id}`);
    await callSupabase({
      path: `/rest/v1/history?id=eq.${id}`,
      method: 'DELETE'
    });

    res.json({ success: true });
  } catch (error) {
    console.error('[Local Server Error]', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(` Dalseo Character Studio Server Running!`);
  console.log(` Access Local App: http://localhost:${PORT}`);
  console.log(`===================================================`);
});
