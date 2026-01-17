
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';

// On récupère les variables dynamiquement
const getSupabaseConfig = () => {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || ''
  };
};

export const initSupabase = () => {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) {
    console.warn("Supabase: URL ou Clé manquante dans l'environnement.");
    return null;
  }
  return createClient(url, key);
};

// Instance par défaut
export const supabase = initSupabase();
