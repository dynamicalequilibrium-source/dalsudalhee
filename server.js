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
  
  // Get Project ID from service account or local system
  const projectId = credentials ? credentials.project_id : await auth.getProjectId();
  
  return {
    token: tokenResponse.token,
    projectId: projectId
  };
}

// Proxy Endpoint to Google AI Studio/Vertex AI
app.post('/api/generate-image', async (req, res) => {
  try {
    // 방안 3: 클라이언트가 보낸 완성된 프롬프트를 그대로 사용 (이중 시스템 프롬프트 제거)
    // 방안 2: refImages 배열 지원 (하위 호환: refBase64도 지원)
    const { prompt, apiType, projectId, token } = req.body;
    const refImages = req.body.refImages || (req.body.refBase64 ? [req.body.refBase64] : []);
    const refBase64 = refImages[0] || '';
    
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
        console.log('[Proxy] Generating access token using server-side Google Service Account...');
        const authInfo = await getVertexToken();
        url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${authInfo.projectId}/locations/us-central1/publishers/google/models/imagen-3.0-capability-001:predict`;
        headers['Authorization'] = `Bearer ${authInfo.token}`;
        usingGcpCreds = true;
      } catch (err) {
        console.error('[Proxy] Failed to authenticate with server-side credentials, falling back:', err.message);
      }
    }

    // 프롬프트는 클라이언트가 이미 완성하여 보냈으므로 그대로 사용
    const finalPrompt = prompt;

    if (usingGcpCreds) {
      // Vertex AI request body structure
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
        // Client-provided OAuth token for Vertex AI
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
        // Google AI Studio with API Key -> Calls gemini-2.5-flash-image
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          return res.status(400).json({ error: 'GEMINI_API_KEY is not configured on the server. Please add GEMINI_API_KEY to your .env file.' });
        }
        url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;
        isGeminiCall = true;
        // 방안 2: 모든 레퍼런스 이미지를 parts에 추가
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

    console.log(`[Proxy] Forwarding request to Google model (using ${usingGcpCreds ? 'Vertex AI Server Credentials' : (isGeminiCall ? 'Gemini API' : 'Vertex AI Direct')})...`);
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Proxy Error] Upstream returned status ${response.status}: ${errText}`);
      return res.status(response.status).json({ error: `Upstream error: ${errText}` });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error(`[Proxy Server Error]`, error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(` Dalseo Character Studio Server Running!`);
  console.log(` Access Local App: http://localhost:${PORT}`);
  console.log(`===================================================`);
});
