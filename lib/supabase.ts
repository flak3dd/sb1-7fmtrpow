import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://0ec90b57d6e95fcbda19832f.supabase.co';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJib2x0IiwicmVmIjoiMGVjOTBiNTdkNmU5NWZjYmRhMTk4MzJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4ODE1NzQsImV4cCI6MTc1ODg4MTU3NH0.9I8-U0x86Ak8t2DGaIk0HfvTSLsAyzdnz-Nw00mMkKw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface MediaFile {
  id: string;
  file_uri: string;
  file_name: string;
  file_type: 'video' | 'image';
  duration: number | null;
  width: number;
  height: number;
  file_size: number;
  thumbnail_uri: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AppConfig {
  id: string;
  config_key: string;
  config_value: any;
  description: string | null;
  updated_at: string;
}

export interface ServiceStatus {
  id: string;
  is_enabled: boolean;
  selected_media_id: string | null;
  resolution_preset: string;
  custom_width: number | null;
  custom_height: number | null;
  loop_enabled: boolean;
  frame_rate: number;
  updated_at: string;
}
