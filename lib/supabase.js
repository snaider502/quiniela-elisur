import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dlfrrnpqwdengmvtbeif.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsZnJybnBxd2RlbmdtdnRiZWlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MjExOTgsImV4cCI6MjA5NTk5NzE5OH0.fEDOTSiLNGH_ff2K2gIkkwK5Z1UFodw8Op1aqx2oMbo';

export const supabase = createClient(supabaseUrl, supabaseKey);