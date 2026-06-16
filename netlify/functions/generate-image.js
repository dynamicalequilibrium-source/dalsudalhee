const fetch = require('node-fetch');

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

    if (apiType === 'vertex' && projectId && token) {
      // Vertex AI path (OAuth Token-based)
      url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/imagen-4.0-generate-001:predict`;
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      // Google AI Studio path (uses secure Netlify environment variable)
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return {
          statusCode: 500,
          body: JSON.stringify({ error: 'Server configuration error: GEMINI_API_KEY environment variable is not set in Netlify dashboard.' })
        };
      }
      url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`;
    }

    const systemInstructions = `첨부된 캐릭터를 그대로 유지한다. 얼굴 구조 변경 금지, 눈 모양 변경 금지, 신체 비율 변경 금지, 복장 변경 금지, 색상 변경 금지. 캐릭터 정체성을 유지하면서 포즈와 상황만 변경한다.`;
    const finalPrompt = `[System Instructions: ${systemInstructions}]\n\nUser Request: Generate the character performing the following scene: "${prompt}".`;

    const requestBody = {
      instances: [
        {
          prompt: finalPrompt
        }
      ],
      parameters: {
        mode: "image-to-image",
        image: {
          bytesBase64Encoded: refBase64
        },
        imageFormat: "png",
        sampleCount: 1,
        aspectRatio: "1:1",
        outputMimeType: "image/png"
      }
    };

    console.log(`[Netlify Function] Forwarding request to Google API...`);
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
        'Access-Control-Allow-Origin': '*' // CORS allowance
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
