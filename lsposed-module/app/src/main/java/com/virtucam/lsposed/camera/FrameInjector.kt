package com.virtucam.lsposed.camera

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import com.virtucam.lsposed.VirtuCamModule
import com.virtucam.lsposed.utils.YUVConverter
import java.io.File

class FrameInjector(
    private val imagePath: String,
    private val imageReader: VirtualCameraImageReader,
    private val frameRate: Int
) : Injector {
    private var isRunning = false
    private var currentBitmap: Bitmap? = null
    private var injectionThread: Thread? = null

    override fun start() {
        if (isRunning) {
            VirtuCamModule.log("FrameInjector already running")
            return
        }

        VirtuCamModule.log("Starting FrameInjector for image: $imagePath")

        try {
            // Load image
            val file = File(imagePath)
            if (!file.exists()) {
                VirtuCamModule.log("Image file does not exist: $imagePath")
                return
            }

            currentBitmap = BitmapFactory.decodeFile(imagePath)
            if (currentBitmap == null) {
                VirtuCamModule.log("Failed to decode image: $imagePath")
                return
            }

            VirtuCamModule.log("Image loaded: ${currentBitmap!!.width}x${currentBitmap!!.height}")

            isRunning = true
            val frameDelayMs = 1000L / frameRate

            injectionThread = Thread {
                VirtuCamModule.log("Frame injection thread started")

                while (isRunning) {
                    try {
                        injectFrame()
                        Thread.sleep(frameDelayMs)
                    } catch (e: InterruptedException) {
                        VirtuCamModule.log("Frame injection interrupted")
                        break
                    } catch (e: Exception) {
                        VirtuCamModule.log("Error injecting frame: ${e.message}")
                        e.printStackTrace()
                    }
                }

                VirtuCamModule.log("Frame injection thread stopped")
            }.apply {
                priority = Thread.MAX_PRIORITY
                start()
            }

        } catch (e: Exception) {
            VirtuCamModule.log("Error starting FrameInjector: ${e.message}")
            e.printStackTrace()
        }
    }

    override fun stop() {
        VirtuCamModule.log("Stopping FrameInjector")
        isRunning = false
        injectionThread?.interrupt()
        injectionThread = null
        currentBitmap?.recycle()
        currentBitmap = null
    }

    private fun injectFrame() {
        val bitmap = currentBitmap ?: return

        try {
            // Get next available image from ImageReader
            val image = imageReader.imageReader.acquireLatestImage() ?: return

            try {
                // Convert bitmap to YUV
                val yuvData = YUVConverter.bitmapToYUV(bitmap)

                // Write YUV data to Image
                YUVConverter.writeYUVToImage(
                    yuvData,
                    image,
                    bitmap.width,
                    bitmap.height
                )

            } finally {
                image.close()
            }
        } catch (e: Exception) {
            // Silently handle frame injection errors to avoid log spam
            // Only log every 100 errors
            if (errorCount++ % 100 == 0) {
                VirtuCamModule.log("Frame injection error (count: $errorCount): ${e.message}")
            }
        }
    }

    companion object {
        private var errorCount = 0
    }
}
