# LSPosed Module Setup Guide

Step-by-step guide to create your VirtuCam LSPosed module from scratch.

## Prerequisites

- Android Studio
- LSPosed framework installed on device
- Root access on test device
- Basic knowledge of Xposed/LSPosed

## Project Structure

```
VirtuCamModule/
├── app/
│   ├── src/
│   │   └── main/
│   │       ├── java/com/virtucam/lsposed/
│   │       │   ├── VirtuCamModule.kt          # Main hook class
│   │       │   ├── SupabaseClient.kt          # API client
│   │       │   ├── camera/
│   │       │   │   ├── VirtualCameraImageReader.kt
│   │       │   │   ├── FrameInjector.kt
│   │       │   │   └── VideoLoopInjector.kt
│   │       │   ├── hooks/
│   │       │   │   ├── CameraManagerHook.kt
│   │       │   │   ├── CameraDeviceHook.kt
│   │       │   │   └── CaptureRequestHook.kt
│   │       │   ├── utils/
│   │       │   │   └── YUVConverter.kt
│   │       │   └── video/
│   │       │       └── VideoFrameExtractor.kt
│   │       ├── AndroidManifest.xml
│   │       └── res/
│   │           └── values/
│   │               └── strings.xml
│   └── build.gradle
├── build.gradle
└── settings.gradle
```

## Step 1: Create Android Studio Project

1. Open Android Studio
2. Create new "Empty Activity" project
3. Set package name: `com.virtucam.lsposed`
4. Minimum SDK: API 21 (Android 5.0)
5. Language: Kotlin

## Step 2: Configure build.gradle (Project level)

```gradle
// build.gradle (Project level)
buildscript {
    ext.kotlin_version = '1.9.0'
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.1.0'
        classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlin_version"
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}
```

## Step 3: Configure build.gradle (Module level)

```gradle
// app/build.gradle
plugins {
    id 'com.android.application'
    id 'kotlin-android'
}

android {
    namespace 'com.virtucam.lsposed'
    compileSdk 34

    defaultConfig {
        applicationId "com.virtucam.lsposed"
        minSdk 21
        targetSdk 34
        versionCode 1
        versionName "1.0"
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = '17'
    }
}

dependencies {
    // Xposed API
    compileOnly 'de.robv.android.xposed:api:82'
    compileOnly 'de.robv.android.xposed:api:82:sources'

    // HTTP client for Supabase API
    implementation 'com.squareup.okhttp3:okhttp:4.11.0'

    // JSON parsing
    implementation 'com.google.code.gson:gson:2.10.1'

    // Kotlin standard library
    implementation "org.jetbrains.kotlin:kotlin-stdlib:$kotlin_version"

    // AndroidX
    implementation 'androidx.core:core-ktx:1.12.0'
}
```

## Step 4: Configure AndroidManifest.xml

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />

    <application
        android:label="VirtuCam Module"
        android:icon="@mipmap/ic_launcher">

        <!-- Xposed Module Metadata -->
        <meta-data
            android:name="xposedmodule"
            android:value="true" />

        <meta-data
            android:name="xposeddescription"
            android:value="Virtual camera module for Camera2 API hooking" />

        <meta-data
            android:name="xposedminversion"
            android:value="93" />

        <!-- LSPosed Scope -->
        <meta-data
            android:name="xposedscope"
            android:resource="@array/xposed_scope" />

    </application>

</manifest>
```

## Step 5: Create xposed_scope array

Create `app/src/main/res/values/arrays.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string-array name="xposed_scope">
        <!-- Add target packages here -->
        <item>com.android.chrome</item>
        <item>com.google.android.GoogleCamera</item>
        <item>com.google.android.apps.meetings</item>
        <item>us.zoom.videomeetings</item>
        <item>com.microsoft.teams</item>
        <!-- Add more apps as needed -->
    </string-array>
</resources>
```

## Step 6: Create xposed_init

Create `app/src/main/assets/xposed_init`:

```
com.virtucam.lsposed.VirtuCamModule
```

This file tells LSPosed which class is the entry point.

## Step 7: Implement Main Module Class

Create `VirtuCamModule.kt`:

```kotlin
package com.virtucam.lsposed

import de.robv.android.xposed.IXposedHookLoadPackage
import de.robv.android.xposed.XposedBridge
import de.robv.android.xposed.callbacks.XC_LoadPackage

class VirtuCamModule : IXposedHookLoadPackage {

    override fun handleLoadPackage(lpparam: XC_LoadPackage.LoadPackageParam) {
        // Check if this is a target package
        val targetPackages = listOf(
            "com.android.chrome",
            "com.google.android.apps.meetings",
            "us.zoom.videomeetings",
            "com.microsoft.teams"
        )

        if (lpparam.packageName !in targetPackages) {
            return
        }

        XposedBridge.log("VirtuCam: Loaded into ${lpparam.packageName}")

        try {
            // Initialize hooks
            hookCamera2API(lpparam.classLoader)
        } catch (e: Exception) {
            XposedBridge.log("VirtuCam: Error: ${e.message}")
            e.printStackTrace()
        }
    }

