# LSPosed Module Integration Guide

This document explains how to integrate the VirtuCam Control App with your LSPosed module for Camera2 API hooking.

## Architecture Overview

```
┌─────────────────────────┐
│  VirtuCam Control App   │
│  (React Native/Expo)    │
└───────────┬─────────────┘
            │
            │ Writes config/media
            ▼
┌─────────────────────────┐
│   Supabase Database     │
│  (Cloud PostgreSQL)     │
└───────────┬─────────────┘
            │
            │ Reads config/media
            ▼
┌─────────────────────────┐
│   LSPosed Module        │
│  (Xposed Hook)          │
└───────────┬─────────────┘
            │
            │ Intercepts Camera2 API
            ▼
┌─────────────────────────┐
│  Target Apps            │
│  (Chrome, Camera, etc)  │
└─────────────────────────┘
```

## Data Flow

1. **User selects media** in VirtuCam Control App
2. **Configuration is saved** to Supabase (resolution, frame rate, loop, media URI)
3. **LSPosed module reads** configuration from Supabase
4. **Module hooks** Camera2 API calls (CameraDevice.createCaptureSession)
5. **Module injects** frames from selected media into preview Surface

## Database Schema

### Table: `service_status`

```sql
id                  uuid PRIMARY KEY
is_enabled          boolean          -- Service on/off toggle
selected_media_id   uuid            -- FK to media_files
resolution_preset   text            -- '720p', '1080p', '1440p', '4K', 'custom'
custom_width        integer         -- Custom width if preset is 'custom'
custom_height       integer         -- Custom height if preset is 'custom'
loop_enabled        boolean         -- Loop video playback
frame_rate          integer         -- Target FPS (15, 24, 30, 60)
updated_at          timestamptz     -- Last update timestamp
```

### Table: `media_files`

```sql
id              uuid PRIMARY KEY
file_uri        text            -- Local file path (e.g., /storage/emulated/0/...)
file_name       text            -- Original filename
file_type       text            -- 'video' or 'image'
duration        integer         -- Duration in milliseconds (null for images)
width           integer         -- Original width
height          integer         -- Original height
file_size       bigint          -- File size in bytes
thumbnail_uri   text            -- Path to thumbnail
is_active       boolean         -- Currently selected media
created_at      timestamptz
updated_at      timestamptz
```

## LSPosed Module Implementation

### 1. Reading Configuration from Supabase

Add these dependencies to your LSPosed module's `build.gradle`:

```gradle
dependencies {
    implementation 'com.squareup.okhttp3:okhttp:4.11.0'
    implementation 'com.google.code.gson:gson:2.10.1'
}
```

### 2. Supabase Client Helper (Kotlin)

```kotlin
package com.virtucam.lsposed

import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import com.google.gson.Gson
import com.google.gson.annotations.SerializedName

data class ServiceStatus(
    val id: String,
    @SerializedName("is_enabled") val isEnabled: Boolean,
    @SerializedName("selected_media_id") val selectedMediaId: String?,
    @SerializedName("resolution_preset") val resolutionPreset: String,
    @SerializedName("custom_width") val customWidth: Int?,
    @SerializedName("custom_height") val customHeight: Int?,
    @SerializedName("loop_enabled") val loopEnabled: Boolean,
    @SerializedName("frame_rate") val frameRate: Int
)

data class MediaFile(
    val id: String,
    @SerializedName("file_uri") val fileUri: String,
    @SerializedName("file_name") val fileName: String,
    @SerializedName("file_type") val fileType: String,
    val duration: Int?,
    val width: Int,
    val height: Int,
    @SerializedName("file_size") val fileSize: Long
)

class SupabaseClient {
    private val client = OkHttpClient()
    private val gson = Gson()

    private val supabaseUrl = "https://pkruoiiwqygqkagwtobe.supabase.co"
    private val supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrcnVvaWl3cXlncWthZ3d0b2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NjIwNzEsImV4cCI6MjA4NDEzODA3MX0._hAjrJDDXFkgDKEl8a7NC_r7oI2m4y3BKXBSSriE-NA"

    fun getServiceStatus(): ServiceStatus? {
        val request = Request.Builder()
            .url("$supabaseUrl/rest/v1/service_status?limit=1")
            .addHeader("apikey", supabaseKey)
            .addHeader("Authorization", "Bearer $supabaseKey")
            .get()
            .build()

        try {
            client.newCall(request).execute().use { response ->
                if (response.isSuccessful) {
                    val body = response.body?.string()
                    val statuses = gson.fromJson(body, Array<ServiceStatus>::class.java)
                    return statuses.firstOrNull()
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return null
    }

    fun getMediaFile(mediaId: String): MediaFile? {
        val request = Request.Builder()
            .url("$supabaseUrl/rest/v1/media_files?id=eq.$mediaId")
            .addHeader("apikey", supabaseKey)
            .addHeader("Authorization", "Bearer $supabaseKey")
            .get()
            .build()

        try {
            client.newCall(request).execute().use { response ->
                if (response.isSuccessful) {
                    val body = response.body?.string()
                    val files = gson.fromJson(body, Array<MediaFile>::class.java)
                    return files.firstOrNull()
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return null
    }

    fun getActiveMedia(): MediaFile? {
        val request = Request.Builder()
            .url("$supabaseUrl/rest/v1/media_files?is_active=eq.true&limit=1")
            .addHeader("apikey", supabaseKey)
            .addHeader("Authorization", "Bearer $supabaseKey")
            .get()
            .build()

        try {
            client.newCall(request).execute().use { response ->
                if (response.isSuccessful) {
                    val body = response.body?.string()
                    val files = gson.fromJson(body, Array<MediaFile>::class.java)
                    return files.firstOrNull()
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return null
    }
}
```

