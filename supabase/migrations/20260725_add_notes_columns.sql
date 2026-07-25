-- NutriumFit Database Migration: Add notes and food entry columns
-- Execute this SQL in your Supabase SQL Editor (https://bgaeaongvofvnsopousk.supabase.co)

-- 1. Add notes column to routine_exercises
ALTER TABLE public.routine_exercises 
ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- 2. Add notes column to workout_sets
ALTER TABLE public.workout_sets 
ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- 3. Add notes column to workout_logs
ALTER TABLE public.workout_logs 
ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- 4. Add servings and portion columns to food_entries
ALTER TABLE public.food_entries 
ADD COLUMN IF NOT EXISTS servings NUMERIC DEFAULT 1;

ALTER TABLE public.food_entries 
ADD COLUMN IF NOT EXISTS serving_size_display TEXT DEFAULT '1 porzione';

ALTER TABLE public.food_entries 
ADD COLUMN IF NOT EXISTS grams NUMERIC;

ALTER TABLE public.food_entries 
ADD COLUMN IF NOT EXISTS unit_weight_grams NUMERIC;
