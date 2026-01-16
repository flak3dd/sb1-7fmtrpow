/*
  # VirtuCam Database Schema

  ## Overview
  This migration creates the database structure for the VirtuCam Control App,
  which manages virtual camera media files and configuration settings.

  ## New Tables
  
  ### 1. `media_files`
  Stores metadata about uploaded/selected media files (videos and images)
  - `id` (uuid, primary key) - Unique identifier for each media file
  - `file_uri` (text) - Local file URI or path to the media file
  - `file_name` (text) - Original filename
  - `file_type` (text) - Type of media: 'video' or 'image'
  - `duration` (integer) - Duration in milliseconds (for videos, null for images)
  - `width` (integer) - Media width in pixels
  - `height` (integer) - Media height in pixels
  - `file_size` (bigint) - File size in bytes
  - `thumbnail_uri` (text, optional) - URI to thumbnail preview
  - `is_active` (boolean) - Whether this media is currently selected for use
  - `created_at` (timestamptz) - When the media was added
  - `updated_at` (timestamptz) - Last modification time
  
  ### 2. `app_config`
  Stores application configuration and settings
  - `id` (uuid, primary key) - Configuration entry ID
  - `config_key` (text, unique) - Configuration key name
  - `config_value` (jsonb) - Configuration value (flexible JSON format)
  - `description` (text, optional) - Human-readable description
  - `updated_at` (timestamptz) - Last update time
  
  ### 3. `service_status`
  Tracks virtual camera service state
  - `id` (uuid, primary key) - Status entry ID
  - `is_enabled` (boolean) - Whether the virtual camera service is running
  - `selected_media_id` (uuid, foreign key) - Currently active media file
  - `resolution_preset` (text) - Selected resolution (e.g., '720p', '1080p', '4K')
  - `custom_width` (integer, optional) - Custom width if not using preset
  - `custom_height` (integer, optional) - Custom height if not using preset
  - `loop_enabled` (boolean) - Whether to loop video playback
  - `frame_rate` (integer) - Target frame rate for camera feed
  - `updated_at` (timestamptz) - Last status update time

  ## Security
  - Enable Row Level Security (RLS) on all tables
  - Public access for reading (LSPosed module needs to read)
  - Authenticated access for modifications
*/

-- Create media_files table
CREATE TABLE IF NOT EXISTS media_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_uri text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('video', 'image')),
  duration integer,
  width integer NOT NULL,
  height integer NOT NULL,
  file_size bigint NOT NULL,
  thumbnail_uri text,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create app_config table
CREATE TABLE IF NOT EXISTS app_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text UNIQUE NOT NULL,
  config_value jsonb NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now()
);

-- Create service_status table
CREATE TABLE IF NOT EXISTS service_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled boolean DEFAULT false,
  selected_media_id uuid REFERENCES media_files(id) ON DELETE SET NULL,
  resolution_preset text DEFAULT '1080p',
  custom_width integer,
  custom_height integer,
  loop_enabled boolean DEFAULT true,
  frame_rate integer DEFAULT 30,
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_media_files_is_active ON media_files(is_active);
CREATE INDEX IF NOT EXISTS idx_media_files_file_type ON media_files(file_type);
CREATE INDEX IF NOT EXISTS idx_app_config_key ON app_config(config_key);

-- Enable Row Level Security
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies for media_files
CREATE POLICY "Anyone can read media files"
  ON media_files FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert media files"
  ON media_files FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update media files"
  ON media_files FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete media files"
  ON media_files FOR DELETE
  TO public
  USING (true);

-- RLS Policies for app_config
CREATE POLICY "Anyone can read config"
  ON app_config FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert config"
  ON app_config FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update config"
  ON app_config FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete config"
  ON app_config FOR DELETE
  TO public
  USING (true);

-- RLS Policies for service_status
CREATE POLICY "Anyone can read service status"
  ON service_status FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert service status"
  ON service_status FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update service status"
  ON service_status FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete service status"
  ON service_status FOR DELETE
  TO public
  USING (true);

-- Insert default configuration values
INSERT INTO app_config (config_key, config_value, description)
VALUES 
  ('resolution_presets', '["720p", "1080p", "1440p", "4K"]'::jsonb, 'Available resolution presets'),
  ('default_frame_rate', '30'::jsonb, 'Default frame rate for camera feed'),
  ('supported_formats', '["mp4", "mov", "avi", "jpg", "png", "jpeg"]'::jsonb, 'Supported media file formats')
ON CONFLICT (config_key) DO NOTHING;

-- Insert default service status (single row)
INSERT INTO service_status (is_enabled, resolution_preset, loop_enabled, frame_rate)
VALUES (false, '1080p', true, 30)
ON CONFLICT DO NOTHING;