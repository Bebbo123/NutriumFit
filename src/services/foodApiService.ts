import type { FoodItem } from '../types/diary';

export const searchOpenFoodFacts = async (query: string): Promise<FoodItem[]> => {
  if (!query.trim()) return [];

  // OpenFoodFacts search.pl endpoint
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

      // Fallback strategies for Calories
      let calories = 0;
      if (nutriments['energy-kcal_100g'] !== undefined && nutriments['energy-kcal_100g'] !== null) {
        calories = Number(nutriments['energy-kcal_100g']);
      } else if (nutriments['energy-kcal_value'] !== undefined && nutriments['energy-kcal_value'] !== null) {
        calories = Number(nutriments['energy-kcal_value']);
      } else if (nutriments['energy-kcal'] !== undefined && nutriments['energy-kcal'] !== null) {
        calories = Number(nutriments['energy-kcal']);
      } else if (nutriments['energy_100g'] !== undefined && nutriments['energy_100g'] !== null) {
        // energy_100g is in kJ, convert to kcal (1 kcal = 4.184 kJ)
        calories = Math.round(Number(nutriments['energy_100g']) / 4.184);
      }

      const carbs = Number(nutriments.carbohydrates_100g || nutriments.carbohydrates || 0);
      const fat = Number(nutriments.fat_100g || nutriments.fat || 0);
      const protein = Number(nutriments.proteins_100g || nutriments.proteins || 0);

      // Prefer Italian name, fallback to generic name, English name, or placeholder
      const name =
        product.product_name_it ||
        product.product_name ||
        product.product_name_en ||
        'Alimento Sconosciuto';
      
      const brand = product.brands || '';

      return {
        // If code is not present, generate unique ID with off_ prefix
        id: product.code ? `off_${product.code}` : `off_${Math.random().toString(36).substring(2, 9)}`,
        name,
        brand,
        servingSize: '100g',
        servingUnit: 'g',
        servingAmount: 100,
        calories: isNaN(calories) ? 0 : Math.round(calories),
        macros: {
          carbs: isNaN(carbs) ? 0 : Math.round(carbs * 10) / 10,
          fat: isNaN(fat) ? 0 : Math.round(fat * 10) / 10,
          protein: isNaN(protein) ? 0 : Math.round(protein * 10) / 10,
        },
      };
    });
  } catch (error) {
    console.error('Error searching OpenFoodFacts:', error);
    return [];
  }
};

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

    const name =
      product.product_name_it ||
      product.product_name ||
      product.product_name_en ||
      'Alimento Sconosciuto';
    
    const brand = product.brands || '';

    return {
      id: product.code ? `off_${product.code}` : `off_${Math.random().toString(36).substring(2, 9)}`,
      name,
      brand,
      servingSize: '100g',
      servingUnit: 'g',
      servingAmount: 100,
      calories: isNaN(calories) ? 0 : Math.round(calories),
      macros: {
        carbs: isNaN(carbs) ? 0 : Math.round(carbs * 10) / 10,
        fat: isNaN(fat) ? 0 : Math.round(fat * 10) / 10,
        protein: isNaN(protein) ? 0 : Math.round(protein * 10) / 10,
      },
    };
  } catch (error) {
    console.error('Error fetching food by barcode:', error);
    return null;
  }
};

