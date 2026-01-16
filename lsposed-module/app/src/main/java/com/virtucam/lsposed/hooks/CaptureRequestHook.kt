package com.virtucam.lsposed.hooks

import android.view.Surface
import com.virtucam.lsposed.VirtuCamModule
import de.robv.android.xposed.XC_MethodHook
import de.robv.android.xposed.XposedHelpers

object CaptureRequestHook {

    fun install(classLoader: ClassLoader) {
        try {
            val captureRequestBuilderClass = XposedHelpers.findClass(
                "android.hardware.camera2.CaptureRequest\$Builder",
                classLoader
            )

            // Hook addTarget method
            XposedHelpers.findAndHookMethod(
                captureRequestBuilderClass,
                "addTarget",
                Surface::class.java,
                object : XC_MethodHook() {
                    override fun beforeHookedMethod(param: MethodHookParam) {
                        try {
                            val virtualImageReader = VirtuCamModule.virtualImageReader

                            if (virtualImageReader != null && VirtuCamModule.currentConfig != null) {
                                // Redirect to virtual surface
                                param.args[0] = virtualImageReader.surface
                                VirtuCamModule.log("Redirected capture target to virtual surface")
                            }
                        } catch (e: Exception) {
                            VirtuCamModule.log("Error in addTarget hook: ${e.message}")
                        }
                    }
                }
            )

            // Hook build method to log when requests are built
            XposedHelpers.findAndHookMethod(
                captureRequestBuilderClass,
                "build",
                object : XC_MethodHook() {
                    override fun afterHookedMethod(param: MethodHookParam) {
                        if (VirtuCamModule.virtualImageReader != null) {
                            VirtuCamModule.log("Capture request built with virtual camera")
                        }
                    }
                }
            )

            VirtuCamModule.log("CaptureRequestHook installed")
        } catch (e: Exception) {
            VirtuCamModule.log("Error installing CaptureRequestHook: ${e.message}")
            e.printStackTrace()
        }
    }
}
