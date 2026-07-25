import type { FoodItem } from '../types/diary';
import { searchItalianStapleFoods } from '../data/italianStapleFoods';

/**
 * Calculates a 0-100% Healthiness Score (Percentuale Salutare) for a food product
 * using Nutri-Score, NOVA Group, and macronutrient density ratios.
 */
export const calculateHealthScore = (params: {
  nutriscoreGrade?: string;
  novaGroup?: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugars?: number;
  satFat?: number;
}): number => {
  const { nutriscoreGrade, novaGroup, calories, protein, fat, fiber = 0, sugars = 0, satFat = 0 } = params;

  // 1. Direct Nutri-Score mapping if available
  if (nutriscoreGrade) {
    const grade = nutriscoreGrade.toLowerCase().trim();
    if (grade === 'a') return 95;
    if (grade === 'b') return 82;
    if (grade === 'c') return 65;
    if (grade === 'd') return 45;
    if (grade === 'e') return 25;
  }

  // 2. Macro density algorithm fallback
  let score = 70;

  // Protein Bonus (up to +20)
  score += Math.min(20, protein * 1.5);

  // Fiber Bonus (up to +10)
  score += Math.min(10, fiber * 3);

  // Sugar Penalty
  if (sugars > 5) {
    score -= (sugars - 5) * 1.5;
  }

  // Saturated Fat Penalty
  if (satFat > 3) {
    score -= (satFat - 3) * 2;
  } else if (fat > 12) {
    score -= (fat - 12) * 1;
  }

  // Ultra-processed NOVA Group Penalty
  if (novaGroup === 4) {
    score -= 15;
  } else if (novaGroup === 1) {
    score += 10;
  }

  // High Calorie Density Penalty
  if (calories > 400) {
    score -= Math.min(15, (calories - 400) / 10);
  }

  // Clamp strictly between 15% and 98%
  return Math.max(15, Math.min(98, Math.round(score)));
};

/**
 * Clean and format brand name from OpenFoodFacts tags or string
 */
const cleanBrandName = (rawBrand?: string): string => {
  if (!rawBrand || !rawBrand.trim()) return '';
  const firstBrand = rawBrand.split(',')[0].trim();
  // Capitalize nicely
  return firstBrand.charAt(0).toUpperCase() + firstBrand.slice(1);
};

/**
 * OpenFoodFacts search API handler.
 */
