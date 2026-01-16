package com.virtucam.lsposed.hooks

import android.hardware.camera2.CameraDevice
import android.os.Handler
import com.virtucam.lsposed.VirtuCamModule
import de.robv.android.xposed.XC_MethodHook
import de.robv.android.xposed.XposedHelpers

object CameraManagerHook {

    fun install(classLoader: ClassLoader) {
        try {
            val cameraManagerClass = XposedHelpers.findClass(
                "android.hardware.camera2.CameraManager",
                classLoader
            )

            // Hook openCamera method
            XposedHelpers.findAndHookMethod(
                cameraManagerClass,
                "openCamera",
                String::class.java,
                CameraDevice.StateCallback::class.java,
                Handler::class.java,
                object : XC_MethodHook() {
                    override fun beforeHookedMethod(param: MethodHookParam) {
                        val cameraId = param.args[0] as String
                        VirtuCamModule.log("CameraManager.openCamera() called with ID: $cameraId")

                        // Check if we should intercept this camera
                        if (shouldInterceptCamera(cameraId)) {
                            VirtuCamModule.log("Will intercept camera $cameraId")
                        }
                    }

                    override fun afterHookedMethod(param: MethodHookParam) {
                        VirtuCamModule.log("Camera device opened successfully")
                    }
                }
            )

            VirtuCamModule.log("CameraManagerHook installed")
        } catch (e: Exception) {
            VirtuCamModule.log("Error installing CameraManagerHook: ${e.message}")
            e.printStackTrace()
        }
    }

    private fun shouldInterceptCamera(cameraId: String): Boolean {
        // Typically:
        // "0" = back camera
        // "1" = front camera
        // Intercept front camera for video calls
        return cameraId == "1" || cameraId == "0" // Intercept both for now
    }
}
