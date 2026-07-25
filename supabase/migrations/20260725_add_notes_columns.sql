-- NutriumFit Database Migration: Add notes columns to routine_exercises, workout_sets, and workout_logs
-- Execute this SQL in your Supabase SQL Editor (https://bgaeaongvofvnsopousk.supabase.co)

-- 1. Add notes column to routine_exercises (for routine-level exercise instruction notes)
ALTER TABLE public.routine_exercises 
ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- 2. Add notes column to workout_sets (for per-set or per-exercise session notes)
ALTER TABLE public.workout_sets 
ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- 3. Add notes column to workout_logs (for general end-of-workout session summary notes)
ALTER TABLE public.workout_logs 
ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
