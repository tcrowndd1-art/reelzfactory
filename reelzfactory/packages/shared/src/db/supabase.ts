import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('SUPABASE_URL is required in .env');
}

// 클라이언트용 (일반 유저 권한)
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey || ''
);

// 서버용 (관리자 권한 — API 라우트에서만 사용)
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey || ''
);

export default supabase;
