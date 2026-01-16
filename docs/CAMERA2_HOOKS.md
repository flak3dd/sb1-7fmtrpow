# Camera2 API Hooking Reference

Complete guide to hooking Camera2 API methods in your LSPosed module.

## Camera2 API Flow

```
┌──────────────────┐
│ CameraManager    │
│ .openCamera()    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ CameraDevice     │ ◄── Hook point 1: Device ready
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ createCapture    │ ◄── Hook point 2: Session creation
│ Session()        │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ CaptureRequest   │ ◄── Hook point 3: Frame requests
│ Builder          │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Surface outputs  │ ◄── Hook point 4: Frame delivery
└──────────────────┘
```

## Hook Points

### 1. Camera Manager - Device Opening

```kotlin
package com.virtucam.lsposed.hooks

import android.hardware.camera2.CameraManager
import de.robv.android.xposed.XC_MethodHook
import de.robv.android.xposed.XposedHelpers

class CameraManagerHook {

    fun hook(classLoader: ClassLoader) {
        val cameraManagerClass = XposedHelpers.findClass(
            "android.hardware.camera2.CameraManager",
            classLoader
        )

        // Hook openCamera
        XposedHelpers.findAndHookMethod(
            cameraManagerClass,
            "openCamera",
            String::class.java,
            android.hardware.camera2.CameraDevice.StateCallback::class.java,
            android.os.Handler::class.java,
            object : XC_MethodHook() {
                override fun beforeHookedMethod(param: MethodHookParam) {
                    val cameraId = param.args[0] as String
                    XposedBridge.log("VirtuCam: Opening camera: $cameraId")

                    // Check if we should intercept this camera
                    if (shouldInterceptCamera(cameraId)) {
                        XposedBridge.log("VirtuCam: Will intercept camera $cameraId")
                    }
                }

                override fun afterHookedMethod(param: MethodHookParam) {
                    // Camera device is now open
                }
            }
        )
    }

    private fun shouldInterceptCamera(cameraId: String): Boolean {
        // Usually front camera is "1", back is "0"
        // Intercept front camera for video calls
        return cameraId == "1"
    }
}
```

### 2. Camera Device - Session Creation

```kotlin
class CameraDeviceHook {

    fun hook(classLoader: ClassLoader) {
        val cameraDeviceClass = XposedHelpers.findClass(
            "android.hardware.camera2.CameraDevice",
            classLoader
        )

        // Hook createCaptureSession (API 21-27)
        XposedHelpers.findAndHookMethod(
            cameraDeviceClass,
            "createCaptureSession",
            List::class.java,
            android.hardware.camera2.CameraCaptureSession.StateCallback::class.java,
            android.os.Handler::class.java,
            object : XC_MethodHook() {
                override fun beforeHookedMethod(param: MethodHookParam) {
                    @Suppress("UNCHECKED_CAST")
                    val surfaces = param.args[0] as List<android.view.Surface>

                    XposedBridge.log("VirtuCam: Creating capture session with ${surfaces.size} surfaces")

                    if (isServiceEnabled()) {
                        // Replace with virtual surface
                        val virtualSurface = createVirtualSurface()
                        param.args[0] = listOf(virtualSurface)
                        XposedBridge.log("VirtuCam: Replaced surfaces with virtual camera")
                    }
                }
            }
        )

        // Hook createCaptureSessionByOutputConfigurations (API 28+)
        try {
            XposedHelpers.findAndHookMethod(
                cameraDeviceClass,
                "createCaptureSessionByOutputConfigurations",
                List::class.java,
                android.hardware.camera2.CameraCaptureSession.StateCallback::class.java,
                android.os.Handler::class.java,
                createCaptureSessionHook()
            )
        } catch (e: Exception) {
            // Method not available on older API levels
        }
    }
}
```

### 3. Capture Request Builder

```kotlin
class CaptureRequestHook {

    fun hook(classLoader: ClassLoader) {
        val captureRequestBuilderClass = XposedHelpers.findClass(
            "android.hardware.camera2.CaptureRequest\$Builder",
            classLoader
        )

        // Hook addTarget
        XposedHelpers.findAndHookMethod(
            captureRequestBuilderClass,
            "addTarget",
            android.view.Surface::class.java,
            object : XC_MethodHook() {
                override fun beforeHookedMethod(param: MethodHookParam) {
                    if (isServiceEnabled()) {
                        val virtualSurface = getVirtualSurface()
                        if (virtualSurface != null) {
                            param.args[0] = virtualSurface
                            XposedBridge.log("VirtuCam: Redirected capture target")
                        }
                    }
                }
            }
        )

        // Hook build
        XposedHelpers.findAndHookMethod(
            captureRequestBuilderClass,
            "build",
            object : XC_MethodHook() {
                override fun afterHookedMethod(param: MethodHookParam) {
                    val request = param.result as android.hardware.camera2.CaptureRequest
                    XposedBridge.log("VirtuCam: Capture request built")
                }
            }
        )
    }
}
```

