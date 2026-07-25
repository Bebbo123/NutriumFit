-- NutriumFit Database Migration: User Custom Portion Overrides Table
-- Execute this SQL in your Supabase SQL Editor (https://bgaeaongvofvnsopousk.supabase.co)

CREATE TABLE IF NOT EXISTS public.user_custom_portions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    food_id TEXT NOT NULL,
    portion_weight_g NUMERIC NOT NULL DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, food_id)
);

-- Enable RLS
ALTER TABLE public.user_custom_portions ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Users can manage their own custom portions"
    ON public.user_custom_portions
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
