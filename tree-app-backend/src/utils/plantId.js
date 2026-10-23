const axios = require('axios');
const FormData = require('form-data');

// Buffer ko base64 mein convert karke Plant.id API ko bhejta hai
const identifyPlant = async (imageBuffer) => {
  const base64Image = imageBuffer.toString('base64');

  const response = await axios.post(
    'https://api.plant.id/v2/identify',
    {
      images: [base64Image],
      // "modifiers" aur "plant_details" Plant.id API ki specific config hai
      modifiers: ['crops_fast', 'similar_images'],
      plant_details: ['common_names'],
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': process.env.PLANT_ID_API_KEY,
      },
    }
  );

  const suggestions = response.data?.suggestions || [];
  if (suggestions.length === 0) {
    return { rawGuess: null, confidence: 0 };
  }

  const top = suggestions[0];
  return {
    rawGuess: top.plant_name,
    confidence: Math.round(top.probability * 100),
    commonNames: top.plant_details?.common_names || [],
  };
};

module.exports = { identifyPlant };
