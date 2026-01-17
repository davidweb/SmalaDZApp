
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://emjekybweiauyuimlngf.supabase.co';
const supabaseKey = 'sb_publishable_kwNGZKntYYbCw3AKBrHAhQ_iWF1P7so';

export const supabase = createClient(supabaseUrl, supabaseKey);
