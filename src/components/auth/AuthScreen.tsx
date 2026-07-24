import React, { useState } from 'react';
import { Mail, Lock, Sparkles, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';

export const AuthScreen: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Per favore, compila tutti i campi.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setErrorMsg('La password deve contenere almeno 6 caratteri.');
      setLoading(false);
      return;
    }

    try {
      if (isRegister) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setSuccessMsg(
          'Registrazione completata con successo! Controlla la tua email per verificare il tuo account (se richiesto).'
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      // Translate typical errors into Italian
      let translatedMsg = err.message || 'Si è verificato un errore durante l\'autenticazione.';
      if (err.message?.includes('Invalid login credentials')) {
        translatedMsg = 'Credenziali di accesso non valide. Riprova.';
      } else if (err.message?.includes('User already registered')) {
        translatedMsg = 'Questo indirizzo email è già registrato.';
      } else if (err.message?.includes('Email not confirmed')) {
        translatedMsg = 'L\'indirizzo email non è ancora stato confermato. Controlla la tua posta.';
      }
      setErrorMsg(translatedMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-cyan-500 selection:text-white">
      {/* Decorative background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-cyan-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-72 h-72 rounded-full bg-purple-500/10 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md z-10 animate-in fade-in zoom-in-95 duration-300">
        {/* Logo / App Name */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-xl shadow-cyan-500/20 mb-3 border border-cyan-400/20">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">NutriumFit</h1>
          <p className="text-xs text-cyan-400 font-semibold tracking-widest uppercase mt-1">
            Premium Macro Tracker
          </p>
        </div>

        {/* Auth Box */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl">
          <h2 className="text-xl font-bold text-slate-100 mb-2">
            {isRegister ? 'Crea un account' : 'Bentornato su NutriumFit'}
          </h2>
          <p className="text-xs text-slate-400 mb-6">
            {isRegister
              ? 'Inserisci i tuoi dati per iniziare a tracciare la tua nutrizione.'
              : 'Inserisci le tue credenziali per accedere al tuo diario alimentare.'}
          </p>

          {/* Messages */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-2xl bg-red-950/40 border border-red-800/60 text-red-400 text-xs flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-400 text-xs flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                Indirizzo Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@esempio.it"
                  className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 focus:border-cyan-500/80 focus:ring-2 focus:ring-cyan-500/10 rounded-2xl text-slate-100 placeholder-slate-600 text-sm font-medium outline-none transition-all"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-11 py-3 bg-slate-950 border border-slate-800 focus:border-cyan-500/80 focus:ring-2 focus:ring-cyan-500/10 rounded-2xl text-slate-100 placeholder-slate-600 text-sm font-medium outline-none transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 mt-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-blue-700 hover:from-cyan-400 hover:to-blue-600 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : isRegister ? (
                'Registrati'
              ) : (
                'Accedi'
              )}
            </button>
          </form>

          {/* Toggle Tab */}
          <div className="mt-6 text-center text-xs">
            <span className="text-slate-400">
              {isRegister ? 'Hai già un account?' : 'Non hai ancora un account?'}
            </span>{' '}
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="text-cyan-400 hover:text-cyan-300 font-bold hover:underline transition-colors cursor-pointer bg-transparent border-none ml-1 outline-none"
            >
              {isRegister ? 'Accedi qui' : 'Registrati qui'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
