# YUV Frame Conversion Guide

This guide explains how to convert media files (videos/images) into YUV format for Camera2 API injection in your LSPosed module.

## Why YUV?

Camera2 API uses YUV_420_888 format for preview frames. To inject custom media:
1. Decode video/image to RGB/RGBA
2. Convert to YUV_420_888 format
3. Write to ImageReader or Surface
4. Camera2 API receives as if from real camera

## YUV_420_888 Format

```
┌─────────────────┐
│   Y  Plane      │  Luminance (brightness)
│   Full Size     │  width × height
│                 │
└─────────────────┘
┌────────┬────────┐
│ U Plane│ V Plane│  Chrominance (color)
│ 1/4    │ 1/4    │  (width/2) × (height/2) each
└────────┴────────┘
```

## RGB to YUV Conversion

### Java/Kotlin Implementation

```kotlin
package com.virtucam.lsposed.utils

import android.graphics.Bitmap
import android.graphics.ImageFormat
import android.media.Image
import android.media.ImageReader
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
     */
    private fun encodeYUV420SP(yuv420sp: ByteArray, argb: IntArray, width: Int, height: Int) {
        val frameSize = width * height
        var yIndex = 0
        var uvIndex = frameSize

        var R: Int
        var G: Int
        var B: Int
        var Y: Int
        var U: Int
        var V: Int

        var index = 0
        for (j in 0 until height) {
            for (i in 0 until width) {
                R = (argb[index] and 0xff0000) shr 16
                G = (argb[index] and 0xff00) shr 8
                B = argb[index] and 0xff

                // RGB to YUV conversion
                Y = ((66 * R + 129 * G + 25 * B + 128) shr 8) + 16
                U = ((-38 * R - 74 * G + 112 * B + 128) shr 8) + 128
                V = ((112 * R - 94 * G - 18 * B + 128) shr 8) + 128

                // Clamp values
                yuv420sp[yIndex++] = Y.coerceIn(0, 255).toByte()

                if (j % 2 == 0 && index % 2 == 0) {
                    yuv420sp[uvIndex++] = V.coerceIn(0, 255).toByte()
                    yuv420sp[uvIndex++] = U.coerceIn(0, 255).toByte()
                }

                index++
            }
        }
    }

    /**
     * Alternative: Use standard BT.601 conversion
     */
    fun rgbToYUV_BT601(r: Int, g: Int, b: Int): Triple<Int, Int, Int> {
        val y = (0.299 * r + 0.587 * g + 0.114 * b).toInt()
        val u = ((-0.169 * r - 0.331 * g + 0.500 * b) + 128).toInt()
        val v = ((0.500 * r - 0.419 * g - 0.081 * b) + 128).toInt()

        return Triple(
            y.coerceIn(0, 255),
            u.coerceIn(0, 255),
            v.coerceIn(0, 255)
        )
    }

    /**
     * Write YUV data to Image (for ImageReader)
     */
    fun writeYUVToImage(yuvData: ByteArray, image: Image, width: Int, height: Int) {
        val planes = image.planes

        // Y plane
        val yBuffer = planes[0].buffer
        val ySize = width * height
        yBuffer.put(yuvData, 0, ySize)

        // U plane
        val uBuffer = planes[1].buffer
        val uSize = width * height / 4
        val stride = planes[1].rowStride

        for (row in 0 until height / 2) {
            for (col in 0 until width / 2) {
                val index = ySize + row * (width / 2) + col
                uBuffer.put(yuvData[index])
            }
        }

        // V plane
        val vBuffer = planes[2].buffer
        for (row in 0 until height / 2) {
            for (col in 0 until width / 2) {
                val index = ySize + (width * height / 4) + row * (width / 2) + col
                vBuffer.put(yuvData[index])
            }
        }
    }
}
```

## ImageReader Setup

```kotlin
package com.virtucam.lsposed.camera

import android.graphics.ImageFormat
import android.media.ImageReader
import android.os.Handler
import android.os.HandlerThread
import android.view.Surface

class VirtualCameraImageReader(
    private val width: Int,
    private val height: Int,
    private val maxImages: Int = 3
) {
    private val handlerThread = HandlerThread("VirtualCamera").apply { start() }
    private val handler = Handler(handlerThread.looper)

    val imageReader: ImageReader = ImageReader.newInstance(
        width,
        height,
        ImageFormat.YUV_420_888,
        maxImages
    )

    val surface: Surface
        get() = imageReader.surface

    fun setOnImageAvailableListener(listener: (ImageReader) -> Unit) {
        imageReader.setOnImageAvailableListener({ reader ->
            listener(reader)
        }, handler)
    }

    fun close() {
        imageReader.close()
        handlerThread.quitSafely()
    }
}
```