### 3. Camera2 API Hooking

```kotlin
package com.virtucam.lsposed

import android.hardware.camera2.CameraDevice
import android.hardware.camera2.CaptureRequest
import android.hardware.camera2.CameraCaptureSession
import android.view.Surface
import de.robv.android.xposed.IXposedHookLoadPackage
import de.robv.android.xposed.XC_MethodHook
import de.robv.android.xposed.XposedBridge
import de.robv.android.xposed.XposedHelpers
import de.robv.android.xposed.callbacks.XC_LoadPackage

class VirtuCamHook : IXposedHookLoadPackage {

    private val supabase = SupabaseClient()
    private var virtualSurface: Surface? = null

    override fun handleLoadPackage(lpparam: XC_LoadPackage.LoadPackageParam) {
        // Target packages (add more as needed)
        val targetPackages = listOf(
            "com.android.chrome",
            "com.google.android.GoogleCamera",
            "com.android.camera2"
        )

        if (lpparam.packageName !in targetPackages) return

        XposedBridge.log("VirtuCam: Hooking ${lpparam.packageName}")

        // Hook CameraDevice.createCaptureSession
        hookCreateCaptureSession(lpparam.classLoader)

        // Hook CaptureRequest.Builder
        hookCaptureRequestBuilder(lpparam.classLoader)
    }

    private fun hookCreateCaptureSession(classLoader: ClassLoader) {
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
                    val status = supabase.getServiceStatus()

                    if (status?.isEnabled != true) {
                        XposedBridge.log("VirtuCam: Service disabled, passing through")
                        return
                    }

                    val media = supabase.getActiveMedia()
                    if (media == null) {
                        XposedBridge.log("VirtuCam: No active media found")
                        return
                    }

                    XposedBridge.log("VirtuCam: Intercepting capture session")
                    XposedBridge.log("VirtuCam: Media: ${media.fileName}")
                    XposedBridge.log("VirtuCam: Resolution: ${status.resolutionPreset}")
                    XposedBridge.log("VirtuCam: FPS: ${status.frameRate}")

                    // Replace surfaces with virtual camera surface
                    @Suppress("UNCHECKED_CAST")
                    val surfaces = param.args[0] as List<Surface>

                    // Create virtual surface from media file
                    virtualSurface = createVirtualSurface(media, status)

                    if (virtualSurface != null) {
                        // Replace the original surfaces
                        param.args[0] = listOf(virtualSurface)
                        XposedBridge.log("VirtuCam: Replaced surfaces with virtual feed")
                    }
                }
            }
        )
    }

    private fun hookCaptureRequestBuilder(classLoader: ClassLoader) {
        val captureRequestBuilderClass = XposedHelpers.findClass(
            "android.hardware.camera2.CaptureRequest.Builder",
            classLoader
        )

        XposedHelpers.findAndHookMethod(
            captureRequestBuilderClass,
            "addTarget",
            Surface::class.java,
            object : XC_MethodHook() {
                override fun beforeHookedMethod(param: MethodHookParam) {
                    val status = supabase.getServiceStatus()

                    if (status?.isEnabled == true && virtualSurface != null) {
                        // Redirect to virtual surface
                        param.args[0] = virtualSurface
                        XposedBridge.log("VirtuCam: Redirected capture target to virtual surface")
                    }
                }
            }
        )
    }

    private fun createVirtualSurface(media: MediaFile, status: ServiceStatus): Surface? {
        // TODO: Implement media decoder and surface creation
        // This should:
        // 1. Open the media file from media.fileUri
        // 2. Decode video frames or load image
        // 3. Create a Surface with the configured resolution
        // 4. Feed frames at the configured frame rate
        // 5. Loop if status.loopEnabled is true

        XposedBridge.log("VirtuCam: Creating virtual surface for ${media.fileUri}")

        // Return null for now - implement based on your needs
        return null
    }
}
```

### 4. Media Frame Injection (MediaCodec Example)

