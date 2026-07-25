import { supabase, getValidatedUserId, withTimeout } from '../utils/supabaseClient';

if (typeof window !== 'undefined') {
  (window as any).supabase = supabase;
}

export { supabase, getValidatedUserId, withTimeout };
export default supabase;
