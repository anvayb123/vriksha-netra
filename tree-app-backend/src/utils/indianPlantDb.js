// Built-in Indian Plant Database
// Contains 50+ common and uncommon Indian plants with details
const indianPlants = [
  { name: 'Neem', scientific: 'Azadirachta indica', hindi: 'नीम', family: 'Meliaceae', uses: 'Medicinal, pesticide, timber', habitat: 'Dry deciduous forests', type: 'Tree' },
  { name: 'Peepal', scientific: 'Ficus religiosa', hindi: 'पीपल', family: 'Moraceae', uses: 'Religious significance, oxygen producer, medicinal', habitat: 'Plains and lower hills', type: 'Tree' },
  { name: 'Banyan', scientific: 'Ficus benghalensis', hindi: 'बरगद', family: 'Moraceae', uses: 'National tree of India, shade, medicinal', habitat: 'Tropical and subtropical regions', type: 'Tree' },
  { name: 'Gulmohar', scientific: 'Delonix regia', hindi: 'गुलमोहर', family: 'Fabaceae', uses: 'Ornamental, shade tree', habitat: 'Tropical gardens and roadsides', type: 'Tree' },
  { name: 'Mango', scientific: 'Mangifera indica', hindi: 'आम', family: 'Anacardiaceae', uses: 'National fruit, food, timber, medicinal', habitat: 'Tropical lowlands', type: 'Tree' },
  { name: 'Mahogany', scientific: 'Swietenia mahagoni', hindi: 'महोगनी', family: 'Meliaceae', uses: 'Timber, furniture, ornamental', habitat: 'Tropical forests', type: 'Tree' },
  { name: 'Jamun', scientific: 'Syzygium cumini', hindi: 'जामुन', family: 'Myrtaceae', uses: 'Fruit, diabetes treatment, timber', habitat: 'Moist deciduous forests', type: 'Tree' },
  { name: 'Ashoka', scientific: 'Saraca asoca', hindi: 'अशोक', family: 'Fabaceae', uses: 'Ornamental, Ayurvedic medicine, sacred', habitat: 'Tropical evergreen forests', type: 'Tree' },
  { name: 'Tulsi', scientific: 'Ocimum tenuiflorum', hindi: 'तुलसी', family: 'Lamiaceae', uses: 'Sacred plant, Ayurvedic medicine, tea', habitat: 'Throughout India, cultivated', type: 'Herb' },
  { name: 'Amla', scientific: 'Phyllanthus emblica', hindi: 'आँवला', family: 'Phyllanthaceae', uses: 'Rich in Vitamin C, Ayurvedic medicine, hair care', habitat: 'Deciduous forests', type: 'Tree' },
  { name: 'Teak', scientific: 'Tectona grandis', hindi: 'सागौन', family: 'Lamiaceae', uses: 'Premium timber, furniture, shipbuilding', habitat: 'Tropical and subtropical moist forests', type: 'Tree' },
  { name: 'Bamboo', scientific: 'Bambusa vulgaris', hindi: 'बांस', family: 'Poaceae', uses: 'Construction, paper, furniture, food', habitat: 'Throughout India, moist regions', type: 'Grass' },
  { name: 'Coconut', scientific: 'Cocos nucifera', hindi: 'नारियल', family: 'Arecaceae', uses: 'Food, oil, coir, construction', habitat: 'Coastal tropical regions', type: 'Palm' },
  { name: 'Tamarind', scientific: 'Tamarindus indica', hindi: 'इमली', family: 'Fabaceae', uses: 'Culinary, medicinal, timber', habitat: 'Tropical dry deciduous forests', type: 'Tree' },
  { name: 'Sal', scientific: 'Shorea robusta', hindi: 'साल', family: 'Dipterocarpaceae', uses: 'Timber, resin, sacred', habitat: 'Sub-Himalayan and central Indian forests', type: 'Tree' },
  { name: 'Sandalwood', scientific: 'Santalum album', hindi: 'चंदन', family: 'Santalaceae', uses: 'Perfumery, sacred rituals, carving', habitat: 'Dry deciduous forests of South India', type: 'Tree' },
  { name: 'Jackfruit', scientific: 'Artocarpus heterophyllus', hindi: 'कटहल', family: 'Moraceae', uses: 'Largest tree fruit, timber, food', habitat: 'Tropical lowlands', type: 'Tree' },
  { name: 'Curry Leaf', scientific: 'Murraya koenigii', hindi: 'कड़ी पत्ता', family: 'Rutaceae', uses: 'Culinary flavoring, Ayurvedic medicine', habitat: 'Throughout South India', type: 'Tree' },
  { name: 'Moringa', scientific: 'Moringa oleifera', hindi: 'सहजन', family: 'Moringaceae', uses: 'Superfood, water purification, medicinal', habitat: 'Sub-Himalayan tracts', type: 'Tree' },
  { name: 'Bougainvillea', scientific: 'Bougainvillea spectabilis', hindi: 'बोगनविलिया', family: 'Nyctaginaceae', uses: 'Ornamental, hedging', habitat: 'Gardens throughout India', type: 'Shrub' },
  { name: 'Marigold', scientific: 'Tagetes erecta', hindi: 'गेंदा', family: 'Asteraceae', uses: 'Ornamental, religious ceremonies, pest repellent', habitat: 'Cultivated throughout India', type: 'Herb' },
  { name: 'Hibiscus', scientific: 'Hibiscus rosa-sinensis', hindi: 'गुड़हल', family: 'Malvaceae', uses: 'Ornamental, hair care, religious offerings', habitat: 'Gardens throughout India', type: 'Shrub' },
  { name: 'Jasmine', scientific: 'Jasminum sambac', hindi: 'चमेली', family: 'Oleaceae', uses: 'Perfumery, religious ceremonies, tea', habitat: 'Throughout India, cultivated', type: 'Shrub' },
  { name: 'Rose', scientific: 'Rosa indica', hindi: 'गुलाब', family: 'Rosaceae', uses: 'Ornamental, perfumery, gulkand, rosewater', habitat: 'Cultivated throughout India', type: 'Shrub' },
  { name: 'Aloe Vera', scientific: 'Aloe barbadensis', hindi: 'एलोवेरा', family: 'Asphodelaceae', uses: 'Skin care, medicinal, cosmetics', habitat: 'Arid and semi-arid regions', type: 'Succulent' },
  { name: 'Palash', scientific: 'Butea monosperma', hindi: 'पलाश', family: 'Fabaceae', uses: 'Holi colors, Ayurvedic medicine, lac cultivation', habitat: 'Dry deciduous forests', type: 'Tree' },
  { name: 'Amaltas', scientific: 'Cassia fistula', hindi: 'अमलतास', family: 'Fabaceae', uses: 'Ornamental, Ayurvedic medicine, laxative', habitat: 'Deciduous forests', type: 'Tree' },
  { name: 'Areca Palm', scientific: 'Areca catechu', hindi: 'सुपारी', family: 'Arecaceae', uses: 'Betel nut, ornamental', habitat: 'Tropical wet regions', type: 'Palm' },
  { name: 'Kadamba', scientific: 'Neolamarckia cadamba', hindi: 'कदम्ब', family: 'Rubiaceae', uses: 'Sacred, timber, Ayurveda', habitat: 'Sub-Himalayan and Northeast India', type: 'Tree' },
  { name: 'Sheesham', scientific: 'Dalbergia sissoo', hindi: 'शीशम', family: 'Fabaceae', uses: 'Premium timber, furniture, fodder', habitat: 'Sub-Himalayan tract', type: 'Tree' },
  { name: 'Custard Apple', scientific: 'Annona squamosa', hindi: 'सीताफल', family: 'Annonaceae', uses: 'Fruit, medicinal, insecticidal', habitat: 'Dry deciduous regions', type: 'Tree' },
  { name: 'Guava', scientific: 'Psidium guajava', hindi: 'अमरूद', family: 'Myrtaceae', uses: 'Fruit, rich in Vitamin C, medicinal', habitat: 'Throughout India', type: 'Tree' },
  { name: 'Papaya', scientific: 'Carica papaya', hindi: 'पपीता', family: 'Caricaceae', uses: 'Fruit, digestive enzyme papain, medicinal', habitat: 'Tropical and subtropical India', type: 'Tree' },
  { name: 'Nag Champa', scientific: 'Calophyllum inophyllum', hindi: 'नाग चम्पा', family: 'Calophyllaceae', uses: 'Ornamental, oil, coastal protection', habitat: 'Coastal India', type: 'Tree' },
  { name: 'Champa', scientific: 'Michelia champaca', hindi: 'चम्पा', family: 'Magnoliaceae', uses: 'Perfumery, timber, sacred', habitat: 'Eastern Himalayan foothills', type: 'Tree' },
  { name: 'Parijat', scientific: 'Nyctanthes arbor-tristis', hindi: 'पारिजात', family: 'Oleaceae', uses: 'Sacred, Ayurvedic medicine, dye', habitat: 'Sub-Himalayan regions', type: 'Tree' },
  { name: 'Indian Laburnum', scientific: 'Cassia fistula', hindi: 'अमलतास', family: 'Fabaceae', uses: 'Ornamental flowering tree, medicinal', habitat: 'Deciduous forests throughout India', type: 'Tree' },
  { name: 'Bauhinia', scientific: 'Bauhinia variegata', hindi: 'कचनार', family: 'Fabaceae', uses: 'Ornamental, edible flowers, bark for tanning', habitat: 'Sub-Himalayan forests', type: 'Tree' },
  { name: 'Chinar', scientific: 'Platanus orientalis', hindi: 'चिनार', family: 'Platanaceae', uses: 'Shade tree, ornamental, cultural significance', habitat: 'Kashmir Valley', type: 'Tree' },
  { name: 'Deodar', scientific: 'Cedrus deodara', hindi: 'देवदार', family: 'Pinaceae', uses: 'Timber, essential oil, sacred cedar', habitat: 'Western Himalayan forests', type: 'Tree' },
  { name: 'Rhododendron', scientific: 'Rhododendron arboreum', hindi: 'बुरांश', family: 'Ericaceae', uses: 'State tree of Uttarakhand, juice, medicinal', habitat: 'Himalayan forests', type: 'Tree' },
  { name: 'Banana', scientific: 'Musa acuminata', hindi: 'केला', family: 'Musaceae', uses: 'Fruit, fiber, religious significance', habitat: 'Tropical India', type: 'Herb' },
  { name: 'Brahma Kamal', scientific: 'Saussurea obvallata', hindi: 'ब्रह्म कमल', family: 'Asteraceae', uses: 'Sacred flower, rare medicinal', habitat: 'High altitude Himalayas (3000-5000m)', type: 'Herb' },
  { name: 'Lotus', scientific: 'Nelumbo nucifera', hindi: 'कमल', family: 'Nelumbonaceae', uses: 'National flower, sacred, edible seeds and roots', habitat: 'Ponds and lakes throughout India', type: 'Aquatic' },
  { name: 'Henna', scientific: 'Lawsonia inermis', hindi: 'मेहंदी', family: 'Lythraceae', uses: 'Body art, hair dye, medicinal', habitat: 'Arid and semi-arid regions', type: 'Shrub' },
  { name: 'Indian Cork Tree', scientific: 'Millingtonia hortensis', hindi: 'नीम चमेली', family: 'Bignoniaceae', uses: 'Ornamental, fragrant flowers, avenue tree', habitat: 'Throughout India in cultivation', type: 'Tree' },
  { name: 'Rain Tree', scientific: 'Samanea saman', hindi: 'विलायती शिरीष', family: 'Fabaceae', uses: 'Shade tree, fodder, timber', habitat: 'Tropical India, roadside', type: 'Tree' },
  { name: 'Ashwagandha', scientific: 'Withania somnifera', hindi: 'अश्वगंधा', family: 'Solanaceae', uses: 'Ayurvedic adaptogen, stress relief, energy booster', habitat: 'Dry regions of India', type: 'Herb' },
];