```kotlin
package com.virtucam.lsposed

import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.view.Surface
import java.io.File

class MediaFrameInjector(
    private val mediaFile: MediaFile,
    private val targetSurface: Surface,
    private val targetFps: Int,
    private val loop: Boolean
) {

    private var decoder: MediaCodec? = null
    private var extractor: MediaExtractor? = null
    private var isRunning = false

    fun start() {
        if (isRunning) return
        isRunning = true

        Thread {
            try {
                if (mediaFile.fileType == "video") {
                    playVideo()
                } else {
                    displayImage()
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }.start()
    }

    fun stop() {
        isRunning = false
        decoder?.stop()
        decoder?.release()
        extractor?.release()
    }

    private fun playVideo() {
        val file = File(mediaFile.fileUri)
        if (!file.exists()) return

        extractor = MediaExtractor()
        extractor?.setDataSource(file.absolutePath)

        // Find video track
        var trackIndex = -1
        var format: MediaFormat? = null

        for (i in 0 until extractor!!.trackCount) {
            val trackFormat = extractor!!.getTrackFormat(i)
            val mime = trackFormat.getString(MediaFormat.KEY_MIME)

            if (mime?.startsWith("video/") == true) {
                trackIndex = i
                format = trackFormat
                break
            }
        }

        if (trackIndex == -1 || format == null) return

        extractor?.selectTrack(trackIndex)

        // Create decoder
        val mime = format.getString(MediaFormat.KEY_MIME)!!
        decoder = MediaCodec.createDecoderByType(mime)
        decoder?.configure(format, targetSurface, null, 0)
        decoder?.start()

        val frameDelayUs = (1_000_000 / targetFps).toLong()

        do {
            // Decode and render frames
            val inputBufferIndex = decoder?.dequeueInputBuffer(10_000) ?: -1

            if (inputBufferIndex >= 0) {
                val inputBuffer = decoder?.getInputBuffer(inputBufferIndex)
                val sampleSize = extractor?.readSampleData(inputBuffer!!, 0) ?: -1

                if (sampleSize > 0) {
                    decoder?.queueInputBuffer(
                        inputBufferIndex,
                        0,
                        sampleSize,
                        extractor?.sampleTime ?: 0,
                        0
                    )
                    extractor?.advance()
                } else {
                    decoder?.queueInputBuffer(
                        inputBufferIndex,
                        0,
                        0,
                        0,
                        MediaCodec.BUFFER_FLAG_END_OF_STREAM
                    )
                }
            }

            val bufferInfo = MediaCodec.BufferInfo()
            val outputBufferIndex = decoder?.dequeueOutputBuffer(bufferInfo, 10_000) ?: -1

            if (outputBufferIndex >= 0) {
                decoder?.releaseOutputBuffer(outputBufferIndex, true)

                // Control frame rate
                Thread.sleep(frameDelayUs / 1000)
            }

            // Check if we need to loop
            if (bufferInfo.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) {
                if (loop && isRunning) {
                    // Restart from beginning
                    extractor?.seekTo(0, MediaExtractor.SEEK_TO_CLOSEST_SYNC)
                    decoder?.flush()
                } else {
                    break
                }
            }

        } while (isRunning)
    }

    private fun displayImage() {
        // TODO: Implement image display
        // Load image, convert to YUV, and continuously feed to surface
    }
}
```

## Resolution Mapping

```kotlin
fun getResolution(status: ServiceStatus): Pair<Int, Int> {
    return when (status.resolutionPreset) {
        "720p" -> 1280 to 720
        "1080p" -> 1920 to 1080
        "1440p" -> 2560 to 1440
        "4K" -> 3840 to 2160
        "custom" -> (status.customWidth ?: 1920) to (status.customHeight ?: 1080)
        else -> 1920 to 1080
    }
}
```

## Testing Checklist

- [ ] LSPosed module is activated in LSPosed Manager
- [ ] Module is enabled for target packages (Chrome, Camera, etc)
- [ ] VirtuCam Control App shows "Service Enabled"
- [ ] Media file is selected and marked as active
- [ ] Device has been rebooted after enabling module
- [ ] Check LSPosed logs for "VirtuCam:" messages
- [ ] Test with a simple app first (Chrome webcam test)

## Debugging

Enable logging in your module:

```kotlin
XposedBridge.log("VirtuCam: Your debug message here")
```

View logs:
```bash
adb logcat | grep VirtuCam
```

## Security Considerations

- This is for development/testing purposes only
- Media files should be on local storage (not cloud URLs)
- The module has access to camera data in hooked apps
- Only use on devices you own
- Don't use for bypassing authentication or security systems

## Next Steps

1. Implement `createVirtualSurface()` method
2. Add YUV frame conversion for images
3. Handle different video codecs (H.264, H.265, VP9)
4. Add frame scaling/cropping logic
5. Implement proper error handling
6. Add configuration caching to reduce API calls
