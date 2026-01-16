package com.virtucam.lsposed

import android.hardware.camera2.CameraDevice
import android.hardware.camera2.CameraCaptureSession
import android.view.Surface
import com.virtucam.lsposed.camera.VirtualCameraImageReader
import com.virtucam.lsposed.camera.Injector
import com.virtucam.lsposed.hooks.CameraDeviceHook
import com.virtucam.lsposed.hooks.CameraManagerHook
import com.virtucam.lsposed.hooks.CaptureRequestHook
import de.robv.android.xposed.IXposedHookLoadPackage
import de.robv.android.xposed.XposedBridge
import de.robv.android.xposed.callbacks.XC_LoadPackage

class VirtuCamModule : IXposedHookLoadPackage {

    companion object {
        private const val TAG = "VirtuCam"

        // Singleton instances shared across hooks
        var virtualImageReader: VirtualCameraImageReader? = null
        var frameInjector: Injector? = null
        var supabase: SupabaseClient? = null
        var currentConfig: ServiceStatus? = null
        var currentMedia: MediaFile? = null
    }

    override fun handleLoadPackage(lpparam: XC_LoadPackage.LoadPackageParam) {
        // Skip if not a target package
        if (!isTargetPackage(lpparam.packageName)) {
            return
        }

        log("Loaded into ${lpparam.packageName}")

        try {
            // Initialize Supabase client
            supabase = SupabaseClient()

            // Check if service is enabled
            if (!isServiceEnabled()) {
                log("Service is disabled, hooks will not activate")
                return
            }

            // Load configuration
            loadConfiguration()

            // Install hooks
            installHooks(lpparam.classLoader)

            log("Hooks installed successfully")
        } catch (e: Exception) {
            log("Error in handleLoadPackage: ${e.message}")
            e.printStackTrace()
        }
    }

    private fun isTargetPackage(packageName: String): Boolean {
        val targetPackages = listOf(
            "com.android.chrome",
            "org.mozilla.firefox",
            "com.google.android.apps.meetings",
            "us.zoom.videomeetings",
            "com.microsoft.teams",
            "com.skype.raider",
            "com.discord",
            "com.google.android.GoogleCamera",
            "com.android.camera2"
        )
        return packageName in targetPackages
    }

    private fun isServiceEnabled(): Boolean {
        return try {
            val status = supabase?.getServiceStatus()
            status?.isEnabled == true
        } catch (e: Exception) {
            log("Error checking service status: ${e.message}")
            false
        }
    }

    private fun loadConfiguration() {
        try {
            currentConfig = supabase?.getServiceStatus()
            currentMedia = supabase?.getActiveMedia()

            if (currentConfig != null && currentMedia != null) {
                log("Configuration loaded:")
                log("  Media: ${currentMedia?.fileName}")
                log("  Resolution: ${currentConfig?.resolutionPreset}")
                log("  FPS: ${currentConfig?.frameRate}")
                log("  Loop: ${currentConfig?.loopEnabled}")
            } else {
                log("Warning: Configuration or media not found")
            }
        } catch (e: Exception) {
            log("Error loading configuration: ${e.message}")
            e.printStackTrace()
        }
    }

    private fun installHooks(classLoader: ClassLoader) {
        try {
            // Hook CameraManager
            CameraManagerHook.install(classLoader)
            log("CameraManager hook installed")

            // Hook CameraDevice
            CameraDeviceHook.install(classLoader)
            log("CameraDevice hook installed")

            // Hook CaptureRequest.Builder
            CaptureRequestHook.install(classLoader)
            log("CaptureRequest.Builder hook installed")

        } catch (e: Exception) {
            log("Error installing hooks: ${e.message}")
            e.printStackTrace()
        }
    }

    companion object {
        fun log(message: String) {
            XposedBridge.log("$TAG: $message")
        }

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
    }
}
