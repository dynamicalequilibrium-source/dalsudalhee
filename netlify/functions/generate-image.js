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

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // 방안 3: 클라이언트가 보낸 완성된 프롬프트를 그대로 사용 (이중 시스템 프롬프트 제거)
    // 방안 2: refImages 배열 지원 (하위 호환: refBase64도 지원)
    const body = JSON.parse(event.body);
    const { prompt, apiType, projectId, token } = body;
    const refImages = body.refImages || (body.refBase64 ? [body.refBase64] : []);
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
        console.log('[Netlify Function] Authenticating with server-side Google Service Account...');
        const authInfo = await getVertexToken();
        url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${authInfo.projectId}/locations/us-central1/publishers/google/models/imagen-3.0-capability-001:predict`;
        headers['Authorization'] = `Bearer ${authInfo.token}`;
        usingGcpCreds = true;
      } catch (err) {
        console.error('[Netlify Function] Server-side credential check failed, falling back:', err.message);
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
        // Client-provided temporary OAuth token for Vertex AI
        const targetProjectId = projectId || process.env.PROJECT_ID || '914250995391';
        if (!token) {
          return {
            statusCode: 400,
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
        // Google AI Studio with API Key -> Calls gemini-2.5-flash-image
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'GEMINI_API_KEY is not configured in Netlify environment variables. Please add GEMINI_API_KEY in Netlify settings.' })
          };
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
        body: JSON.stringify({ error: `Upstream error: ${errText}` })
      };
    }

    const data = await response.json();
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error(`[Netlify Function Error]`, error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