## Frame Injection Loop

```kotlin
package com.virtucam.lsposed.camera

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.ImageReader
import com.virtucam.lsposed.utils.YUVConverter

class FrameInjector(
    private val imageReader: VirtualCameraImageReader,
    private val frameRate: Int
) {
    private var isRunning = false
    private var currentBitmap: Bitmap? = null

    fun start(imagePath: String) {
        if (isRunning) return
        isRunning = true

        // Load image
        currentBitmap = BitmapFactory.decodeFile(imagePath)

        Thread {
            val frameDelayMs = 1000L / frameRate

            while (isRunning) {
                try {
                    injectFrame()
                    Thread.sleep(frameDelayMs)
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }.start()
    }

    fun stop() {
        isRunning = false
        currentBitmap?.recycle()
        currentBitmap = null
    }

    private fun injectFrame() {
        val bitmap = currentBitmap ?: return

        // Get next available image from ImageReader
        val image = imageReader.imageReader.acquireNextImage() ?: return

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
    }
}
```

## Video Frame Extraction

```kotlin
package com.virtucam.lsposed.video

import android.graphics.Bitmap
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import java.nio.ByteBuffer

class VideoFrameExtractor(private val videoPath: String) {

    private val extractor = MediaExtractor()
    private var decoder: MediaCodec? = null
    private var width = 0
    private var height = 0

    init {
        extractor.setDataSource(videoPath)
        setupDecoder()
    }

    private fun setupDecoder() {
        // Find video track
        for (i in 0 until extractor.trackCount) {
            val format = extractor.getTrackFormat(i)
            val mime = format.getString(MediaFormat.KEY_MIME)

            if (mime?.startsWith("video/") == true) {
                extractor.selectTrack(i)
                width = format.getInteger(MediaFormat.KEY_WIDTH)
                height = format.getInteger(MediaFormat.KEY_HEIGHT)

                decoder = MediaCodec.createDecoderByType(mime)
                decoder?.configure(format, null, null, 0)
                decoder?.start()
                break
            }
        }
    }

    fun getNextFrame(): Bitmap? {
        val decoder = this.decoder ?: return null

        // Feed input
        val inputBufferIndex = decoder.dequeueInputBuffer(10_000)
        if (inputBufferIndex >= 0) {
            val inputBuffer = decoder.getInputBuffer(inputBufferIndex)
            val sampleSize = extractor.readSampleData(inputBuffer!!, 0)

            if (sampleSize > 0) {
                decoder.queueInputBuffer(
                    inputBufferIndex,
                    0,
                    sampleSize,
                    extractor.sampleTime,
                    0
                )
                extractor.advance()
            }
        }

        // Get output
        val bufferInfo = MediaCodec.BufferInfo()
        val outputBufferIndex = decoder.dequeueOutputBuffer(bufferInfo, 10_000)

        if (outputBufferIndex >= 0) {
            val outputBuffer = decoder.getOutputBuffer(outputBufferIndex)
            val bitmap = bufferToBitmap(outputBuffer, width, height)
            decoder.releaseOutputBuffer(outputBufferIndex, false)
            return bitmap
        }

        return null
    }

    private fun bufferToBitmap(buffer: ByteBuffer?, width: Int, height: Int): Bitmap? {
        if (buffer == null) return null

        val bytes = ByteArray(buffer.remaining())
        buffer.get(bytes)

        // Convert to bitmap (implementation depends on format)
        return Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
    }

    fun seekTo(timeUs: Long) {
        extractor.seekTo(timeUs, MediaExtractor.SEEK_TO_CLOSEST_SYNC)
    }

    fun release() {
        decoder?.stop()
        decoder?.release()
        extractor.release()
    }
}
```

## Efficient Video Loop

