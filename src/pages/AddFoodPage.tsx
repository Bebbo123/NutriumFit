import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Plus,
  Check,
  Filter,
  Loader2,
  AlertCircle,
  Save,
  Trash2,
  ChevronDown,
  ChevronUp,
  Search,
} from 'lucide-react';
import { useDiaryStore } from '../store/diaryStore';
import { MOCK_FOOD_DATABASE } from '../data/mockFoods';
import { SearchBar } from '../components/food/SearchBar';
import { TabBar } from '../components/food/TabBar';
import type { FoodTab } from '../components/food/TabBar';
import type { MealType, FoodItem, Recipe, RecipeIngredient, SavedMeal } from '../types/diary';
import { useAuth } from '../context/AuthContext';
import { useDebounce } from '../hooks/useDebounce';
import { searchOpenFoodFacts, fetchFoodByBarcode } from '../services/foodApiService';
import { diaryService } from '../services/diaryService';
import { Html5Qrcode } from 'html5-qrcode';

interface AddFoodPageProps {
  initialMealType?: MealType;
  onBack: () => void;
  onFoodAdded: () => void;
}

export const AddFoodPage: React.FC<AddFoodPageProps> = ({
  initialMealType = 'Colazione',
  onBack,
  onFoodAdded,
}) => {
  const { user } = useAuth();
  const {
    selectedDate,
    addFoodLog,
    fetchLogsForDate,
    logs,
    recipes,
    fetchRecipes,
    createRecipe,
    deleteRecipe,
    savedMeals,
    fetchSavedMeals,
    deleteSavedMeal,
  } = useDiaryStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMeal, setSelectedMeal] = useState<MealType>(initialMealType);
  const [activeTab, setActiveTab] = useState<FoodTab>('recent');
  const [selectedFoodForServing, setSelectedFoodForServing] = useState<FoodItem | null>(null);
  const [servingsInput, setServingsInput] = useState<number>(1);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [addedFoodIds, setAddedFoodIds] = useState<Set<string>>(new Set());

  // API search states
  const [apiFoods, setApiFoods] = useState<FoodItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Custom food list
  const [customFoods, setCustomFoods] = useState<FoodItem[]>([]);

  // Expanded cards states (for recipes & meals)
  const [expandedRecipeIds, setExpandedRecipeIds] = useState<Set<string>>(new Set());
  const [expandedMealIds, setExpandedMealIds] = useState<Set<string>>(new Set());

  // Recipe Builder states
  const [showRecipeBuilder, setShowRecipeBuilder] = useState(false);
  const [recipeBuilderName, setRecipeBuilderName] = useState('');
  const [recipeBuilderServings, setRecipeBuilderServings] = useState<number>(2);
  const [recipeBuilderIngredients, setRecipeBuilderIngredients] = useState<Omit<RecipeIngredient, 'id' | 'recipe_id'>[]>([]);
  
  // Recipe Builder search state
  const [rbSearchQuery, setRbSearchQuery] = useState('');
  const [rbSelectedFood, setRbSelectedFood] = useState<FoodItem | null>(null);
  const [rbIngredientQuantity, setRbIngredientQuantity] = useState<number>(100);
  const [rbSearchResults, setRbSearchResults] = useState<FoodItem[]>([]);
  const [rbSearching, setRbSearching] = useState(false);
  const debouncedRbQuery = useDebounce(rbSearchQuery, 500);

  // Recipe selection for diary serving modal
  const [selectedRecipeForDiary, setSelectedRecipeForDiary] = useState<Recipe | null>(null);
  const [recipeServingsInput, setRecipeServingsInput] = useState<number>(1);

  // Custom food form states
  const [showCustomFoodModal, setShowCustomFoodModal] = useState(false);
  const [customFoodName, setCustomFoodName] = useState('');
  const [customFoodBrand, setCustomFoodBrand] = useState('');
  const [customFoodCalories, setCustomFoodCalories] = useState('');
  const [customFoodCarbs, setCustomFoodCarbs] = useState('');
  const [customFoodFat, setCustomFoodFat] = useState('');
  const [customFoodProtein, setCustomFoodProtein] = useState('');
  const [customFoodSaving, setCustomFoodSaving] = useState(false);
  const [customFoodError, setCustomFoodError] = useState<string | null>(null);
  
  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // Scanner scanner-specific states
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Debounced search query
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const loadCustomFoods = useCallback(async () => {
    if (!user) return;
    try {
      const res = await diaryService.searchCustomFoods(user.id, '');
      setCustomFoods(res);
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  // Load custom foods, recipes, and saved meals
  useEffect(() => {
    if (user) {
      fetchRecipes(user.id);
      fetchSavedMeals(user.id);
      loadCustomFoods();
    }
  }, [user, fetchRecipes, fetchSavedMeals, loadCustomFoods]);

  // Pre-fill custom food name when query exists
  useEffect(() => {
    if (showCustomFoodModal && searchQuery.trim()) {
      setCustomFoodName(searchQuery);
    }
  }, [showCustomFoodModal, searchQuery]);

  // Fetch from OpenFoodFacts API and custom_foods when debounced query changes
  useEffect(() => {
    let active = true;
    const performSearch = async () => {
      if (!debouncedSearchQuery.trim()) {
        setApiFoods([]);
        setIsSearching(false);
        return;
      }
      setIsSearching(true);
      try {
        const [customResults, apiResults] = await Promise.all([
          user ? diaryService.searchCustomFoods(user.id, debouncedSearchQuery) : Promise.resolve([]),
          searchOpenFoodFacts(debouncedSearchQuery)
        ]);

        if (active) {
          setApiFoods([...customResults, ...apiResults]);
        }
      } catch (err) {
        console.error('Error fetching foods:', err);
        if (active) {
          setApiFoods([]);
        }
      } finally {
        if (active) {
          setIsSearching(false);
        }
      }
    };

    performSearch();
    return () => {
      active = false;
    };
  }, [debouncedSearchQuery, user]);

  // Search inside Recipe Builder
  useEffect(() => {
    let active = true;
    const performRbSearch = async () => {
      if (!debouncedRbQuery.trim()) {
        setRbSearchResults([]);
        setRbSearching(false);
        return;
      }
      setRbSearching(true);
      try {
        const [customResults, apiResults] = await Promise.all([
          user ? diaryService.searchCustomFoods(user.id, debouncedRbQuery) : Promise.resolve([]),
          searchOpenFoodFacts(debouncedRbQuery)
        ]);

        if (active) {
          // Merge local mock with db results for recipe ingredient search
          const localMatch = MOCK_FOOD_DATABASE.filter(f => f.name.toLowerCase().includes(debouncedRbQuery.toLowerCase()));
          setRbSearchResults([...customResults, ...localMatch, ...apiResults]);
        }
      } catch (err) {
        console.error('Recipe builder search error:', err);
      } finally {
        if (active) {
          setRbSearching(false);
        }
      }
    };
    performRbSearch();
    return () => {
      active = false;
    };
  }, [debouncedRbQuery, user]);

  // Compile recently logged items from logs
  const recentFoods = useMemo(() => {
    const allLoggedFoods: FoodItem[] = [];
    const seenNames = new Set<string>();

    Object.values(logs).forEach((dayLogs) => {
      dayLogs.forEach((log) => {
        if (!seenNames.has(log.name)) {
          seenNames.add(log.name);
          allLoggedFoods.push({
            id: log.foodId || `recent_${log.logId}`,
            name: log.name,
            brand: log.brand,
            servingSize: log.servingSizeDisplay || '1 porzione',
            servingUnit: 'porzione',
            servingAmount: 1,
            calories: log.calories / (log.servings || 1),
            macros: {
              carbs: log.macros.carbs / (log.servings || 1),
              fat: log.macros.fat / (log.servings || 1),
              protein: log.macros.protein / (log.servings || 1),
            },
            isVerified: false,
          });
        }
      });
    });

    if (allLoggedFoods.length === 0) {
      return MOCK_FOOD_DATABASE.slice(0, 5);
    }
    return allLoggedFoods.slice(0, 10);
  }, [logs]);

  // Determine what list to show
  const displayedFoods = useMemo(() => {
    if (searchQuery.trim()) {
      return apiFoods;
    }
    // Tab switching if search query is empty
    switch (activeTab) {
      case 'recent':
        return recentFoods;
      case 'frequent':
        return recentFoods.slice(0, 5);
      case 'my_foods':
        return customFoods.length > 0 ? customFoods : MOCK_FOOD_DATABASE.slice(0, 3);
      case 'meals':
      case 'recipes':
      default:
        return [];
    }
  }, [searchQuery, activeTab, apiFoods, recentFoods, customFoods]);

  const handleSelectFood = (food: FoodItem) => {
    setSelectedFoodForServing(food);
    if (food.id.startsWith('off_') || food.id.startsWith('custom_')) {
      setServingsInput(100);
    } else {
      setServingsInput(1);
    }
  };

  const handleQuickAdd = async (food: FoodItem) => {
    if (!user) return;
    await addFoodLog(user.id, selectedDate, food, selectedMeal, 1);
    await fetchLogsForDate(user.id, selectedDate);
    setAddedFoodIds((prev) => new Set(prev).add(food.id));
    showToast(`"${food.name}" aggiunto con successo!`);
    setTimeout(() => {
      setAddedFoodIds((prev) => {
        const next = new Set(prev);
        next.delete(food.id);
        return next;
      });
    }, 1500);
  };

  const multiplier = useMemo(() => {
    if (!selectedFoodForServing) return 1;
    return (selectedFoodForServing.id.startsWith('off_') || selectedFoodForServing.id.startsWith('custom_'))
      ? servingsInput / 100
      : servingsInput;
  }, [selectedFoodForServing, servingsInput]);

  const handleConfirmServingAdd = async () => {
    if (!selectedFoodForServing || !user) return;
    await addFoodLog(user.id, selectedDate, selectedFoodForServing, selectedMeal, multiplier);
    await fetchLogsForDate(user.id, selectedDate);
    setSelectedFoodForServing(null);
    setServingsInput(1);
    onFoodAdded();
  };

  // Recipe serving confirm
  const handleConfirmRecipeAdd = async () => {
    if (!selectedRecipeForDiary || !user) return;
    
    // Calculate single serving averages
    const totalKcal = selectedRecipeForDiary.ingredients?.reduce((s, i) => s + i.calories, 0) || 0;
    const totalCarbs = selectedRecipeForDiary.ingredients?.reduce((s, i) => s + i.carbs, 0) || 0;
    const totalFat = selectedRecipeForDiary.ingredients?.reduce((s, i) => s + i.fat, 0) || 0;
    const totalProtein = selectedRecipeForDiary.ingredients?.reduce((s, i) => s + i.protein, 0) || 0;
    const parts = selectedRecipeForDiary.servings || 1;

    const avgKcal = totalKcal / parts;
    const avgCarbs = totalCarbs / parts;
    const avgFat = totalFat / parts;
    const avgProtein = totalProtein / parts;

    const recipeFoodItem: FoodItem = {
      id: `recipe_${selectedRecipeForDiary.id}`,
      name: `[Ricetta] ${selectedRecipeForDiary.name}`,
      servingSize: '1 porzione',
      servingUnit: 'porzione',
      servingAmount: 1,
      calories: avgKcal,
      macros: {
        carbs: avgCarbs,
        fat: avgFat,
        protein: avgProtein,
      },
    };

    await addFoodLog(user.id, selectedDate, recipeFoodItem, selectedMeal, recipeServingsInput);
    await fetchLogsForDate(user.id, selectedDate);
    setSelectedRecipeForDiary(null);
    setRecipeServingsInput(1);
    showToast(`Ricetta "${selectedRecipeForDiary.name}" aggiunta!`);
    onFoodAdded();
  };

  // Add all saved meal items to current diary section
  const handleAddSavedMealToDiary = async (meal: SavedMeal) => {
    if (!user || !meal.items || meal.items.length === 0) return;
    try {
      for (const item of meal.items) {
        const dummyFood: FoodItem = {
          id: `saved_item_${item.id}`,
          name: item.food_name,
          servingSize: item.serving_size_display || '1 porzione',
          servingUnit: 'porzione',
          servingAmount: 1,
          calories: item.calories / (item.servings || 1),
          macros: {
            carbs: item.carbs / (item.servings || 1),
            fat: item.fat / (item.servings || 1),
            protein: item.protein / (item.servings || 1),
          },
        };
        await addFoodLog(user.id, selectedDate, dummyFood, selectedMeal, item.servings);
      }
      await fetchLogsForDate(user.id, selectedDate);
      showToast(`Pasto "${meal.name}" aggiunto a ${selectedMeal}!`);
      onFoodAdded();
    } catch (e) {
      console.error(e);
      showToast("Si è verificato un errore durante l'aggiunta.", "error");
    }
  };

  // Toggle expand/collapse card
  const toggleExpandRecipe = (id: string) => {
    setExpandedRecipeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleExpandMeal = (id: string) => {
    setExpandedMealIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Recipe Builder Add Ingredient
  const handleAddIngredientToBuilder = () => {
    if (!rbSelectedFood) return;
    const isCustomOrOff = rbSelectedFood.id.startsWith('off_') || rbSelectedFood.id.startsWith('custom_');
    const scale = isCustomOrOff ? rbIngredientQuantity / 100 : rbIngredientQuantity;

    const ingredient: Omit<RecipeIngredient, 'id' | 'recipe_id'> = {
      food_name: rbSelectedFood.name,
      calories: Math.round(rbSelectedFood.calories * scale),
      carbs: Math.round(rbSelectedFood.macros.carbs * scale * 10) / 10,
      fat: Math.round(rbSelectedFood.macros.fat * scale * 10) / 10,
      protein: Math.round(rbSelectedFood.macros.protein * scale * 10) / 10,
      quantity: rbIngredientQuantity,
      unit: isCustomOrOff ? 'g' : 'porzioni',
    };

    setRecipeBuilderIngredients((prev) => [...prev, ingredient]);
    setRbSelectedFood(null);
    setRbSearchQuery('');
    setRbSearchResults([]);
  };

  // Save recipe
  const handleSaveRecipe = async () => {
    if (!user) return;
    if (!recipeBuilderName.trim()) {
      alert('Inserisci il nome della ricetta.');
      return;
    }
    if (recipeBuilderIngredients.length === 0) {
      alert('Aggiungi almeno un ingrediente alla ricetta.');
      return;
    }

    const saved = await createRecipe(user.id, recipeBuilderName, recipeBuilderServings, recipeBuilderIngredients);
    if (saved) {
      showToast(`Ricetta "${recipeBuilderName}" creata con successo!`);
      // Reset
      setRecipeBuilderName('');
      setRecipeBuilderServings(2);
      setRecipeBuilderIngredients([]);
      setShowRecipeBuilder(false);
    } else {
      alert('Si è verificato un errore durante il salvataggio della ricetta.');
    }
  };

  // Beep Sound for Barcode scan
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(850, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.12);
    } catch (e) {
      console.warn('Web Audio beep error:', e);
    }
  };

  // Barcode scanner lifecycle
  useEffect(() => {
    if (!showScannerModal) {
      setCameraError(null);
      setScannerLoading(false);
      return;
    }

    let active = true;
    const scannerId = "scanner-reader";

    const timer = setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode(scannerId);
        html5QrCodeRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (width, height) => {
              const size = Math.min(width, height) * 0.7;
              return { width: Math.round(size * 1.2), height: Math.round(size * 0.6) };
            }
          },
          async (decodedText) => {
            if (!active) return;
            active = false;
            playBeep();
            setScannerLoading(true);

            try {
              await html5QrCode.stop();
            } catch (e) {
              console.warn("Failed to stop scanner", e);
            }

            const food = await fetchFoodByBarcode(decodedText);
            if (food) {
              setSelectedFoodForServing(food);
              setServingsInput(100);
              setShowScannerModal(false);
            } else {
              const createNew = window.confirm(
                `Prodotto con codice ${decodedText} non trovato. Creare l'alimento manualmente?`
              );
              if (createNew) {
                setShowCustomFoodModal(true);
              }
              setShowScannerModal(false);
            }
          },
          () => {}
        );
      } catch (err: any) {
        console.error("Camera start error:", err);
        if (active) {
          if (err.name === "NotAllowedError" || err.message?.includes("Permission")) {
            setCameraError("Accesso alla fotocamera negato. Per favore, abilita i permessi nelle impostazioni.");
          } else {
            setCameraError("Impossibile avviare la fotocamera. Assicurati che non sia utilizzata da un'altra app.");
          }
        }
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch((e) => console.warn("Failed cleanup stop", e));
      }
    };
  }, [showScannerModal]);

  const handleCreateCustomFood = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustomFoodError(null);

    if (!user) {
      setCustomFoodError("Utente non autenticato.");
      return;
    }
    if (!customFoodName.trim()) {
      setCustomFoodError("Il nome dell'alimento è obbligatorio.");
      return;
    }

    setCustomFoodSaving(true);
    try {
      const calories = parseInt(customFoodCalories, 10);
      if (isNaN(calories)) {
        setCustomFoodError("Valore calorie non valido.");
        setCustomFoodSaving(false);
        return;
      }
      const carbs = parseFloat(customFoodCarbs) || 0;
      const fat = parseFloat(customFoodFat) || 0;
      const protein = parseFloat(customFoodProtein) || 0;

      const createdFood = await diaryService.createCustomFood(
        user.id,
        customFoodName,
        customFoodBrand,
        calories,
        carbs,
        fat,
        protein
      );

      if (createdFood) {
        setCustomFoods((prev) => [createdFood, ...prev]);
        setShowCustomFoodModal(false);
        setCustomFoodName('');
        setCustomFoodBrand('');
        setCustomFoodCalories('');
        setCustomFoodCarbs('');
        setCustomFoodFat('');
        setCustomFoodProtein('');
        showToast("Alimento personalizzato creato!");
      }
    } catch (err: any) {
      console.error(err);
      setCustomFoodError(err.message || "Errore durante il salvataggio.");
    } finally {
      setCustomFoodSaving(false);
    }
  };

  // Recipe totals calculations
  const recipeTotals = useMemo(() => {
    return recipeBuilderIngredients.reduce(
      (acc, ing) => {
        acc.calories += ing.calories;
        acc.carbs += ing.carbs;
        acc.fat += ing.fat;
        acc.protein += ing.protein;
        return acc;
      },
      { calories: 0, carbs: 0, fat: 0, protein: 0 }
    );
  }, [recipeBuilderIngredients]);

  // Render Recipe Builder Overlay
  if (showRecipeBuilder) {
    return (
      <div className="pb-24 pt-4 px-4 max-w-md mx-auto min-h-screen bg-slate-950 font-sans text-slate-100">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setShowRecipeBuilder(false)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-extrabold text-white">Crea Nuova Ricetta</h1>
            <p className="text-xs text-slate-400">Componi una ricetta e calcola i macro per porzione</p>
          </div>
        </div>

        {/* Recipe Setup Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-4 mb-4 shadow-sm">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Nome Ricetta *
            </label>
            <input
              type="text"
              required
              value={recipeBuilderName}
              onChange={(e) => setRecipeBuilderName(e.target.value)}
              placeholder="Es. Lasagne Light alla Ricotta"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-150 focus:outline-none focus:border-cyan-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Numero di Porzioni *
            </label>
            <input
              type="number"
              min="1"
              required
              value={recipeBuilderServings}
              onChange={(e) => setRecipeBuilderServings(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-150 focus:outline-none focus:border-cyan-500 font-mono font-bold"
            />
          </div>
        </div>

        {/* Recipe Live nutritional estimation */}
        {recipeBuilderIngredients.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 mb-4">
            <h3 className="text-xs font-bold text-slate-300 mb-2 uppercase tracking-wide">Macro Totali & Per Porzione</h3>
            <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                <span className="text-[9px] text-slate-500 block font-sans">Kcal / Porz.</span>
                <span className="font-black text-cyan-400">
                  {Math.round(recipeTotals.calories / recipeBuilderServings)}
                </span>
                <span className="text-[8px] text-slate-600 block mt-0.5">({recipeTotals.calories} tot)</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                <span className="text-[9px] text-blue-500 block font-sans">Carboidrati</span>
                <span className="font-bold text-blue-400">
                  {Math.round((recipeTotals.carbs / recipeBuilderServings) * 10) / 10}g
                </span>
                <span className="text-[8px] text-slate-600 block mt-0.5">({Math.round(recipeTotals.carbs)}g)</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                <span className="text-[9px] text-red-500 block font-sans">Grassi</span>
                <span className="font-bold text-red-400">
                  {Math.round((recipeTotals.fat / recipeBuilderServings) * 10) / 10}g
                </span>
                <span className="text-[8px] text-slate-600 block mt-0.5">({Math.round(recipeTotals.fat)}g)</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                <span className="text-[9px] text-emerald-500 block font-sans">Proteine</span>
                <span className="font-bold text-emerald-400">
                  {Math.round((recipeTotals.protein / recipeBuilderServings) * 10) / 10}g
                </span>
                <span className="text-[8px] text-slate-600 block mt-0.5">({Math.round(recipeTotals.protein)}g)</span>
              </div>
            </div>
          </div>
        )}

        {/* Recipe Ingredients List */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 mb-4 shadow-sm">
          <h3 className="text-xs font-bold text-slate-200 mb-2 uppercase tracking-wide">Ingredienti ({recipeBuilderIngredients.length})</h3>
          
          {recipeBuilderIngredients.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">Nessun ingrediente aggiunto. Usa la barra di ricerca sotto.</p>
          ) : (
            <div className="space-y-2 mb-2 max-h-48 overflow-y-auto divide-y divide-slate-850">
              {recipeBuilderIngredients.map((ing, i) => (
                <div key={i} className="flex justify-between items-center py-2 text-xs">
                  <div>
                    <span className="font-bold text-slate-200 block">{ing.food_name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {ing.quantity}{ing.unit} • {ing.calories} kcal • {ing.carbs}g C • {ing.fat}g F • {ing.protein}g P
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRecipeBuilderIngredients(prev => prev.filter((_, idx) => idx !== i))}
                    className="p-1 rounded bg-red-950/20 hover:bg-red-950/60 border border-red-900/30 text-red-400 transition-colors cursor-pointer"
                  >
                    Rimuovi
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Ingredient search bar inside recipe builder */}
          <div className="border-t border-slate-800/80 pt-3">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Cerca e aggiungi ingrediente
            </label>
            <div className="relative flex items-center">
              <Search className="absolute left-3 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={rbSearchQuery}
                onChange={(e) => setRbSearchQuery(e.target.value)}
                placeholder="Es. Olio d'oliva, Farina, Latte..."
                className="w-full bg-slate-950 border border-slate-855 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Builder Search Results overlay listing */}
            {rbSearching && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
              </div>
            )}

            {!rbSearching && rbSearchResults.length > 0 && (
              <div className="mt-2 bg-slate-950 border border-slate-800 rounded-2xl max-h-48 overflow-y-auto divide-y divide-slate-900 shadow-xl z-20 relative">
                {rbSearchResults.map((food) => (
                  <div
                    key={food.id}
                    onClick={() => {
                      setRbSelectedFood(food);
                      setRbIngredientQuantity(food.id.startsWith('off_') || food.id.startsWith('custom_') ? 100 : 1);
                    }}
                    className="p-2.5 hover:bg-slate-900 cursor-pointer flex justify-between items-center text-xs transition-colors"
                  >
                    <div>
                      <span className="font-bold text-slate-200 block">{food.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {food.brand ? `${food.brand} • ` : ''}{food.calories} kcal/100g
                      </span>
                    </div>
                    <Plus className="w-4 h-4 text-cyan-400" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal to configure Quantity for the selected Ingredient inside builder */}
        {rbSelectedFood && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 w-full max-w-sm shadow-2xl">
              <h3 className="text-base font-bold text-white mb-1">Aggiungi ingrediente</h3>
              <p className="text-xs text-slate-450 mb-4">{rbSelectedFood.name}</p>

              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-450 mb-1.5">
                  {rbSelectedFood.id.startsWith('off_') || rbSelectedFood.id.startsWith('custom_') 
                    ? 'Quantità in grammi (g):' 
                    : `Numero di porzioni (${rbSelectedFood.servingSize}):`}
                </label>
                <input
                  type="number"
                  required
                  value={rbIngredientQuantity}
                  onChange={(e) => setRbIngredientQuantity(Math.max(1, parseFloat(e.target.value) || 100))}
                  className="w-full text-center py-2.5 text-lg font-bold font-mono bg-slate-950 border border-slate-800 rounded-2xl text-cyan-400"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRbSelectedFood(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-350 text-xs font-semibold"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={handleAddIngredientToBuilder}
                  className="flex-1 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs shadow-md"
                >
                  Conferma
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Button Footer */}
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={() => setShowRecipeBuilder(false)}
            className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-2xl border border-slate-750 cursor-pointer"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={handleSaveRecipe}
            disabled={!recipeBuilderName.trim() || recipeBuilderIngredients.length === 0}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            Salva Ricetta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto min-h-screen bg-slate-950 font-sans text-slate-100">
      {/* Top Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-extrabold text-white">Aggiungi Alimento</h1>
          <p className="text-xs text-slate-400">Cerca nel database o scansiona codice</p>
        </div>
      </div>

      {/* Target Meal Selector Bar */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl p-1.5 mb-4 shadow-sm">
        <span className="text-xs font-semibold text-slate-400 pl-2">Registra in:</span>
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {(['Colazione', 'Pranzo', 'Cena', 'Spuntini'] as MealType[]).map((meal) => (
            <button
              key={meal}
              onClick={() => setSelectedMeal(meal)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedMeal === meal
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {meal}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="mb-3">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          onScanClick={() => setShowScannerModal(true)}
          placeholder="Cerca tra oltre 1.000.000 di alimenti, marche..."
        />
      </div>

      {/* Category Tabs */}
      <div className="mb-4">
        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Create Custom Food CTA */}
      {searchQuery.trim() && (
        <button
          onClick={() => setShowCustomFoodModal(true)}
          className="w-full py-3 mb-3 rounded-2xl bg-cyan-950/40 border border-cyan-800/40 hover:border-cyan-500/50 text-cyan-400 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99] shadow-sm animate-in fade-in"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Crea alimento personalizzato: "{searchQuery}"
        </button>
      )}

      {/* SEARCH / RESULTS LISTING */}
      {searchQuery.trim() !== '' || activeTab !== 'meals' && activeTab !== 'recipes' ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-1 mb-2">
            <span>{searchQuery ? `Alimenti Corrispondenti (${displayedFoods.length})` : 'I tuoi Alimenti Recenti'}</span>
            <span className="flex items-center gap-1 text-[11px] text-cyan-400">
              <Filter className="w-3 h-3" /> Filtra
            </span>
          </div>

          {isSearching ? (
            <div className="py-12 flex flex-col items-center justify-center bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-2" />
              <p className="text-xs text-slate-400 font-medium">Ricerca in corso su OpenFoodFacts...</p>
            </div>
          ) : displayedFoods.length === 0 ? (
            <div className="py-12 text-center bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <p className="text-sm font-semibold text-slate-300 mb-1">Nessun risultato trovato</p>
              <p className="text-xs text-slate-500">Prova a cercare termini generici come "Uova", "Riso" o "Pollo".</p>
            </div>
          ) : (
            displayedFoods.map((food) => {
              const isJustAdded = addedFoodIds.has(food.id);

              return (
                <div
                  key={food.id}
                  className="bg-slate-900/90 border border-slate-800/90 hover:border-slate-700/90 rounded-2xl p-3 flex items-center justify-between transition-all group shadow-sm"
                >
                  <div
                    onClick={() => handleSelectFood(food)}
                    className="flex-1 min-w-0 pr-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-100 truncate">{food.name}</h3>
                      {food.isVerified && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-semibold">
                          Verificato
                        </span>
                      )}
                      {food.id.startsWith('custom_') && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-400 border border-purple-800/60 font-semibold">
                          Personalizzato
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 mt-0.5 font-mono">
                      {food.brand ? `${food.brand} • ` : ''}
                      {(food.id.startsWith('off_') || food.id.startsWith('custom_')) ? 'Valori per 100g' : food.servingSize}
                    </p>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1 font-mono">
                      <span className="text-slate-200 font-bold">{food.calories} kcal</span>
                      <span>•</span>
                      <span className="text-blue-400">{food.macros.carbs}g C</span>
                      <span className="text-red-400">{food.macros.fat}g F</span>
                      <span className="text-emerald-400">{food.macros.protein}g P</span>
                    </div>
                  </div>

                  {/* Quick Add Button */}
                  <button
                    onClick={() => handleQuickAdd(food)}
                    className={`p-2.5 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                      isJustAdded
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-cyan-950 text-cyan-400 hover:bg-cyan-500 hover:text-slate-950 border border-cyan-800/50'
                    }`}
                    title="Aggiunta rapida 1 porzione"
                  >
                    {isJustAdded ? <Check className="w-4 h-4 stroke-[3]" /> : <Plus className="w-4 h-4 stroke-[2.5]" />}
                  </button>
                </div>
              );
            })
          )}
        </div>
      ) : activeTab === 'meals' ? (
        /* SAVED MEALS TEMPLATES VIEW */
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-1 mb-1">
            <span>Pasti Salvati ({savedMeals.length})</span>
          </div>

          {savedMeals.length === 0 ? (
            <div className="py-12 text-center bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <p className="text-sm font-semibold text-slate-300">Nessun pasto salvato</p>
              <p className="text-xs text-slate-500 mt-1">Nel tuo Diario, fai clic su "Salva pasto" per registrarne uno.</p>
            </div>
          ) : (
            savedMeals.map((meal) => {
              const isExpanded = expandedMealIds.has(meal.id);
              
              // Calculate sums
              const totalKcal = meal.items?.reduce((s, i) => s + i.calories, 0) || 0;
              const totalCarbs = meal.items?.reduce((s, i) => s + i.carbs, 0) || 0;
              const totalFat = meal.items?.reduce((s, i) => s + i.fat, 0) || 0;
              const totalProtein = meal.items?.reduce((s, i) => s + i.protein, 0) || 0;

              return (
                <div key={meal.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="p-3.5 flex items-center justify-between">
                    <div className="flex-1 cursor-pointer min-w-0 pr-2" onClick={() => toggleExpandMeal(meal.id)}>
                      <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                        {meal.name}
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        {totalKcal} kcal • {Math.round(totalCarbs)}g C • {Math.round(totalFat)}g F • {Math.round(totalProtein)}g P
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAddSavedMealToDiary(meal)}
                        className="py-1.5 px-3 bg-cyan-950 text-cyan-400 hover:bg-cyan-500 hover:text-slate-950 border border-cyan-800/40 text-xs font-bold rounded-xl transition-all cursor-pointer"
                      >
                        Aggiungi
                      </button>
                      <button
                        onClick={() => deleteSavedMeal(meal.id)}
                        className="p-2 text-slate-500 hover:text-red-400 rounded-xl hover:bg-slate-800/50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {isExpanded && meal.items && (
                    <div className="px-3.5 pb-3 border-t border-slate-850 pt-2 bg-slate-950/40 divide-y divide-slate-850/30">
                      {meal.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between py-1.5 text-[11px] text-slate-400 font-mono">
                          <span className="font-semibold text-slate-300 truncate max-w-[200px]">{item.food_name}</span>
                          <span>
                            {item.servings} x {item.serving_size_display} ({Math.round(item.calories)} kcal)
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* RECIPES LISTING VIEW */
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 px-1">Le Mie Ricette ({recipes.length})</span>
            <button
              onClick={() => setShowRecipeBuilder(true)}
              className="py-1 px-3 bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
            >
              + Crea Ricetta
            </button>
          </div>

          {recipes.length === 0 ? (
            <div className="py-12 text-center bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <p className="text-sm font-semibold text-slate-300">Nessuna ricetta creata</p>
              <p className="text-xs text-slate-500 mt-1">Crea una ricetta inserendo gli ingredienti per calcolarne i valori nutrizionali.</p>
            </div>
          ) : (
            recipes.map((recipe) => {
              const isExpanded = expandedRecipeIds.has(recipe.id);

              // Calculate sums
              const totalKcal = recipe.ingredients?.reduce((s, i) => s + i.calories, 0) || 0;
              const totalCarbs = recipe.ingredients?.reduce((s, i) => s + i.carbs, 0) || 0;
              const totalFat = recipe.ingredients?.reduce((s, i) => s + i.fat, 0) || 0;
              const totalProtein = recipe.ingredients?.reduce((s, i) => s + i.protein, 0) || 0;

              const portions = recipe.servings || 1;
              const servingKcal = Math.round(totalKcal / portions);

              return (
                <div key={recipe.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="p-3.5 flex items-center justify-between">
                    <div className="flex-1 cursor-pointer min-w-0 pr-2" onClick={() => toggleExpandRecipe(recipe.id)}>
                      <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                        {recipe.name}
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                      </h4>
                      <p className="text-[10px] text-slate-450 mt-0.5 font-mono">
                        {servingKcal} kcal / porzione ({portions} porz. totali)
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedRecipeForDiary(recipe);
                          setRecipeServingsInput(1);
                        }}
                        className="py-1.5 px-3 bg-cyan-950 text-cyan-400 hover:bg-cyan-500 hover:text-slate-950 border border-cyan-800/40 text-xs font-bold rounded-xl transition-all cursor-pointer"
                      >
                        Aggiungi
                      </button>
                      <button
                        onClick={() => deleteRecipe(recipe.id)}
                        className="p-2 text-slate-500 hover:text-red-400 rounded-xl hover:bg-slate-800/50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {isExpanded && recipe.ingredients && (
                    <div className="px-3.5 pb-3 border-t border-slate-850 pt-2 bg-slate-950/40 divide-y divide-slate-850/30">
                      {recipe.ingredients.map((ing, idx) => (
                        <div key={idx} className="flex justify-between py-1.5 text-[11px] text-slate-400 font-mono">
                          <span className="font-semibold text-slate-300 truncate max-w-[200px]">{ing.food_name}</span>
                          <span>
                            {ing.quantity}{ing.unit} ({Math.round(ing.calories)} kcal)
                          </span>
                        </div>
                      ))}
                      <div className="pt-2 text-[11px] text-cyan-400 font-bold font-mono space-y-1">
                        <div className="flex justify-between">
                          <span>Totali Intera Ricetta</span>
                          <span>{Math.round(totalKcal)} kcal ({portions} porz)</span>
                        </div>
                        <div className="flex justify-end gap-3 text-[10px] text-slate-450 font-normal">
                          <span>C: {Math.round(totalCarbs)}g</span>
                          <span>F: {Math.round(totalFat)}g</span>
                          <span>P: {Math.round(totalProtein)}g</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Selected Food Servings adjustment modal popup */}
      {selectedFoodForServing && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 w-full max-w-sm shadow-2xl animate-in fade-in slide-in-from-bottom-6">
            <h3 className="text-lg font-extrabold text-white mb-1">{selectedFoodForServing.name}</h3>
            <p className="text-xs text-slate-400 mb-4">{selectedFoodForServing.brand || 'Alimento Generico'}</p>

            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 mb-4 font-mono text-center">
              <span className="text-2xl font-black text-cyan-400">
                {Math.round(selectedFoodForServing.calories * multiplier)}{' '}
                <span className="text-xs font-normal text-slate-400">kcal</span>
              </span>
              <div className="flex justify-center gap-4 text-xs mt-2 text-slate-300">
                <span className="text-blue-400">
                  {Math.round(selectedFoodForServing.macros.carbs * multiplier * 10) / 10}g C
                </span>
                <span className="text-red-400">
                  {Math.round(selectedFoodForServing.macros.fat * multiplier * 10) / 10}g F
                </span>
                <span className="text-emerald-400">
                  {Math.round(selectedFoodForServing.macros.protein * multiplier * 10) / 10}g P
                </span>
              </div>
            </div>

            {(selectedFoodForServing.id.startsWith('off_') || selectedFoodForServing.id.startsWith('custom_')) ? (
              <div className="mb-5">
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Quantità (g):
                </label>
                <input
                  type="number"
                  step="10"
                  min="1"
                  max="2000"
                  value={servingsInput}
                  onChange={(e) => setServingsInput(Math.max(1, parseFloat(e.target.value) || 100))}
                  className="w-full text-center py-3 text-lg font-bold font-mono bg-slate-950 border border-slate-800 rounded-2xl text-cyan-400 focus:outline-none focus:border-cyan-500"
                />
              </div>
            ) : (
              <div className="mb-5">
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Numero di Porzioni:
                </label>
                <input
                  type="number"
                  step="0.25"
                  min="0.25"
                  max="20"
                  value={servingsInput}
                  onChange={(e) => setServingsInput(Math.max(0.1, parseFloat(e.target.value) || 1))}
                  className="w-full text-center py-3 text-lg font-bold font-mono bg-slate-950 border border-slate-800 rounded-2xl text-cyan-400 focus:outline-none focus:border-cyan-500"
                />
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setSelectedFoodForServing(null)}
                className="flex-1 py-3 rounded-2xl bg-slate-800 text-slate-350 font-semibold text-sm cursor-pointer"
              >
                Annulla
              </button>
              <button
                onClick={handleConfirmServingAdd}
                className="flex-1 py-3 rounded-2xl bg-cyan-500 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 cursor-pointer"
              >
                Aggiungi a {selectedMeal}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Recipe Servings selection modal popup */}
      {selectedRecipeForDiary && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 w-full max-w-sm shadow-2xl">
            <h3 className="text-base font-extrabold text-white mb-1">Aggiungi Ricetta al Diario</h3>
            <p className="text-xs text-slate-400 mb-4">{selectedRecipeForDiary.name}</p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Porzioni da registrare:
              </label>
              <input
                type="number"
                step="0.25"
                min="0.1"
                required
                value={recipeServingsInput}
                onChange={(e) => setRecipeServingsInput(Math.max(0.1, parseFloat(e.target.value) || 1))}
                className="w-full text-center py-2.5 text-lg font-bold font-mono bg-slate-950 border border-slate-800 rounded-2xl text-cyan-400"
              />
              <span className="text-[10px] text-slate-500 text-center block mt-1.5">
                (Porzioni totali della ricetta configurate: {selectedRecipeForDiary.servings})
              </span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedRecipeForDiary(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-350 text-xs font-semibold"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleConfirmRecipeAdd}
                className="flex-1 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs shadow-md"
              >
                Conferma Aggiunta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scanner modal */}
      {showScannerModal && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col justify-between p-4">
          <div className="flex items-center justify-between z-10">
            <div>
              <h3 className="text-lg font-extrabold text-white">Scansione Codice a Barre</h3>
              <p className="text-xs text-slate-400">Inquadra il codice a barre del prodotto</p>
            </div>
            <button
              onClick={() => setShowScannerModal(false)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
            >
              Chiudi
            </button>
          </div>

          <div className="flex-1 my-4 relative rounded-3xl overflow-hidden border border-slate-800 bg-slate-950/60 flex items-center justify-center">
            <div id="scanner-reader" className="w-full h-full max-h-[60vh] object-cover" />

            {!cameraError && !scannerLoading && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                <div className="w-64 h-32 border-2 border-dashed border-cyan-400/80 rounded-2xl relative shadow-[0_0_0_9999px_rgba(2,6,23,0.7)]">
                  <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                </div>
                <p className="text-xs text-slate-300 font-semibold tracking-wide text-center mt-6 bg-slate-900/80 px-4 py-1.5 rounded-full border border-slate-805">
                  Allinea il codice a barre all'interno della cornice
                </p>
              </div>
            )}

            {cameraError && (
              <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm p-6 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-red-950 border border-red-800 text-red-400 flex items-center justify-center mb-3">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white mb-2">Errore della Fotocamera</h4>
                <p className="text-xs text-slate-400 max-w-xs mb-6 leading-relaxed font-sans">
                  {cameraError}
                </p>
                <button
                  onClick={() => setShowScannerModal(false)}
                  className="px-6 py-2.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700 cursor-pointer"
                >
                  Indietro
                </button>
              </div>
            )}

            {scannerLoading && (
              <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mb-3" />
                <p className="text-xs text-slate-300 font-semibold uppercase tracking-wider">
                  Ricerca alimento...
                </p>
              </div>
            )}
          </div>

          <div className="text-center py-2 z-10">
            <span className="text-[10px] text-slate-500 font-medium font-sans">
              NutriumFit utilizza il database globale libero OpenFoodFacts
            </span>
          </div>
        </div>
      )}

      {/* Custom Food Creation Modal */}
      {showCustomFoodModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 w-full max-w-sm shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-lg font-extrabold text-white mb-1">Crea Alimento Personalizzato</h3>
            <p className="text-xs text-slate-400 mb-4">Inserisci i valori nutrizionali per 100g o 100ml.</p>

            {customFoodError && (
              <div className="mb-4 p-3 rounded-2xl bg-red-950/40 border border-red-800/60 text-red-400 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{customFoodError}</span>
              </div>
            )}

            <form onSubmit={handleCreateCustomFood} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Nome alimento *
                </label>
                <input
                  type="text"
                  value={customFoodName}
                  onChange={(e) => setCustomFoodName(e.target.value)}
                  placeholder="es. Pane Integrale fatto in casa"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm font-medium focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Marca (facoltativo)
                </label>
                <input
                  type="text"
                  value={customFoodBrand}
                  onChange={(e) => setCustomFoodBrand(e.target.value)}
                  placeholder="es. Panetteria Rossi"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm font-medium focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Calorie (kcal/100g) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={customFoodCalories}
                    onChange={(e) => setCustomFoodCalories(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm font-medium focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Carboidrati (g/100g)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={customFoodCarbs}
                    onChange={(e) => setCustomFoodCarbs(e.target.value)}
                    placeholder="0.0"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm font-medium focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Grassi (g/100g)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={customFoodFat}
                    onChange={(e) => setCustomFoodFat(e.target.value)}
                    placeholder="0.0"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm font-medium focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Proteine (g/100g)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={customFoodProtein}
                    onChange={(e) => setCustomFoodProtein(e.target.value)}
                    placeholder="0.0"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm font-medium focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomFoodModal(false)}
                  className="flex-1 py-3 rounded-2xl bg-slate-800 text-slate-350 font-semibold text-sm cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={customFoodSaving}
                  className="flex-1 py-3 rounded-2xl bg-cyan-500 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 cursor-pointer flex items-center justify-center"
                >
                  {customFoodSaving ? (
                    <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Salva e Continua'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2.5 px-5 py-3 rounded-2xl border backdrop-blur-xl shadow-xl transition-all duration-300 animate-in fade-in ${
          toast.type === 'success'
            ? 'bg-slate-905/90 border-emerald-500/20 text-emerald-400'
            : 'bg-slate-905/90 border-red-500/20 text-red-400'
        }`}>
          {toast.type === 'success' ? (
            <div className="w-5 h-5 rounded-full bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full bg-red-950/60 border border-red-500/30 flex items-center justify-center shrink-0">
              <AlertCircle className="w-3.5 h-3.5 text-red-400 stroke-[3]" />
            </div>
          )}
          <span className="text-xs font-bold font-sans tracking-wide">{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default AddFoodPage;
