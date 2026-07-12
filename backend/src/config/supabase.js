import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;
let useMock = true;

if (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder')) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    useMock = false;
    console.log('Successfully initialized Supabase connection.');
  } catch (error) {
    console.error('Failed to initialize Supabase. Falling back to Mock mode.', error.message);
  }
} else {
  console.log('No valid Supabase credentials found. Running in Mock Mode.');
}

export { supabase, useMock };