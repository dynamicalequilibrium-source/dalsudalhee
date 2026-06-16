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
    const { prompt, refBase64, apiType, projectId, token } = JSON.parse(event.body);

    let url = '';
    let headers = {
      'Content-Type': 'application/json'
    };
    let usingGcpCreds = false;
    let requestBody = {};
    let isGeminiCall = false;

    // 1. Check if Server-Side Service Account is configured (Method 2 Permanent Connection)
    if (process.env.GOOGLE_CREDS_JSON) {
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

    const systemInstructions = `첨부된 캐릭터를 그대로 유지한다. 얼굴 구조 변경 금지, 눈 모양 변경 금지, 신체 비율 변경 금지, 복장 변경 금지, 색상 변경 금지. 캐릭터 정체성을 유지하면서 포즈와 상황만 변경한다.`;
    const finalPrompt = `[System Instructions: ${systemInstructions}]\n\nUser Request: Generate the character performing the following scene: "${prompt}".`;

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
        const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyDbXvGVIoHumx5v_yf74KDEG6D-cU0IEjA';
        url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;
        isGeminiCall = true;
        requestBody = {
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: "image/png",
                    data: refBase64
                  }
                },
                {
                  text: finalPrompt
                }
              ]
            }
          ],
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
