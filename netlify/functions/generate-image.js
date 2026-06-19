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

    const systemInstructions = `[Style Guide: 2D flat vector cartoon character, bold black outlines, solid white background, no text]
Dalsu and Dalhee are 2-head-tall chibi mascot characters with short, chubby limbs and no neck.
- Dalsu (달수): Always has fluffy, cloud-shaped dark brown hair (#604C3F) that surrounds his entire head, two simple black dot eyes, and a simple smiling mouth line.
- Dalhee (달희): Always has mushroom-shaped dark brown hair (#604C3F) with bangs completely covering her forehead and eyes (no eyes or eyebrows visible), and a simple smiling mouth line.
- Costume: If a specific outfit (e.g. suit, dress, uniform) is requested, draw it adapted to their chubby 2-head-tall chibi bodies (short sleeves, short pants, oversized tie, cute fit).
- Background & Floor: The background and floor must be seamless solid white (#FFFFFF). Omit any ground shadows, foot shadows, or gray ellipses under their feet. The feet must stand on pure white ground with no shadow indicators.

[한국어 캐릭터 가이드]
달수와 달희는 팔다리가 짧고 목이 없는 2등신 SD 마스코트 캐릭터입니다.
- 달수(Dalsu): 머리 전체를 포근하게 감싸는 갈색 구름 모양 머리, 검은색 점 눈 2개, 웃는 입선.
- 달희(Dalhee): 이마와 눈을 완전히 덮은 갈색 버섯 모양 머리(눈이나 눈썹 노출 금지), 웃는 입선.
- 의상: 요청된 의상(예: 정장)은 모두 이들의 짧고 통통한 2등신 마스코트 몸에 맞게 귀엽게 데포르메하여 적용합니다.
- 배경 및 그림자: 배경과 바닥은 완전히 깨끗한 단색 흰색(#FFFFFF)이어야 하며, 발밑에 타원형 회색 바닥 그림자나 어떠한 바닥 음영 표현도 그리지 말고 제거하십시오.`;
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
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'GEMINI_API_KEY is not configured in Netlify environment variables. Please add GEMINI_API_KEY in Netlify settings.' })
          };
        }
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
