package com.virtucam.lsposed.camera

import android.graphics.ImageFormat
import android.media.ImageReader
import android.os.Handler
import android.os.HandlerThread
import android.view.Surface
import com.virtucam.lsposed.VirtuCamModule

class VirtualCameraImageReader(
    private val width: Int,
    private val height: Int,
    private val maxImages: Int = 3
) {
    private val handlerThread = HandlerThread("VirtualCamera").apply {
        start()
        VirtuCamModule.log("VirtualCamera handler thread started")
    }
    private val handler = Handler(handlerThread.looper)

    val imageReader: ImageReader = ImageReader.newInstance(
        width,
        height,
        ImageFormat.YUV_420_888,
        maxImages
    ).also {
        VirtuCamModule.log("ImageReader created: ${width}x${height}, format=YUV_420_888, maxImages=$maxImages")
    }

    val surface: Surface
        get() = imageReader.surface

    fun setOnImageAvailableListener(listener: (ImageReader) -> Unit) {
        imageReader.setOnImageAvailableListener({ reader ->
            try {
                listener(reader)
            } catch (e: Exception) {
                VirtuCamModule.log("Error in image available listener: ${e.message}")
            }
        }, handler)
    }

    fun close() {
        try {
            imageReader.close()
            handlerThread.quitSafely()
            VirtuCamModule.log("VirtualCameraImageReader closed")
        } catch (e: Exception) {
            VirtuCamModule.log("Error closing VirtualCameraImageReader: ${e.message}")
        }
    }
}