export const searchOpenFoodFacts = async (query: string): Promise<FoodItem[]> => {
  if (!query.trim()) return [];

  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
    query
  )}&search_simple=1&action=process&json=1`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'NutriumFit - PWA - Version 1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (!data || !data.products || !Array.isArray(data.products)) {
      return [];
    }

    return data.products.map((product: any) => {
      const nutriments = product.nutriments || {};

      let calories = 0;
      if (nutriments['energy-kcal_100g'] !== undefined && nutriments['energy-kcal_100g'] !== null) {
        calories = Number(nutriments['energy-kcal_100g']);
      } else if (nutriments['energy-kcal_value'] !== undefined && nutriments['energy-kcal_value'] !== null) {
        calories = Number(nutriments['energy-kcal_value']);
      } else if (nutriments['energy-kcal'] !== undefined && nutriments['energy-kcal'] !== null) {
        calories = Number(nutriments['energy-kcal']);
      } else if (nutriments['energy_100g'] !== undefined && nutriments['energy_100g'] !== null) {
        calories = Math.round(Number(nutriments['energy_100g']) / 4.184);
      }

      const carbs = Number(nutriments.carbohydrates_100g || nutriments.carbohydrates || 0);
      const fat = Number(nutriments.fat_100g || nutriments.fat || 0);
      const protein = Number(nutriments.proteins_100g || nutriments.proteins || 0);
      const fiber = Number(nutriments.fiber_100g || nutriments.fiber || 0);
      const sugars = Number(nutriments.sugars_100g || nutriments.sugars || 0);
      const satFat = Number(nutriments['saturated-fat_100g'] || nutriments['saturated-fat'] || 0);

      const name =
        product.product_name_it ||
        product.product_name ||
        product.generic_name_it ||
        product.generic_name ||
        product.product_name_en ||
        'Alimento Sconosciuto';
      
      const brand = cleanBrandName(product.brands || product.brand_owner || (product.brands_tags && product.brands_tags[0]));
      const nutriscoreGrade = product.nutriscore_grade || product.nutrition_grades || undefined;
      const novaGroup = product.nova_group ? Number(product.nova_group) : undefined;

      const healthScore = calculateHealthScore({
        nutriscoreGrade,
        novaGroup,
        calories: isNaN(calories) ? 0 : Math.round(calories),
        protein: isNaN(protein) ? 0 : protein,
        carbs: isNaN(carbs) ? 0 : carbs,
        fat: isNaN(fat) ? 0 : fat,
        fiber: isNaN(fiber) ? 0 : fiber,
        sugars: isNaN(sugars) ? 0 : sugars,
        satFat: isNaN(satFat) ? 0 : satFat,
      });

      return {
        id: product.code ? `off_${product.code}` : `off_${Math.random().toString(36).substring(2, 9)}`,
        name,
        brand: brand || undefined,
        servingSize: '100g',
        servingUnit: 'g',
        servingAmount: 100,
        calories: isNaN(calories) ? 0 : Math.round(calories),
        macros: {
          carbs: isNaN(carbs) ? 0 : Math.round(carbs * 10) / 10,
          fat: isNaN(fat) ? 0 : Math.round(fat * 10) / 10,
          protein: isNaN(protein) ? 0 : Math.round(protein * 10) / 10,
        },
        fiberGrams: isNaN(fiber) ? 0 : Math.round(fiber * 10) / 10,
        sugarGrams: isNaN(sugars) ? 0 : Math.round(sugars * 10) / 10,
        healthScore,
        nutriscoreGrade,
        novaGroup,
        barcode: product.code || undefined,
      };
    });
  } catch (error) {
    console.error('Error searching OpenFoodFacts:', error);
    return [];
  }
};

/**
 * USDA FoodData Central API search for raw / unbranded fresh foods.
 */
export const searchUsdaFoods = async (query: string): Promise<FoodItem[]> => {
  if (!query.trim()) return [];

  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=DEMO_KEY&query=${encodeURIComponent(
    query
  )}&pageSize=5`;

  try {
    const response = await fetch(url);
    if (!response.ok) return [];

    const data = await response.json();
    if (!data || !data.foods || !Array.isArray(data.foods)) return [];

    return data.foods.map((food: any) => {
      const nutrients = food.foodNutrients || [];
      
      const getNutrient = (nameSnippet: string) => {
        const found = nutrients.find((n: any) => 
          n.nutrientName && n.nutrientName.toLowerCase().includes(nameSnippet.toLowerCase())
        );
        return found ? Number(found.value) : 0;
      };

      const calories = getNutrient('Energy');
      const protein = getNutrient('Protein');
      const fat = getNutrient('Total lipid');
      const carbs = getNutrient('Carbohydrate');

      const healthScore = calculateHealthScore({
        calories: Math.round(calories),
        protein,
        carbs,
        fat,
      });

      return {
        id: `usda_${food.fdcId}`,
        name: `${food.description} (USDA)`,
        brand: 'USDA FoodData',
        servingSize: '100g',
        servingUnit: 'g',
        servingAmount: 100,
        calories: Math.round(calories),
        macros: {
          carbs: Math.round(carbs * 10) / 10,
          protein: Math.round(protein * 10) / 10,
          fat: Math.round(fat * 10) / 10,
        },
        healthScore,
      };
    });
  } catch (err) {
    console.error('USDA search failed:', err);
    return [];
  }
};

/**
 * Unified search combining Local Italian Fresh Staples, OpenFoodFacts, and USDA FoodData Central.
 */
