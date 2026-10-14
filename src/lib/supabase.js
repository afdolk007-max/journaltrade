import { createClient } from '@supabase/supabase-js';

function sanitizeSupabaseUrl(url) {
  if (!url || typeof url !== 'string') return '';
  let cleaned = url.trim().replace(/^["']|["']$/g, ''); // strip quotes
  cleaned = cleaned.replace(/\/+$/, ''); // strip trailing slash
  cleaned = cleaned.replace(/\/rest\/v1\/?$/i, ''); // strip /rest/v1 if accidentally included
  cleaned = cleaned.replace(/\/rest\/?$/i, '');
  return cleaned;
}

function sanitizeSupabaseKey(key) {
  if (!key || typeof key !== 'string') return '';
  return key.trim().replace(/^["']|["']$/g, '');
}

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseUrl = sanitizeSupabaseUrl(rawUrl);
const supabaseAnonKey = sanitizeSupabaseKey(rawKey);

// Check if Supabase is configured
const isConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-project.supabase.co' && 
  supabaseAnonKey !== 'your-anon-key-here' &&
  !supabaseUrl.includes('your-project-id')
);

export const supabase = isConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    })
  : null;

export const isSupabaseConfigured = () => isConfigured;
