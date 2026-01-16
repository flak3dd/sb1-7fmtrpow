package com.virtucam.lsposed.utils

import android.graphics.Bitmap
import android.media.Image
import com.virtucam.lsposed.VirtuCamModule
import java.nio.ByteBuffer

object YUVConverter {

    /**
     * Convert RGB Bitmap to YUV_420_888 format
     */
    fun bitmapToYUV(bitmap: Bitmap): ByteArray {
        val width = bitmap.width
        val height = bitmap.height
        val pixels = IntArray(width * height)
        bitmap.getPixels(pixels, 0, width, 0, 0, width, height)

        val yuvSize = width * height * 3 / 2
        val yuv = ByteArray(yuvSize)

        encodeYUV420SP(yuv, pixels, width, height)
        return yuv
    }

    /**
     * Convert ARGB pixels to YUV_420_SP (NV21)
     * Uses BT.601 conversion formula
     */
    private fun encodeYUV420SP(yuv420sp: ByteArray, argb: IntArray, width: Int, height: Int) {
        val frameSize = width * height
        var yIndex = 0
        var uvIndex = frameSize

        var index = 0
        for (j in 0 until height) {
            for (i in 0 until width) {
                val pixel = argb[index]
                val R = (pixel shr 16) and 0xff
                val G = (pixel shr 8) and 0xff
                val B = pixel and 0xff

                // RGB to YUV conversion (BT.601)
                val Y = ((66 * R + 129 * G + 25 * B + 128) shr 8) + 16
                val U = ((-38 * R - 74 * G + 112 * B + 128) shr 8) + 128
                val V = ((112 * R - 94 * G - 18 * B + 128) shr 8) + 128

                // Clamp values to valid range
                yuv420sp[yIndex++] = clamp(Y).toByte()

                // Sample U and V at 2x2 intervals
                if (j % 2 == 0 && index % 2 == 0) {
                    yuv420sp[uvIndex++] = clamp(V).toByte()
                    yuv420sp[uvIndex++] = clamp(U).toByte()
                }

                index++
            }
        }
    }

    /**
     * Write YUV data to Image (for ImageReader)
     */
    fun writeYUVToImage(yuvData: ByteArray, image: Image, width: Int, height: Int) {
        try {
            val planes = image.planes

            if (planes.size < 3) {
                VirtuCamModule.log("Image does not have 3 planes: ${planes.size}")
                return
            }

            // Y plane
            val yBuffer = planes[0].buffer
            val ySize = width * height
            yBuffer.rewind()
            yBuffer.put(yuvData, 0, minOf(ySize, yBuffer.remaining()))

            // U plane (Cb)
            val uBuffer = planes[1].buffer
            val uSize = width * height / 4
            uBuffer.rewind()

            val uStartIndex = ySize
            for (i in 0 until minOf(uSize, uBuffer.remaining())) {
                if (uStartIndex + i * 2 + 1 < yuvData.size) {
                    uBuffer.put(yuvData[uStartIndex + i * 2 + 1])
                }
            }

            // V plane (Cr)
            val vBuffer = planes[2].buffer
            vBuffer.rewind()

            for (i in 0 until minOf(uSize, vBuffer.remaining())) {
                if (uStartIndex + i * 2 < yuvData.size) {
                    vBuffer.put(yuvData[uStartIndex + i * 2])
                }
            }

        } catch (e: Exception) {
            VirtuCamModule.log("Error writing YUV to image: ${e.message}")
            e.printStackTrace()
        }
    }

    /**
     * Alternative RGB to YUV conversion using standard BT.601
     */
    fun rgbToYUV_BT601(r: Int, g: Int, b: Int): Triple<Int, Int, Int> {
        val y = (0.299 * r + 0.587 * g + 0.114 * b).toInt()
        val u = ((-0.169 * r - 0.331 * g + 0.500 * b) + 128).toInt()
        val v = ((0.500 * r - 0.419 * g - 0.081 * b) + 128).toInt()

        return Triple(
            clamp(y),
            clamp(u),
            clamp(v)
        )
    }

    /**
     * Clamp value to 0-255 range
     */
    private fun clamp(value: Int): Int {
        return when {
            value < 0 -> 0
            value > 255 -> 255
            else -> value
        }
    }
}
