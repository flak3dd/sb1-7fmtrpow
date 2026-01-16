# VirtuCam Control App

A React Native control interface for managing virtual camera feeds using LSPosed module integration. This app allows you to select media files (videos/images) and configure virtual camera settings that can be read by an LSPosed module to inject custom feeds into Camera2 API calls.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    VirtuCam System                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────┐        ┌──────────────┐               │
│  │  Control App   │───────▶│  Supabase    │               │
│  │  (This Repo)   │        │   Database   │               │
│  └────────────────┘        └──────┬───────┘               │
│                                    │                        │
│                                    │ Read Config            │
│                                    ▼                        │
│                            ┌──────────────┐                │
│                            │   LSPosed    │                │
│                            │    Module    │                │
│                            └──────┬───────┘                │
│                                   │                         │
│                                   │ Hook Camera2 API        │
│                                   ▼                         │
│                            ┌──────────────┐                │
│                            │ Target Apps  │                │
│                            │ (Chrome, etc)│                │
│                            └──────────────┘                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Features

### 📱 Control App (This Repository)

- **Media Library Management**
  - Pick videos and images from device
  - View thumbnails and metadata
  - Set active media for virtual camera
  - Delete unwanted media

- **Configuration Panel**
  - Resolution presets (720p, 1080p, 1440p, 4K)
  - Custom resolution support
  - Frame rate selection (15, 24, 30, 60 FPS)
  - Video loop toggle

- **Service Status Monitor**
  - Enable/disable virtual camera
  - View active media and configuration
  - Real-time status updates
  - Integration instructions

### 🔧 LSPosed Module (Separate Implementation)

The control app stores configuration that your LSPosed module reads:
- Media file URIs and metadata
- Resolution and frame rate settings
- Service enabled state
- Loop playback preferences

## Tech Stack

- **Framework:** React Native (Expo)
- **Navigation:** Expo Router (File-based routing)
- **Database:** Supabase (PostgreSQL)
- **Media Handling:** expo-av, expo-image-picker, expo-document-picker
- **Icons:** lucide-react-native
- **Platform:** Android (primary), iOS (compatible), Web (preview)

## Database Schema

### Tables

1. **media_files** - Stores uploaded media metadata
2. **service_status** - Current service configuration
3. **app_config** - Application settings

See [supabase/migrations/](./supabase/migrations/) for full schema.

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Expo CLI
- Android device/emulator (for full functionality)
- Supabase account (already configured)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for web
npm run build:web
```

### Environment Variables

The `.env` file contains:
```
EXPO_PUBLIC_SUPABASE_URL=https://pkruoiiwqygqkagwtobe.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Project Structure

```
virtucam-control/
├── app/                          # Expo Router pages
│   ├── (tabs)/                   # Tab navigation group
│   │   ├── _layout.tsx           # Tab navigator config
│   │   ├── index.tsx             # Media Library screen
│   │   ├── config.tsx            # Configuration screen
│   │   └── status.tsx            # Service Status screen
│   ├── _layout.tsx               # Root layout
│   └── +not-found.tsx            # 404 page
│
├── lib/
│   └── supabase.ts               # Supabase client & types
│
├── hooks/
│   └── useFrameworkReady.ts      # Framework initialization hook
│
├── docs/
│   ├── LSPOSED_INTEGRATION.md    # LSPosed module guide
│   └── API_REFERENCE.md          # Supabase API docs
│
├── supabase/
│   └── migrations/               # Database migrations
│       └── 20260116120404_create_virtucam_schema.sql
│
├── assets/
│   └── images/                   # App icons and images
│
├── app.json                      # Expo configuration
├── package.json                  # Dependencies
└── tsconfig.json                 # TypeScript config
```

## Usage

### 1. Add Media Files

1. Open the **Media Library** tab
2. Tap "Add Image" or "Add Video"
3. Select a file from your device
4. The file will appear in your library with a thumbnail

### 2. Select Active Media

1. Tap on any media file in the library
2. It will be marked with a green border and checkmark
3. This becomes the active feed for the virtual camera

### 3. Configure Settings

1. Go to the **Configuration** tab
2. Select a resolution preset or use custom dimensions
3. Choose your target frame rate
4. Enable/disable video looping

### 4. Enable Service

1. Navigate to the **Service Status** tab
2. Toggle the switch to enable the virtual camera
3. Your LSPosed module can now read these settings

## LSPosed Integration

The control app stores all configuration in Supabase. Your LSPosed module should:

1. Read service status and configuration from Supabase
2. Check if service is enabled
3. Get active media file URI and metadata
4. Hook Camera2 API calls in target apps
5. Inject frames from the selected media into camera preview

### Quick Integration Example

```kotlin
// In your LSPosed module
val supabase = SupabaseClient()
val status = supabase.getServiceStatus()

if (status?.isEnabled == true) {
    val media = supabase.getActiveMedia()
    // Inject media frames into Camera2 preview
}
```

See [docs/LSPOSED_INTEGRATION.md](./docs/LSPOSED_INTEGRATION.md) for complete implementation guide.

## API Reference

Full API documentation: [docs/API_REFERENCE.md](./docs/API_REFERENCE.md)

### Key Endpoints

- `GET /service_status` - Get current configuration
- `GET /media_files?is_active=eq.true` - Get active media
- `PATCH /service_status` - Update configuration

## Development

### Type Checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
```

## Building for Production

### Android APK

```bash
# Install EAS CLI
npm install -g eas-cli

# Build APK
eas build --platform android --profile preview
```

### iOS

```bash
eas build --platform ios
```

## Permissions

The app requires:
- **READ_EXTERNAL_STORAGE** - Access media files
- **WRITE_EXTERNAL_STORAGE** - Save thumbnails
- **READ_MEDIA_IMAGES** - Image picker
- **READ_MEDIA_VIDEO** - Video picker

## Security & Ethics

⚠️ **Important:** This tool is designed for:
- Development and testing purposes
- API exploration and research
- Educational use cases
- Personal device experimentation

**Do NOT use for:**
- Bypassing authentication systems
- Impersonating others in video calls
- Deceiving or misleading others
- Violating terms of service
- Any illegal activities

## Troubleshooting

### Media files not loading
- Check file paths are valid
- Ensure proper permissions granted
- Verify file format is supported (MP4, MOV, JPG, PNG)

### Service status not updating
- Check internet connection
- Verify Supabase credentials
- Look for errors in console logs

### LSPosed module not working
- Ensure module is enabled in LSPosed Manager
- Check module is activated for target apps
- Reboot device after enabling module
- View logs: `adb logcat | grep VirtuCam`

## Contributing

This is a reference implementation. Feel free to:
- Fork and modify for your needs
- Add support for new media formats
- Improve UI/UX
- Add new features

## License

MIT License - See LICENSE file for details

## Disclaimer

This software is provided for educational and research purposes only. Users are responsible for ensuring their use complies with all applicable laws and regulations. The developers assume no liability for misuse of this software.

## Support

- **Documentation:** See [docs/](./docs/) folder
- **Issues:** Check existing issues or create a new one
- **API Reference:** [docs/API_REFERENCE.md](./docs/API_REFERENCE.md)
- **Integration Guide:** [docs/LSPOSED_INTEGRATION.md](./docs/LSPOSED_INTEGRATION.md)

## Acknowledgments

- Built with Expo and React Native
- Database powered by Supabase
- Icons by Lucide
- Inspired by virtual camera implementations in the Android development community
