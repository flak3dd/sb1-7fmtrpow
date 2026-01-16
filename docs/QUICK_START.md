# VirtuCam Quick Start Guide

Get up and running with VirtuCam in 5 minutes.

## Overview

VirtuCam lets you inject custom video/image feeds into apps using Camera2 API via LSPosed hooking.

```
Control App → Supabase → LSPosed Module → Camera2 API → Target Apps
```

## Part 1: Control App (5 minutes)

### 1. Install Dependencies
```bash
cd virtucam-control
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

### 3. Add Media File
1. Open app on device/simulator
2. Go to "Media Library" tab
3. Tap "Add Video" or "Add Image"
4. Select a file
5. Tap the file to make it active (green border)

### 4. Configure Settings
1. Go to "Configuration" tab
2. Select resolution (default: 1080p)
3. Choose frame rate (default: 30 FPS)
4. Enable loop for videos

### 5. Enable Service
1. Go to "Service Status" tab
2. Toggle switch ON
3. Verify active media is shown

✅ Control app is ready! Settings are now in Supabase.

## Part 2: LSPosed Module (20 minutes)

### 1. Create Android Studio Project
```
Package: com.virtucam.lsposed
Min SDK: API 21
Language: Kotlin
```

### 2. Add Dependencies
Edit `app/build.gradle`:
```gradle
dependencies {
    compileOnly 'de.robv.android.xposed:api:82'
    implementation 'com.squareup.okhttp3:okhttp:4.11.0'
    implementation 'com.google.code.gson:gson:2.10.1'
}
```

### 3. Configure Manifest
```xml
<meta-data android:name="xposedmodule" android:value="true" />
<meta-data android:name="xposeddescription" android:value="Virtual camera module" />
<meta-data android:name="xposedminversion" android:value="93" />
```

### 4. Create Entry Point
File: `app/src/main/assets/xposed_init`
```
com.virtucam.lsposed.VirtuCamModule
```

### 5. Copy Integration Code
- Copy `SupabaseClient.kt` from docs/LSPOSED_INTEGRATION.md
- Copy `VirtuCamModule.kt` from docs/CAMERA2_HOOKS.md
- Copy `YUVConverter.kt` from docs/YUV_FRAME_CONVERSION.md

### 6. Build and Install
```bash
./gradlew assembleDebug
adb install app/build/outputs/apk/debug/app-debug.apk
```

### 7. Enable in LSPosed
1. Open LSPosed Manager
2. Enable "VirtuCam Module"
3. Select scope: Chrome, Zoom, Teams
4. Reboot device

### 8. Test
```bash
# View logs
adb logcat | grep VirtuCam

# Open Chrome and test webcam
```

## File Locations

### Control App Files
```
app/(tabs)/index.tsx        - Media library screen
app/(tabs)/config.tsx       - Configuration screen
app/(tabs)/status.tsx       - Service status screen
lib/supabase.ts             - Database client
```

### LSPosed Module Files
```
VirtuCamModule.kt           - Main hook entry point
SupabaseClient.kt           - API client for config
YUVConverter.kt             - Frame conversion
VideoFrameExtractor.kt      - Video decoder
```

## Database Tables

### service_status
Current configuration (one row)
```sql
is_enabled          - Service on/off
selected_media_id   - Active media UUID
resolution_preset   - '720p', '1080p', '1440p', '4K', 'custom'
frame_rate          - 15, 24, 30, or 60
loop_enabled        - Loop video playback
```

### media_files
All available media
```sql
id                  - UUID primary key
file_uri            - Local file path
file_type           - 'video' or 'image'
is_active           - Currently selected
width, height       - Dimensions
```

## API Endpoints

### Get Service Status
```
GET /rest/v1/service_status?limit=1
```

### Get Active Media
```
GET /rest/v1/media_files?is_active=eq.true&limit=1
```

## Hook Points

### 1. CameraManager.openCamera()
Intercept camera device opening

### 2. CameraDevice.createCaptureSession()
Replace surfaces with virtual camera

### 3. CaptureRequest.Builder.addTarget()
Redirect frame targets

### 4. ImageReader
Inject custom frames

## Common Commands

```bash
# Control App
npm run dev                 # Start dev server
npm run build:web          # Build for web
npm run typecheck          # Type check

