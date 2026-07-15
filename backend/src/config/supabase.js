import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

let supabase = null;
let useMock = true;

if (supabaseUrl && supabaseKey && !supabaseUrl.includes('placeholder')) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    useMock = false;
    console.log('Successfully initialized Supabase connection using ' + (process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service role key' : 'anon key') + '.');
  } catch (error) {
    console.error('Failed to initialize Supabase. Falling back to Mock mode.', error.message);
  }
} else {
  console.log('No valid Supabase credentials found. Running in Mock Mode.');
}

export { supabase, useMock };