    private fun hookCamera2API(classLoader: ClassLoader) {
        // Implement camera hooks here
        XposedBridge.log("VirtuCam: Camera2 hooks initialized")
    }
}
```

## Step 8: Implement Supabase Client

Create `SupabaseClient.kt`:

```kotlin
package com.virtucam.lsposed

import com.google.gson.Gson
import com.google.gson.annotations.SerializedName
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit

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
    private val client = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .build()

    private val gson = Gson()

    private val supabaseUrl = "https://pkruoiiwqygqkagwtobe.supabase.co"
    private val supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrcnVvaWl3cXlncWthZ3d0b2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NjIwNzEsImV4cCI6MjA4NDEzODA3MX0._hAjrJDDXFkgDKEl8a7NC_r7oI2m4y3BKXBSSriE-NA"

    fun getServiceStatus(): ServiceStatus? {
        return try {
            val request = Request.Builder()
                .url("$supabaseUrl/rest/v1/service_status?limit=1")
                .addHeader("apikey", supabaseKey)
                .addHeader("Authorization", "Bearer $supabaseKey")
                .get()
                .build()

            client.newCall(request).execute().use { response ->
                if (response.isSuccessful) {
                    val body = response.body?.string()
                    val statuses = gson.fromJson(body, Array<ServiceStatus>::class.java)
                    statuses.firstOrNull()
                } else null
            }
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    fun getActiveMedia(): MediaFile? {
        return try {
            val request = Request.Builder()
                .url("$supabaseUrl/rest/v1/media_files?is_active=eq.true&limit=1")
                .addHeader("apikey", supabaseKey)
                .addHeader("Authorization", "Bearer $supabaseKey)
                .get()
                .build()

            client.newCall(request).execute().use { response ->
                if (response.isSuccessful) {
                    val body = response.body?.string()
                    val files = gson.fromJson(body, Array<MediaFile>::class.java)
                    files.firstOrNull()
                } else null
            }
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }
}
```

## Step 9: Build and Install

```bash
# Build APK
./gradlew assembleDebug

# Install on device
adb install app/build/outputs/apk/debug/app-debug.apk
```

## Step 10: Enable in LSPosed

1. Open LSPosed Manager
2. Go to "Modules" tab
3. Enable "VirtuCam Module"
4. Long press to select scope (target apps)
5. Select Chrome, Zoom, Teams, etc.
6. Reboot device

## Step 11: Testing

```bash
# View logs
adb logcat | grep VirtuCam

# Test with Chrome
# Open chrome://webrtc-internals
# Start webcam test
```

## Gradle Dependencies Reference

### Core Dependencies
```gradle
// Xposed API
compileOnly 'de.robv.android.xposed:api:82'

// HTTP client
implementation 'com.squareup.okhttp3:okhttp:4.11.0'

// JSON parsing
implementation 'com.google.code.gson:gson:2.10.1'
```

### Optional Dependencies
```gradle
// Image loading
implementation 'com.github.bumptech.glide:glide:4.15.1'

// Coroutines for async operations
implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'

// Lifecycle for better resource management
implementation 'androidx.lifecycle:lifecycle-runtime-ktx:2.6.2'
```

## ProGuard Rules

If using R8/ProGuard, add to `proguard-rules.pro`:

```proguard
# Keep Xposed API
-keep class de.robv.android.xposed.** { *; }

# Keep module entry point
-keep class com.virtucam.lsposed.VirtuCamModule { *; }

# Keep OkHttp
-dontwarn okhttp3.**
-keep class okhttp3.** { *; }

# Keep Gson
-keep class com.google.gson.** { *; }
-keep class * implements com.google.gson.TypeAdapter
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer

# Keep data classes
-keep class com.virtucam.lsposed.ServiceStatus { *; }
-keep class com.virtucam.lsposed.MediaFile { *; }
```

## Signing Configuration

For release builds, configure signing in `app/build.gradle`:

```gradle
android {
    signingConfigs {
        release {
            storeFile file("path/to/keystore.jks")
            storePassword "your_password"
            keyAlias "your_alias"
            keyPassword "your_password"
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

## Troubleshooting

### Module not showing in LSPosed
- Check `xposed_init` file exists in assets
- Verify meta-data in AndroidManifest.xml
- Ensure module is installed correctly

### Hooks not working
- Check LSPosed logs for errors
- Verify scope includes target apps
- Ensure device is rebooted after enabling
- Check API level compatibility

### Build errors
- Sync Gradle files
- Invalidate caches and restart
- Check dependency versions
- Ensure Java/Kotlin versions match

### Runtime errors
- Check network connectivity
- Verify Supabase credentials
- Ensure media files exist
- Check permissions granted

## Next Steps

1. Implement camera hooks (see CAMERA2_HOOKS.md)
2. Add YUV conversion (see YUV_FRAME_CONVERSION.md)
3. Test with target applications
4. Add error handling and logging
5. Optimize performance

## Resources

- [LSPosed Documentation](https://github.com/LSPosed/LSPosed)
- [Xposed API Reference](https://api.xposed.info/)
- [Camera2 API Guide](https://developer.android.com/training/camera2)
- [OkHttp Documentation](https://square.github.io/okhttp/)
