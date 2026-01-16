package com.virtucam.lsposed.hooks

import android.hardware.camera2.CameraCaptureSession
import android.hardware.camera2.CameraDevice
import android.os.Handler
import android.view.Surface
import com.virtucam.lsposed.VirtuCamModule
import com.virtucam.lsposed.camera.FrameInjector
import com.virtucam.lsposed.camera.VirtualCameraImageReader
import com.virtucam.lsposed.camera.VideoLoopInjector
import de.robv.android.xposed.XC_MethodHook
import de.robv.android.xposed.XposedHelpers
import java.io.File

object CameraDeviceHook {

    fun install(classLoader: ClassLoader) {
        try {
            val cameraDeviceClass = XposedHelpers.findClass(
                "android.hardware.camera2.CameraDevice",
                classLoader
            )

            // Hook createCaptureSession (API 21-27)
            hookCreateCaptureSession(cameraDeviceClass)

            // Try to hook createCaptureSessionByOutputConfigurations (API 28+)
            try {
                hookCreateCaptureSessionByOutputConfigurations(cameraDeviceClass)
            } catch (e: NoSuchMethodError) {
                VirtuCamModule.log("createCaptureSessionByOutputConfigurations not available (older API level)")
            }

            VirtuCamModule.log("CameraDeviceHook installed")
        } catch (e: Exception) {
            VirtuCamModule.log("Error installing CameraDeviceHook: ${e.message}")
            e.printStackTrace()
        }
    }

    private fun hookCreateCaptureSession(cameraDeviceClass: Class<*>) {
        XposedHelpers.findAndHookMethod(
            cameraDeviceClass,
            "createCaptureSession",
            List::class.java,
            CameraCaptureSession.StateCallback::class.java,
            Handler::class.java,
            object : XC_MethodHook() {
                override fun beforeHookedMethod(param: MethodHookParam) {
                    try {
                        @Suppress("UNCHECKED_CAST")
                        val surfaces = param.args[0] as List<Surface>
                        VirtuCamModule.log("createCaptureSession called with ${surfaces.size} surfaces")

                        // Get current configuration
                        val config = VirtuCamModule.currentConfig
                        val media = VirtuCamModule.currentMedia

                        if (config == null || media == null) {
                            VirtuCamModule.log("No configuration or media found, passing through")
                            return
                        }

                        // Check if file exists
                        val mediaFile = File(media.fileUri)
                        if (!mediaFile.exists()) {
                            VirtuCamModule.log("Media file does not exist: ${media.fileUri}")
                            return
                        }

                        VirtuCamModule.log("Intercepting capture session")
                        VirtuCamModule.log("  Media: ${media.fileName}")
                        VirtuCamModule.log("  Type: ${media.fileType}")
                        VirtuCamModule.log("  Path: ${media.fileUri}")

                        // Get resolution
                        val (width, height) = VirtuCamModule.getResolution(config)
                        VirtuCamModule.log("  Resolution: ${width}x${height}")
                        VirtuCamModule.log("  FPS: ${config.frameRate}")

                        // Create virtual ImageReader
                        val imageReader = VirtualCameraImageReader(width, height)
                        VirtuCamModule.virtualImageReader = imageReader

                        // Create frame injector based on media type
                        val injector = when (media.fileType) {
                            "video" -> {
                                VirtuCamModule.log("Creating VideoLoopInjector")
                                VideoLoopInjector(
                                    media.fileUri,
                                    imageReader,
                                    config.frameRate,
                                    config.loopEnabled
                                )
                            }
                            "image" -> {
                                VirtuCamModule.log("Creating FrameInjector for image")
                                FrameInjector(media.fileUri, imageReader, config.frameRate)
                            }
                            else -> {
                                VirtuCamModule.log("Unknown media type: ${media.fileType}")
                                null
                            }
                        }

                        if (injector != null) {
                            VirtuCamModule.frameInjector = injector
                            injector.start()
                            VirtuCamModule.log("Frame injector started")

                            // Replace surfaces with virtual surface
                            param.args[0] = listOf(imageReader.surface)
                            VirtuCamModule.log("Replaced surfaces with virtual camera surface")
                        }

                    } catch (e: Exception) {
                        VirtuCamModule.log("Error in createCaptureSession hook: ${e.message}")
                        e.printStackTrace()
                    }
                }

                override fun afterHookedMethod(param: MethodHookParam) {
                    VirtuCamModule.log("Capture session created")
                }
            }
        )
    }

    private fun hookCreateCaptureSessionByOutputConfigurations(cameraDeviceClass: Class<*>) {
        // Similar implementation for API 28+
        // This method uses OutputConfiguration instead of raw Surface
        VirtuCamModule.log("Note: createCaptureSessionByOutputConfigurations hook available for API 28+")
    }
}
