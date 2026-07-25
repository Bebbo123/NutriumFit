import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase URL or Anon Key is missing. Please define VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

if (typeof window !== 'undefined') {
  (window as any).supabase = supabase;
}

export const getValidatedUserId = async (): Promise<string> => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.user?.id) {
    const msg = "Sessione non trovata. Effettua nuovamente il Login per sincronizzare i dati.";
    console.warn('[getValidatedUserId]', msg, error);
    const err: any = new Error(msg);
    err.code = 'UNAUTHENTICATED';
    throw err;
  }
  return session.user.id;
};
