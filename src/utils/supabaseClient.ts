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

export const withTimeout = <T>(
  promise: Promise<T> | PromiseLike<T>,
  ms: number = 5000,
  fallbackMessage: string = 'Richiesta di rete scaduta dopo 5 secondi'
): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      console.warn(`[withTimeout] ${fallbackMessage} (${ms}ms). Attempting background session refresh...`);
      supabase.auth.refreshSession().catch(() => {});
      const err: any = new Error(fallbackMessage);
      err.code = 'TIMEOUT';
      reject(err);
    }, ms);

    Promise.resolve(promise)
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
};

export const getValidatedUserId = async (timeoutMs: number = 5000): Promise<string> => {
  try {
    const { data: { session }, error } = await withTimeout(
      supabase.auth.getSession(),
      timeoutMs,
      'Session check timed out'
    );
    if (error || !session?.user?.id) {
      const msg = "Sessione non trovata. Effettua nuovamente il Login per sincronizzare i dati.";
      console.warn('[getValidatedUserId]', msg, error);
      const err: any = new Error(msg);
      err.code = 'UNAUTHENTICATED';
      throw err;
    }
    return session.user.id;
  } catch (err: any) {
    if (err?.code === 'TIMEOUT') {
      console.warn('[getValidatedUserId] getSession timed out, attempting background refresh...');
      supabase.auth.refreshSession().catch(() => {});
    }
    throw err;
  }
};