```kotlin
package com.virtucam.lsposed.video

import android.media.ImageReader
import android.os.Handler
import android.os.HandlerThread
import com.virtucam.lsposed.utils.YUVConverter

class VideoLoopInjector(
    private val videoPath: String,
    private val imageReader: VirtualCameraImageReader,
    private val frameRate: Int,
    private val loop: Boolean
) {
    private val handlerThread = HandlerThread("VideoLoop").apply { start() }
    private val handler = Handler(handlerThread.looper)
    private val frameExtractor = VideoFrameExtractor(videoPath)

    private var isRunning = false
    private val frameDelayMs = 1000L / frameRate

    fun start() {
        if (isRunning) return
        isRunning = true

        handler.post(object : Runnable {
            override fun run() {
                if (!isRunning) return

                val bitmap = frameExtractor.getNextFrame()

                if (bitmap != null) {
                    injectBitmap(bitmap)
                    bitmap.recycle()
                    handler.postDelayed(this, frameDelayMs)
                } else if (loop) {
                    // Restart from beginning
                    frameExtractor.seekTo(0)
                    handler.postDelayed(this, frameDelayMs)
                } else {
                    stop()
                }
            }
        })
    }

    fun stop() {
        isRunning = false
        handler.removeCallbacksAndMessages(null)
        frameExtractor.release()
    }

    private fun injectBitmap(bitmap: Bitmap) {
        val image = imageReader.imageReader.acquireNextImage() ?: return

        try {
            val yuvData = YUVConverter.bitmapToYUV(bitmap)
            YUVConverter.writeYUVToImage(
                yuvData,
                image,
                bitmap.width,
                bitmap.height
            )
        } finally {
            image.close()
        }
    }
}
```

## Hardware Acceleration (Optional)

For better performance, use RenderScript:

```kotlin
package com.virtucam.lsposed.utils

import android.content.Context
import android.graphics.Bitmap
import android.renderscript.*

class RenderScriptYUVConverter(context: Context) {
    private val rs = RenderScript.create(context)
    private val yuvScript = ScriptIntrinsicYuvToRGB.create(rs, Element.U8_4(rs))

    fun convertBitmap(bitmap: Bitmap): ByteArray {
        val width = bitmap.width
        val height = bitmap.height

        // Create allocations
        val inputAllocation = Allocation.createFromBitmap(rs, bitmap)
        val outputAllocation = Allocation.createSized(
            rs,
            Element.U8(rs),
            width * height * 3 / 2
        )

        // Run script
        yuvScript.setInput(inputAllocation)
        yuvScript.forEach(outputAllocation)

        // Copy result
        val yuvData = ByteArray(width * height * 3 / 2)
        outputAllocation.copyTo(yuvData)

        // Cleanup
        inputAllocation.destroy()
        outputAllocation.destroy()

        return yuvData
    }

    fun destroy() {
        yuvScript.destroy()
        rs.destroy()
    }
}
```

## Testing YUV Conversion

```kotlin
// Test conversion accuracy
fun testYUVConversion() {
    val width = 1920
    val height = 1080

    // Create test bitmap
    val testBitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)

    // Convert to YUV
    val yuvData = YUVConverter.bitmapToYUV(testBitmap)

    // Verify size
    val expectedSize = width * height * 3 / 2
    assert(yuvData.size == expectedSize) {
        "YUV size mismatch: expected $expectedSize, got ${yuvData.size}"
    }

    println("✓ YUV conversion test passed")
}
```

## Performance Tips

1. **Reuse Buffers:** Don't allocate new arrays each frame
2. **Pool Bitmaps:** Use bitmap pool to avoid GC
3. **Hardware Decode:** Use MediaCodec with Surface output
4. **Native Code:** Consider JNI for critical conversion loops
5. **Frame Skip:** Drop frames if injection is too slow
6. **Resolution Match:** Convert to target resolution only once

## Common Issues

### Issue: Frames are choppy
**Solution:** Reduce target FPS or resolution

### Issue: Colors are wrong
**Solution:** Check YUV format (NV21 vs NV12 vs I420)

### Issue: Memory leaks
**Solution:** Always recycle bitmaps and close images

### Issue: Slow conversion
**Solution:** Use RenderScript or native code

## Further Reading

- [Camera2 API Documentation](https://developer.android.com/reference/android/hardware/camera2/package-summary)
- [YUV Format Details](https://wiki.videolan.org/YUV)
- [MediaCodec Guide](https://developer.android.com/reference/android/media/MediaCodec)
- [ImageReader Reference](https://developer.android.com/reference/android/media/ImageReader)
