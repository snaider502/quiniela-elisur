import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://zrztawadxahoptlqltvs.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyenRhd2FkeGFob3B0bHFsdHZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NTY3MzksImV4cCI6MjA5MDEzMjczOX0.7D6O2YzdxYogB05ECeYFIE_NgGn9LZg3yqsUx1oEkt8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});