import { supabase, getValidatedUserId } from '../utils/supabaseClient';

if (typeof window !== 'undefined') {
  (window as any).supabase = supabase;
}

export { supabase, getValidatedUserId };
export default supabase;
