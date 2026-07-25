-- NutriumFit Database Migration: User Favorite Foods Table
-- Execute this SQL in your Supabase SQL Editor (https://bgaeaongvofvnsopousk.supabase.co)

CREATE TABLE IF NOT EXISTS public.user_favorite_foods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    food_id TEXT NOT NULL,
    food_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, food_id)
);

-- Enable RLS
ALTER TABLE public.user_favorite_foods ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "Users can manage their favorite foods" ON public.user_favorite_foods;
CREATE POLICY "Users can manage their favorite foods" 
ON public.user_favorite_foods 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
