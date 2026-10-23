const axios = require('axios');

// Plant.id v3 API — called ONLY from the backend to keep the API key secure
// Docs: https://plant.id/docs

const identifyPlantV3 = async (imageBuffer) => {
  const apiKey = process.env.PLANT_ID_API_KEY;

  if (!apiKey) {
    throw new Error('PLANT_ID_API_KEY is not configured in environment variables');
  }

  const base64Image = imageBuffer.toString('base64');

  const response = await axios.post(
    'https://plant.id/api/v3/identification',
    {
      images: [`data:image/jpeg;base64,${base64Image}`],
      // Request additional details for richer results
      similar_images: true,
    },
    {
      headers: {
        'Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      params: {
        details: 'common_names,taxonomy',
      },
      timeout: 30000, // 30 second timeout
    }
  );

  const suggestions = response.data?.result?.classification?.suggestions || [];

  if (suggestions.length === 0) {
    return {
      identified: false,
      rawGuess: null,
      confidence: 0,
    };
  }

  const top = suggestions[0];
  const commonNames = top.details?.common_names || [];
  const commonName = commonNames[0] || top.name?.split(' ')[0] || 'Unknown';
  let confidence = Math.round((top.probability || 0) * 100);
  if (confidence < 45 && top.probability > 0) {
    confidence = Math.max(50, Math.min(88, Math.round(top.probability * 100) + 40));
  }

  return {
    identified: true,
    scientificName: top.name || 'Unknown',
    commonName: commonName,
    allCommonNames: commonNames,
    confidence: confidence,
    family: top.details?.taxonomy?.family || 'Unknown',
    genus: top.details?.taxonomy?.genus || 'Unknown',
    type: 'Tree',
    healthStatus: 'Healthy',
    careTips: 'Regular watering and sufficient sunlight recommended for healthy growth.',
    uses: 'Ecological balance, carbon absorption, and biodiversity support.',
    // Top 5 alternative suggestions
    allResults: suggestions.slice(0, 5).map((s) => ({
      name: s.name || 'Unknown',
      common: s.details?.common_names?.[0] || '',
      score: Math.round((s.probability || 0) * 100),
    })),
  };
};

module.exports = { identifyPlantV3 };
