const axios = require('axios');
const FormData = require('form-data');

// PlantNet API integration for fallback/higher accuracy
// Docs: https://my-api.plantnet.org/

const identifyWithPlantNet = async (imageBuffer) => {
  const apiKey = process.env.PLANTNET_API_KEY;

  if (!apiKey) {
    console.warn('⚠️ PLANTNET_API_KEY is not configured');
    return { identified: false, confidence: 0 };
  }

  try {
    const formData = new FormData();
    formData.append('images', imageBuffer, {
      filename: 'plant.jpg',
      contentType: 'image/jpeg',
    });
    // Limit to Indian subcontinent / global
    formData.append('organs', 'auto'); 

    const response = await axios.post(
      `https://my-api.plantnet.org/v2/identify/all?api-key=${apiKey}`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 30000,
      }
    );

    const results = response.data?.results || [];

    if (results.length === 0) {
      return { identified: false, confidence: 0 };
    }

    const top = results[0];
    const confidence = Math.round((top.score || 0) * 100);

    return {
      identified: true,
      scientificName: top.species?.scientificNameWithoutAuthor || top.species?.scientificName || 'Unknown',
      commonName: top.species?.commonNames?.[0] || top.species?.scientificNameWithoutAuthor || 'Unknown',
      allCommonNames: top.species?.commonNames || [],
      confidence: confidence,
      family: top.species?.family?.scientificNameWithoutAuthor || 'Unknown',
      genus: top.species?.genus?.scientificNameWithoutAuthor || 'Unknown',
      allResults: results.slice(0, 5).map((r) => ({
        name: r.species?.scientificNameWithoutAuthor || 'Unknown',
        common: r.species?.commonNames?.[0] || '',
        score: Math.round((r.score || 0) * 100),
      })),
      source: 'PlantNet',
    };
  } catch (error) {
    console.error('PlantNet API error:', error.message);
    return { identified: false, confidence: 0, error: error.message };
  }
};

module.exports = { identifyWithPlantNet };