export const searchAllFoods = async (query: string): Promise<FoodItem[]> => {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // 1. Instant match from local Italian fresh staples database
  const localStaples = searchItalianStapleFoods(trimmed).map(item => ({
    ...item,
    healthScore: item.healthScore || calculateHealthScore({
      calories: item.calories,
      protein: item.macros.protein,
      carbs: item.macros.carbs,
      fat: item.macros.fat,
    }),
  }));

  // 2. Parallel network fetches for OFF and USDA
  const [offResults, usdaResults] = await Promise.all([
    searchOpenFoodFacts(trimmed),
    searchUsdaFoods(trimmed),
  ]);

  // Merge results: Local Italian fresh staples first, then OpenFoodFacts, then USDA
  const combined = [...localStaples, ...offResults, ...usdaResults];

  // Filter out any duplicates by ID
  const seenIds = new Set<string>();
  return combined.filter(item => {
    if (seenIds.has(item.id)) return false;
    seenIds.add(item.id);
    return true;
  });
};

/**
 * Fetches food details by barcode scanning.
 */
export const fetchFoodByBarcode = async (barcode: string): Promise<FoodItem | null> => {
  if (!barcode.trim()) return null;

  const url = `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'NutriumFit - PWA - Version 1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (!data || data.status !== 1 || !data.product) {
      return null;
    }

    const product = data.product;
    const nutriments = product.nutriments || {};

    let calories = 0;
    if (nutriments['energy-kcal_100g'] !== undefined && nutriments['energy-kcal_100g'] !== null) {
      calories = Number(nutriments['energy-kcal_100g']);
    } else if (nutriments['energy-kcal_value'] !== undefined && nutriments['energy-kcal_value'] !== null) {
      calories = Number(nutriments['energy-kcal_value']);
    } else if (nutriments['energy-kcal'] !== undefined && nutriments['energy-kcal'] !== null) {
      calories = Number(nutriments['energy-kcal']);
    } else if (nutriments['energy_100g'] !== undefined && nutriments['energy_100g'] !== null) {
      calories = Math.round(Number(nutriments['energy_100g']) / 4.184);
    }

    const carbs = Number(nutriments.carbohydrates_100g || nutriments.carbohydrates || 0);
    const fat = Number(nutriments.fat_100g || nutriments.fat || 0);
    const protein = Number(nutriments.proteins_100g || nutriments.proteins || 0);
    const fiber = Number(nutriments.fiber_100g || nutriments.fiber || 0);
    const sugars = Number(nutriments.sugars_100g || nutriments.sugars || 0);
    const satFat = Number(nutriments['saturated-fat_100g'] || nutriments['saturated-fat'] || 0);

    const name =
      product.product_name_it ||
      product.product_name ||
      product.generic_name_it ||
      product.generic_name ||
      product.product_name_en ||
      'Alimento Scansionato';
    
    const brand = cleanBrandName(product.brands || product.brand_owner || (product.brands_tags && product.brands_tags[0]));
    const nutriscoreGrade = product.nutriscore_grade || product.nutrition_grades || undefined;
    const novaGroup = product.nova_group ? Number(product.nova_group) : undefined;

    const healthScore = calculateHealthScore({
      nutriscoreGrade,
      novaGroup,
      calories: isNaN(calories) ? 0 : Math.round(calories),
      protein: isNaN(protein) ? 0 : protein,
      carbs: isNaN(carbs) ? 0 : carbs,
      fat: isNaN(fat) ? 0 : fat,
      fiber: isNaN(fiber) ? 0 : fiber,
      sugars: isNaN(sugars) ? 0 : sugars,
      satFat: isNaN(satFat) ? 0 : satFat,
    });

    return {
      id: product.code ? `off_${product.code}` : `off_${Math.random().toString(36).substring(2, 9)}`,
      name,
      brand: brand || undefined,
      servingSize: '100g',
      servingUnit: 'g',
      servingAmount: 100,
      calories: isNaN(calories) ? 0 : Math.round(calories),
      macros: {
        carbs: isNaN(carbs) ? 0 : Math.round(carbs * 10) / 10,
        fat: isNaN(fat) ? 0 : Math.round(fat * 10) / 10,
        protein: isNaN(protein) ? 0 : Math.round(protein * 10) / 10,
      },
      fiberGrams: isNaN(fiber) ? 0 : Math.round(fiber * 10) / 10,
      sugarGrams: isNaN(sugars) ? 0 : Math.round(sugars * 10) / 10,
      healthScore,
      nutriscoreGrade,
      novaGroup,
      barcode: barcode.trim(),
    };
  } catch (error) {
    console.error('Error fetching food by barcode:', error);
    return null;
  }
};