// Simple text-based matching against the plant database
const identifyFromDatabase = (guessText) => {
  if (!guessText) return null;
  const lower = guessText.toLowerCase();
  
  // Direct name match
  let best = null;
  let bestScore = 0;

  for (const plant of indianPlants) {
    const targets = [plant.name, plant.scientific, plant.hindi].map(s => s.toLowerCase());
    
    for (const target of targets) {
      if (lower === target) return { plant, score: 100 };
      if (lower.includes(target) || target.includes(lower)) {
        const score = 70 + (30 * Math.min(lower.length, target.length) / Math.max(lower.length, target.length));
        if (score > bestScore) {
          bestScore = score;
          best = plant;
        }
      }
    }

    // Check scientific name words
    const sciWords = plant.scientific.toLowerCase().split(' ');
    for (const word of sciWords) {
      if (word.length > 3 && lower.includes(word)) {
        const score = 60;
        if (score > bestScore) {
          bestScore = score;
          best = plant;
        }
      }
    }
  }
  
  return best ? { plant: best, score: Math.round(bestScore) } : null;
};

// Get full plant details for the scan result screen
const getPlantDetails = (plantName) => {
  if (!plantName) return null;
  const lower = plantName.toLowerCase();
  return indianPlants.find(p => 
    p.name.toLowerCase() === lower || 
    p.scientific.toLowerCase() === lower ||
    p.hindi === plantName
  ) || null;
};

// Get all plants in the database (for browsing)
const getAllPlants = () => indianPlants;

module.exports = { indianPlants, identifyFromDatabase, getPlantDetails, getAllPlants };