### 4. Image Reader for Frame Injection

```kotlin
class ImageReaderHook {

    fun hook(classLoader: ClassLoader) {
        val imageReaderClass = XposedHelpers.findClass(
            "android.media.ImageReader",
            classLoader
        )

        // Hook acquireLatestImage
        XposedHelpers.findAndHookMethod(
            imageReaderClass,
            "acquireLatestImage",
            object : XC_MethodHook() {
                override fun afterHookedMethod(param: MethodHookParam) {
                    if (isServiceEnabled()) {
                        // Inject our frame instead
                        val virtualImage = getVirtualFrame()
                        if (virtualImage != null) {
                            param.result = virtualImage
                        }
                    }
                }
            }
        )
    }
}
```

## Complete Hook Implementation

```kotlin
package com.virtucam.lsposed

import android.hardware.camera2.*
import android.media.ImageReader
import android.view.Surface
import de.robv.android.xposed.*
import de.robv.android.xposed.callbacks.XC_LoadPackage

class VirtuCamModule : IXposedHookLoadPackage {

    private val supabase = SupabaseClient()
    private var virtualImageReader: VirtualCameraImageReader? = null
    private var frameInjector: FrameInjector? = null

    override fun handleLoadPackage(lpparam: XC_LoadPackage.LoadPackageParam) {
        // Target packages
        val targetApps = listOf(
            "com.android.chrome",
            "com.google.android.apps.meetings",
            "us.zoom.videomeetings",
            "com.microsoft.teams"
        )

        if (lpparam.packageName !in targetApps) return

        XposedBridge.log("VirtuCam: Loaded into ${lpparam.packageName}")

        try {
            hookCameraManager(lpparam.classLoader)
            hookCameraDevice(lpparam.classLoader)
            hookCaptureRequest(lpparam.classLoader)
        } catch (e: Exception) {
            XposedBridge.log("VirtuCam: Error hooking: ${e.message}")
            e.printStackTrace()
        }
    }

    private fun hookCameraManager(classLoader: ClassLoader) {
        XposedHelpers.findAndHookMethod(
            "android.hardware.camera2.CameraManager",
            classLoader,
            "openCamera",
            String::class.java,
            CameraDevice.StateCallback::class.java,
            android.os.Handler::class.java,
            object : XC_MethodHook() {
                override fun beforeHookedMethod(param: MethodHookParam) {
                    val cameraId = param.args[0] as String
                    XposedBridge.log("VirtuCam: Opening camera $cameraId")

                    // Initialize virtual camera if service is enabled
                    if (isServiceEnabled()) {
                        initializeVirtualCamera()
                    }
                }
            }
        )
    }

    private fun hookCameraDevice(classLoader: ClassLoader) {
        val cameraDeviceClass = XposedHelpers.findClass(
            "android.hardware.camera2.CameraDevice",
            classLoader
        )

        XposedHelpers.findAndHookMethod(
            cameraDeviceClass,
            "createCaptureSession",
            List::class.java,
            CameraCaptureSession.StateCallback::class.java,
            android.os.Handler::class.java,
            object : XC_MethodHook() {
                override fun beforeHookedMethod(param: MethodHookParam) {
                    if (!isServiceEnabled()) return

                    val status = supabase.getServiceStatus() ?: return
                    val media = supabase.getActiveMedia() ?: return

                    XposedBridge.log("VirtuCam: Intercepting capture session")
                    XposedBridge.log("VirtuCam: Media: ${media.fileName}")

                    // Get resolution
                    val (width, height) = getResolution(status)

                    // Create virtual ImageReader
                    virtualImageReader = VirtualCameraImageReader(width, height)

                    // Start frame injection
                    frameInjector = when (media.fileType) {
                        "video" -> VideoLoopInjector(
                            media.fileUri,
                            virtualImageReader!!,
                            status.frameRate,
                            status.loopEnabled
                        )
                        "image" -> FrameInjector(
                            virtualImageReader!!,
                            status.frameRate
                        )
                        else -> null
                    }

                    frameInjector?.start(media.fileUri)

                    // Replace surfaces
                    param.args[0] = listOf(virtualImageReader!!.surface)
                }
            }
        )
    }

    private fun hookCaptureRequest(classLoader: ClassLoader) {
        XposedHelpers.findAndHookMethod(
            "android.hardware.camera2.CaptureRequest\$Builder",
            classLoader,
            "addTarget",
            Surface::class.java,
            object : XC_MethodHook() {
                override fun beforeHookedMethod(param: MethodHookParam) {
                    if (isServiceEnabled() && virtualImageReader != null) {
                        param.args[0] = virtualImageReader!!.surface
                    }
                }
            }
        )
    }

    private fun isServiceEnabled(): Boolean {
        return try {
            supabase.getServiceStatus()?.isEnabled == true
        } catch (e: Exception) {
            false
        }
    }

    private fun initializeVirtualCamera() {
        val status = supabase.getServiceStatus() ?: return
        val media = supabase.getActiveMedia() ?: return

        XposedBridge.log("VirtuCam: Initializing virtual camera")
        XposedBridge.log("VirtuCam: Resolution: ${status.resolutionPreset}")
        XposedBridge.log("VirtuCam: FPS: ${status.frameRate}")
        XposedBridge.log("VirtuCam: Media: ${media.fileName}")
    }

    private fun getResolution(status: ServiceStatus): Pair<Int, Int> {
        return when (status.resolutionPreset) {
            "720p" -> 1280 to 720
            "1080p" -> 1920 to 1080
            "1440p" -> 2560 to 1440
            "4K" -> 3840 to 2160
            "custom" -> (status.customWidth ?: 1920) to (status.customHeight ?: 1080)
            else -> 1920 to 1080
        }
    }
}
```

