# Add project specific ProGuard rules here.

# Keep Xposed API
-keep class de.robv.android.xposed.** { *; }
-keepclassmembers class de.robv.android.xposed.** { *; }

# Keep module entry point
-keep class com.virtucam.lsposed.VirtuCamModule { *; }

# Keep hook classes
-keep class com.virtucam.lsposed.hooks.** { *; }

# Keep OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }

# Keep Gson
-keepattributes Signature
-keepattributes *Annotation*
-dontwarn sun.misc.**
-keep class com.google.gson.** { *; }
-keep class * implements com.google.gson.TypeAdapter
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer

# Keep data classes
-keep class com.virtucam.lsposed.ServiceStatus { *; }
-keep class com.virtucam.lsposed.MediaFile { *; }
-keepclassmembers class com.virtucam.lsposed.ServiceStatus { *; }
-keepclassmembers class com.virtucam.lsposed.MediaFile { *; }

# Keep Android Camera2 API classes
-keep class android.hardware.camera2.** { *; }
-keep class android.media.** { *; }

# Preserve line numbers for debugging
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