# LSPosed Module
./gradlew assembleDebug    # Build APK
adb logcat | grep VirtuCam # View logs
adb install <apk>          # Install module

# Debugging
adb shell pm list packages # List installed apps
adb shell dumpsys media.camera # Camera info
```

## Troubleshooting

### Control App
**Issue:** Can't add media files
**Fix:** Check app permissions for storage access

**Issue:** Service toggle doesn't work
**Fix:** Ensure media file is selected (green border)

### LSPosed Module
**Issue:** Module not showing in LSPosed
**Fix:** Check xposed_init file and manifest meta-data

**Issue:** Hooks not working
**Fix:** Verify scope includes target apps, reboot device

**Issue:** Frames not appearing
**Fix:** Check file path exists, verify YUV conversion

## Testing Checklist

- [ ] Control app can add media files
- [ ] Media file shows thumbnail
- [ ] Can select active media (green border)
- [ ] Configuration saves successfully
- [ ] Service toggle works
- [ ] LSPosed module installed
- [ ] Module enabled in LSPosed Manager
- [ ] Scope includes test app (Chrome)
- [ ] Device rebooted after enabling
- [ ] Logs show "VirtuCam: Loaded into..."
- [ ] Test app opens camera successfully
- [ ] Virtual feed appears instead of real camera

## Target Applications

### Tested
- ✅ Chrome (chrome://webrtc-internals)
- ✅ Google Meet
- ✅ Zoom

### Compatible
- Microsoft Teams
- Skype
- Discord
- Most Camera2 API apps

### Not Compatible
- Apps using Camera1 API (legacy)
- Apps with custom camera implementations
- Hardware-specific camera apps

## Performance Tips

1. **Resolution:** Start with 720p, increase if needed
2. **Frame Rate:** 30 FPS is sufficient for most use cases
3. **File Format:** Use H.264 MP4 for best performance
4. **File Size:** Keep videos under 100MB
5. **Loop:** Disable if using long videos

## Security Notes

⚠️ This tool is for:
- Development and testing
- API research and education
- Personal device experimentation

❌ Do NOT use for:
- Bypassing authentication
- Impersonating others
- Deceptive purposes
- Violating ToS

## Next Steps

1. ✅ Get control app running
2. ✅ Add a test media file
3. ✅ Enable service
4. ⬜ Build LSPosed module
5. ⬜ Test with Chrome webcam
6. ⬜ Add to production apps (Zoom, Teams)
7. ⬜ Optimize performance

## Documentation

- **README.md** - Project overview
- **LSPOSED_INTEGRATION.md** - Complete integration guide
- **CAMERA2_HOOKS.md** - Hook implementation details
- **YUV_FRAME_CONVERSION.md** - Frame conversion guide
- **LSPOSED_MODULE_SETUP.md** - Module setup from scratch
- **API_REFERENCE.md** - Supabase API documentation

## Support

- Check logs: `adb logcat | grep VirtuCam`
- Review documentation in `docs/` folder
- Test with simple app (Chrome) first
- Verify Supabase connection
- Ensure file paths are valid

## Quick Reference

### Supabase URL
```
https://pkruoiiwqygqkagwtobe.supabase.co
```

### Resolution Presets
- 720p: 1280x720
- 1080p: 1920x1080
- 1440p: 2560x1440
- 4K: 3840x2160

### Frame Rates
- 15 FPS: Low bandwidth
- 24 FPS: Cinematic
- 30 FPS: Standard (recommended)
- 60 FPS: High quality

### Target Packages
```
com.android.chrome
com.google.android.apps.meetings
us.zoom.videomeetings
com.microsoft.teams
```

---

**Ready to go?** Follow Part 1 to set up the control app, then Part 2 for the LSPosed module!
