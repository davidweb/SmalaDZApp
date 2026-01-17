
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';

/**
 * In the execution environment, these variables are typically injected via process.env.
 * We provide fallback empty strings to satisfy the compiler, but createClient 
 * requires non-empty strings. We use a guard to prevent initialization error.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// A simple proxy or dummy to prevent immediate crash if keys are missing
const initSupabase = () => {
  if (!supabaseUrl || !supabaseKey) {
    console.warn("Supabase credentials missing. Check your environment variables.");
    // Return a dummy object with the expected interface to prevent 'undefined' crashes
    // though functionality will be limited until real keys are provided.
    return {
      from: () => ({
        select: () => ({ 
          eq: () => ({ 
            single: () => Promise.resolve({ data: null, error: null }),
            select: () => ({ single: () => Promise.resolve({ data: null, error: null }) })
          }),
          select: () => ({ single: () => Promise.resolve({ data: null, error: null }) })
        }),
        insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
        update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
        delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
      }),
      channel: () => ({
        on: function() { return this; },
        subscribe: () => ({}),
      }),
      removeChannel: () => ({}),
    } as any;
  }
  return createClient(supabaseUrl, supabaseKey);
};

export const supabase = initSupabase();
