const stringSimilarity = require('string-similarity');

// AI ka raw guess + apni Species list ke against best match dhundta hai.
// Threshold ke neeche match milta hai to null return karta hai (matlab flag karna hoga).
const matchAgainstDropdown = (aiGuess, speciesList, threshold = 0.6) => {
  if (!aiGuess || speciesList.length === 0) return null;

  // Har species ke against uska naam + common names sab candidates ban jaate hain
  const candidates = [];
  speciesList.forEach((species) => {
    candidates.push({ text: species.name, species });
    (species.commonNames || []).forEach((cn) => {
      candidates.push({ text: cn, species });
    });
  });

  const texts = candidates.map((c) => c.text.toLowerCase());
  const { bestMatch, bestMatchIndex } = stringSimilarity.findBestMatch(
    aiGuess.toLowerCase(),
    texts
  );

  if (bestMatch.rating >= threshold) {
    return {
      species: candidates[bestMatchIndex].species,
      matchScore: bestMatch.rating,
    };
  }

  return null;
};

module.exports = { matchAgainstDropdown };
