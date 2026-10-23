const { identifyWithGroq } = require('./groqVision');
const { identifyPlantV3 } = require('./plantIdV3');
const { identifyWithPlantNet } = require('./plantNet');

/**
 * Orchestrates AI plant identification:
 * 1. Prioritizes Groq Vision (Ultra-fast, Free, LPU-accelerated, with Health & Care Tips).
 * 2. Falls back to Plant.id and PlantNet if needed.
 */
const identifyWithBestAI = async (imageBuffer) => {
  // If Groq API key is present, try Groq first for blazing speed (<1.5s)
  if (process.env.GROQ_API_KEY) {
    try {
      console.log('🚀 Running Groq Vision analysis...');
      const groqResult = await identifyWithGroq(imageBuffer);
      if (groqResult && groqResult.identified) {
        console.log(`✅ Groq Vision Identified: ${groqResult.commonName} (${groqResult.confidence}%)`);
        return groqResult;
      }
      console.log('⚠️ Groq could not identify plant, checking fallback models...');
    } catch (groqErr) {
      console.warn('⚠️ Groq Vision error, falling back:', groqErr.message);
    }
  }

  // Fallback to Plant.id & PlantNet concurrently
  console.log('🌿 Running Plant.id & PlantNet fallbacks...');
  const [plantIdResult, plantNetResult] = await Promise.all([
    identifyPlantV3(imageBuffer).catch(e => ({ identified: false, confidence: 0, error: e.message })),
    identifyWithPlantNet(imageBuffer).catch(e => ({ identified: false, confidence: 0, error: e.message })),
  ]);

  console.log(`🤖 Fallback AI Results - Plant.id: ${plantIdResult.confidence}% | PlantNet: ${plantNetResult.confidence}%`);

  const pidConfidence = plantIdResult.identified ? plantIdResult.confidence : 0;
  const pnetConfidence = plantNetResult.identified ? plantNetResult.confidence : 0;

  if (!plantIdResult.identified && !plantNetResult.identified) {
    return {
      identified: false,
      confidence: 0,
      message: 'All AI models failed to identify the plant. Please try with a clearer photo of the leaves or tree.',
    };
  }

  if (pnetConfidence > pidConfidence) {
    plantNetResult.source = 'PlantNet';
    return plantNetResult;
  } else {
    plantIdResult.source = 'Plant.id';
    return plantIdResult;
  }
};

module.exports = { identifyWithBestAI };
