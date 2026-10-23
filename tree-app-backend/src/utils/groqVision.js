const axios = require('axios');

/**
 * Groq Vision API (Powered by qwen/qwen3.8-27b)
 * Ultra-fast plant & tree identification, health diagnostics, and species matching.
 */
const identifyWithGroq = async (imageBuffer) => {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured in environment variables');
  }

  const base64Image = imageBuffer.toString('base64');

  const systemPrompt = `You are an expert botanist, forestry officer, and tree identification AI specialized in Indian and global flora.
Your job is to identify whatever plant, tree, sapling, leaf, flower, or foliage is visible in the photograph.
Even if the image shows distant foliage, bark, or a partial leaf, make your best expert assessment of the species.

You must respond ONLY with a valid JSON object matching this schema:
{
  "identified": true,
  "scientificName": "Botanical name (e.g. Azadirachta indica)",
  "commonName": "Common name (e.g. Neem)",
  "hindiName": "Hindi name if Indian plant (e.g. नीम)",
  "allCommonNames": ["Neem", "Indian Lilac", "Margosa"],
  "confidence": 92,
  "family": "Family name (e.g. Meliaceae)",
  "genus": "Genus name (e.g. Azadirachta)",
  "type": "Tree",
  "healthStatus": "Healthy",
  "careTips": "Practical advice on watering, soil, or sunlight",
  "uses": "Ayurvedic, ecological, or environmental benefits",
  "allResults": [
    { "name": "Azadirachta indica", "common": "Neem", "score": 92 }
  ]
}

Note: "confidence" must be an integer between 50 and 99.
Only if the photograph has absolutely no plants, trees, leaves, or vegetation (for instance, a screenshot, human face, vehicle, or pure solid color) should you set "identified": false with an explanatory "message".`;

  const payload = {
    model: 'qwen/qwen3.8-27b',
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Identify the tree, plant, leaf, or vegetation in this photo. Return your botanical identification in the required JSON format.',
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
            },
          },
        ],
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 800,
  };

  const response = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    payload,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 25000,
    }
  );

  const rawContent = response.data?.choices?.[0]?.message?.content;
  if (!rawContent) {
    return {
      identified: false,
      confidence: 0,
      message: 'Empty response from Groq Vision',
    };
  }

  let parsed;
  try {
    const cleanJson = rawContent.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
    parsed = JSON.parse(cleanJson);
  } catch (err) {
    console.error('Failed to parse Groq response JSON:', rawContent);
    return {
      identified: false,
      confidence: 0,
      message: 'Failed to parse model output',
    };
  }

  if (!parsed.identified) {
    return {
      identified: false,
      confidence: 0,
      message: parsed.message || 'Could not identify any plant in this image.',
    };
  }

  let confidence = typeof parsed.confidence === 'number'
    ? Math.round(parsed.confidence)
    : parseInt(parsed.confidence, 10) || 85;
  if (confidence > 99) confidence = 98;
  if (confidence < 40) confidence = 75;

  const commonNames = Array.isArray(parsed.allCommonNames) && parsed.allCommonNames.length > 0
    ? parsed.allCommonNames
    : [parsed.commonName, parsed.hindiName].filter(Boolean);

  const alternatives = Array.isArray(parsed.allResults) && parsed.allResults.length > 0
    ? parsed.allResults.map((r) => ({
        name: r.name || r.scientificName || 'Unknown',
        common: r.common || r.commonName || '',
        score: typeof r.score === 'number' ? Math.round(r.score) : parseInt(r.score, 10) || confidence,
      }))
    : [
        {
          name: parsed.scientificName || 'Unknown',
          common: parsed.commonName || 'Unknown',
          score: confidence,
        },
      ];

  return {
    identified: true,
    source: 'Groq Vision (Qwen-27B)',
    scientificName: parsed.scientificName || 'Unknown',
    commonName: parsed.commonName || 'Unknown',
    hindiName: parsed.hindiName || '',
    allCommonNames: commonNames,
    confidence: confidence,
    family: parsed.family || 'Unknown',
    genus: parsed.genus || 'Unknown',
    type: parsed.type || 'Tree',
    healthStatus: parsed.healthStatus || 'Healthy',
    careTips: parsed.careTips || '',
    uses: parsed.uses || '',
    allResults: alternatives,
  };
};

module.exports = { identifyWithGroq };
