
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';

// Utilisation des noms exacts fournis par votre interface Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || '';

const initSupabase = () => {
  if (!supabaseUrl || !supabaseKey) {
    console.error("Supabase credentials missing! URL:", supabaseUrl, "Key length:", supabaseKey.length);
    return null;
  }
  return createClient(supabaseUrl, supabaseKey);
};

export const supabase = initSupabase();
