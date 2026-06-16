const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Allow large image base64 payloads

// Serve static frontend files directly
app.use(express.static(__dirname));

// Proxy Endpoint to Google AI Studio/Vertex AI
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, refBase64, apiType, projectId, token } = req.body;
    
    let url = '';
    let headers = {
      'Content-Type': 'application/json'
    };

    if (apiType === 'vertex' && projectId && token) {
      // Use client-provided temporary token if they explicitly selected Vertex AI
      url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/imagen-3.0-capability-001:predict`;
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      // Default: Google AI Studio with server's permanent API Key
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'Server configuration error: GEMINI_API_KEY is not set.' });
      }
      url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-capability-001:predict?key=${apiKey}`;
    }

    const systemInstructions = `첨부된 캐릭터를 그대로 유지한다. 얼굴 구조 변경 금지, 눈 모양 변경 금지, 신체 비율 변경 금지, 복장 변경 금지, 색상 변경 금지. 캐릭터 정체성을 유지하면서 포즈와 상황만 변경한다.`;
    const finalPrompt = `[System Instructions: ${systemInstructions}]\n\nUser Request: Generate the character performing the following scene: "${prompt}".`;

    const requestBody = {
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

    console.log(`[Proxy] Forwarding image generation request to Google API...`);
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
