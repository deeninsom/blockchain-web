// lib/supabase.ts

import { createClient } from '@supabase/supabase-js'

// Pastikan variabel lingkungan ini disetel di file .env.local Anda
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

// Klien ini dapat digunakan di Client Component dan Server Component (namun disarankan 
// menggunakan klien terpisah untuk Server Component/Route Handler untuk keamanan)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 💡 CATATAN: Untuk aplikasi Next.js modern, Supabase menyarankan
// menggunakan pattern "Client Component Supabase Client" dan "Server Component Supabase Client".
// Untuk kesederhanaan, kita akan menggunakan klien publik (NEXT_PUBLIC) di Client Component ini.