import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import 'react-native-url-polyfill/auto';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

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
