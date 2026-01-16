# VirtuCam LSPosed Module

This is the LSPosed module component of VirtuCam that hooks Camera2 API calls to inject custom video/image feeds.

## Prerequisites

- Android Studio Arctic Fox or newer
- Android SDK with API 21-34
- LSPosed framework installed on test device
- Root access on test device

## Build Instructions

### 1. Open in Android Studio

```bash
# Open Android Studio
# File -> Open -> Select this lsposed-module directory
```

### 2. Sync Gradle

Wait for Gradle sync to complete. If you encounter errors:
- Check internet connection
- Update Android Studio
- Sync project with Gradle files

### 3. Build APK

```bash
# Debug build
./gradlew assembleDebug

# Release build
./gradlew assembleRelease

# Output location:
# app/build/outputs/apk/debug/app-debug.apk
# app/build/outputs/apk/release/app-release.apk
```

### 4. Install on Device

```bash
# Install via ADB
adb install app/build/outputs/apk/debug/app-debug.apk

# Or install via Android Studio
# Run -> Install
```

## Enable in LSPosed

1. Open **LSPosed Manager** app
2. Go to **Modules** tab
3. Enable **VirtuCam Module**
4. Long press the module to configure scope
5. Select target applications:
   - Chrome (com.android.chrome)
   - Google Meet (com.google.android.apps.meetings)
   - Zoom (us.zoom.videomeetings)
   - Microsoft Teams (com.microsoft.teams)
   - Add more as needed
6. **Reboot device** for changes to take effect

## Configuration

The module reads configuration from the VirtuCam Control App via Supabase:

- Service enabled/disabled state
- Selected media file (video/image)
- Resolution preset or custom dimensions
- Frame rate (15-60 FPS)
- Loop playback setting

No manual configuration needed in the module itself.

## Testing

### 1. View Logs

```bash
# View all module logs
adb logcat | grep VirtuCam

# View Camera2 logs
adb logcat | grep -E "VirtuCam|Camera2"

# Save logs to file
adb logcat | grep VirtuCam > virtucam.log
```

### 2. Test with Chrome

1. Open Chrome browser
2. Navigate to: `chrome://webrtc-internals`
3. Open a new tab and go to: `https://test.webrtc.org/`
4. Click "Start camera test"
5. You should see your custom video/image feed

### 3. Test with Video Apps

1. Open Zoom/Meet/Teams
2. Start a test meeting or preview
3. Your virtual camera feed should appear

## Project Structure

```
lsposed-module/
├── app/
│   ├── src/main/
│   │   ├── java/com/virtucam/lsposed/
│   │   │   ├── VirtuCamModule.kt          # Main entry point
│   │   │   ├── SupabaseClient.kt          # API client
│   │   │   ├── camera/
│   │   │   │   ├── VirtualCameraImageReader.kt
│   │   │   │   ├── FrameInjector.kt       # Image injection
│   │   │   │   └── VideoLoopInjector.kt   # Video injection
│   │   │   ├── hooks/
│   │   │   │   ├── CameraManagerHook.kt   # Hook openCamera
│   │   │   │   ├── CameraDeviceHook.kt    # Hook createCaptureSession
│   │   │   │   └── CaptureRequestHook.kt  # Hook addTarget
│   │   │   ├── utils/
│   │   │   │   └── YUVConverter.kt        # RGB to YUV conversion
│   │   │   └── video/
│   │   │       └── VideoFrameExtractor.kt # Video decoding
│   │   ├── assets/
│   │   │   └── xposed_init                # Module entry point
│   │   ├── res/
│   │   │   └── values/
│   │   │       ├── arrays.xml             # Target app scope
│   │   │       └── strings.xml
│   │   └── AndroidManifest.xml
│   ├── build.gradle
│   └── proguard-rules.pro
├── build.gradle
├── settings.gradle
└── README.md (this file)
```

## Hook Points

### 1. CameraManager.openCamera()
- Intercepts camera device opening
- Logs which camera is being accessed

### 2. CameraDevice.createCaptureSession()
- **Main hook point**
- Replaces camera surfaces with virtual ImageReader
- Initializes frame injection

### 3. CaptureRequest.Builder.addTarget()
- Redirects frame targets to virtual surface
- Ensures all frames go through virtual camera

## Troubleshooting

### Module not appearing in LSPosed
- Check `xposed_init` file exists in assets
- Verify meta-data in AndroidManifest.xml
- Reinstall the module APK
- Clear LSPosed Manager cache

### Hooks not activating
- Ensure module is enabled in LSPosed Manager
- Verify scope includes target app
- **Reboot device** after enabling module
- Check logs for errors: `adb logcat | grep VirtuCam`

### No video feed appearing
- Verify VirtuCam Control App has service enabled
- Check media file exists and is accessible
- Ensure file path is correct
- Check storage permissions granted

### App crashes
- Check logs for stack traces
- Verify Camera2 API compatibility
- Test with simple app first (Chrome)
- Check Android version compatibility

### Performance issues
- Reduce resolution (use 720p instead of 4K)
- Lower frame rate (30 FPS instead of 60)
- Use H.264 encoded videos
- Check CPU usage with `adb shell top`

## Development

### Adding New Hooks

1. Create hook class in `hooks/` package
2. Implement hook using XposedHelpers
3. Call from `VirtuCamModule.installHooks()`

### Debugging

```kotlin
// Add debug logs
VirtuCamModule.log("Your debug message")

// Log with values
VirtuCamModule.log("Width: $width, Height: $height")
```

### Testing Changes

```bash
# Quick rebuild and install
./gradlew assembleDebug && adb install -r app/build/outputs/apk/debug/app-debug.apk

# Restart target app
adb shell am force-stop com.android.chrome
adb shell am start -n com.android.chrome/com.google.android.apps.chrome.Main
```

## Performance Tips

1. **Cache configuration**: Don't fetch from Supabase on every frame
2. **Use appropriate resolution**: 1080p is sufficient for most use cases
3. **Optimize YUV conversion**: Consider native implementation for production
4. **Reuse buffers**: Avoid creating new objects in hot paths
5. **Frame skipping**: Drop frames if injection is too slow

## Security Considerations

⚠️ **Important**: This module is for development and testing purposes only.

- Only use on devices you own
- Don't use to bypass authentication systems
- Don't distribute without proper authorization
- Respect app terms of service
- Handle user privacy responsibly

## API Compatibility

### Tested on:
- ✅ Android 11 (API 30)
- ✅ Android 12 (API 31)
- ✅ Android 13 (API 33)
- ✅ Android 14 (API 34)

### Should work on:
- Android 5.0+ (API 21-34)
- Apps using Camera2 API

### Won't work on:
- Apps using Camera1 API (deprecated)
- Apps with custom camera implementations
- Some hardware-specific camera apps

## License

MIT License - See main project LICENSE file

## Support

For issues and questions:
1. Check module logs: `adb logcat | grep VirtuCam`
2. Review documentation in `../docs/` folder
3. Verify VirtuCam Control App configuration
4. Test with Chrome webcam first

## References

- [LSPosed Documentation](https://github.com/LSPosed/LSPosed)
- [Xposed API](https://api.xposed.info/)
- [Camera2 API Guide](https://developer.android.com/training/camera2)
- [MediaCodec Guide](https://developer.android.com/reference/android/media/MediaCodec)