## Android Version Compatibility

### API 21-27 (Lollipop - Oreo)
```kotlin
// Use createCaptureSession
device.createCaptureSession(surfaces, callback, handler)
```

### API 28+ (Pie and above)
```kotlin
// Use SessionConfiguration
val config = SessionConfiguration(
    SessionConfiguration.SESSION_REGULAR,
    outputConfigs,
    executor,
    callback
)
device.createCaptureSession(config)
```

## Testing Your Hooks

```kotlin
class HookTester {
    fun testHooks() {
        // 1. Check if service is enabled
        val enabled = isServiceEnabled()
        XposedBridge.log("Service enabled: $enabled")

        // 2. Check if media is available
        val media = supabase.getActiveMedia()
        XposedBridge.log("Active media: ${media?.fileName}")

        // 3. Check if file exists
        val file = File(media?.fileUri ?: "")
        XposedBridge.log("File exists: ${file.exists()}")

        // 4. Test surface creation
        try {
            val reader = VirtualCameraImageReader(1920, 1080)
            val surface = reader.surface
            XposedBridge.log("Surface valid: ${surface.isValid}")
            reader.close()
        } catch (e: Exception) {
            XposedBridge.log("Surface creation failed: ${e.message}")
        }
    }
}
```

## Debugging Tips

1. **Enable verbose logging**
   ```bash
   adb logcat | grep -E "VirtuCam|Camera2"
   ```

2. **Check LSPosed logs**
   - Open LSPosed Manager
   - Go to Logs tab
   - Filter by module name

3. **Test with simple app first**
   - Chrome WebRTC test page
   - Simple camera app
   - Before testing Zoom/Teams

4. **Verify hook points**
   ```kotlin
   XposedBridge.log("VirtuCam: Hook point reached")
   ```

5. **Monitor performance**
   ```kotlin
   val startTime = System.currentTimeMillis()
   // ... operation ...
   val duration = System.currentTimeMillis() - startTime
   XposedBridge.log("Operation took: ${duration}ms")
   ```

## Common Pitfalls

1. **Surface lifecycle:** Surfaces must remain valid during capture session
2. **Thread safety:** Camera callbacks happen on different threads
3. **Memory leaks:** Always close ImageReader and release resources
4. **Frame timing:** Match frame rate to avoid jitter
5. **Resolution mismatch:** App may request specific resolutions

## Advanced Topics

- Multi-camera support
- Hardware encoding
- Audio synchronization
- Face detection bypass
- Low-light simulation

## Security Notes

- Only hook apps you have permission to modify
- Don't log sensitive data
- Handle crashes gracefully
- Provide opt-out mechanism
