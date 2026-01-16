package com.virtucam.lsposed.camera

import android.graphics.ImageFormat
import android.media.Image
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.os.Handler
import android.os.HandlerThread
import com.virtucam.lsposed.VirtuCamModule
import com.virtucam.lsposed.utils.YUVConverter
import java.io.File
import java.nio.ByteBuffer
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.atomic.AtomicBoolean

class VideoLoopInjector(
    private val videoPath: String,
    private val imageReader: VirtualCameraImageReader,
    private val frameRate: Int,
    private val loop: Boolean
) : Injector {
    private var extractor: MediaExtractor? = null
    private var decoder: MediaCodec? = null
    private var handlerThread: HandlerThread? = null
    private var handler: Handler? = null
    private val frameQueue = LinkedBlockingQueue<YUVFrame>(10)
    private var currentTimeUs: Long = 0L
    private var frameIntervalUs: Long = 1_000_000L / frameRate
    private var format: MediaFormat? = null
    private val running = AtomicBoolean(false)
    private var width: Int = 0
    private var height: Int = 0

    data class YUVFrame(
        val yPlane: ByteBuffer,
        val uPlane: ByteBuffer,
        val vPlane: ByteBuffer,
        val width: Int,
        val height: Int
    )

    override fun start() {
        if (running.getAndSet(true)) {
            VirtuCamModule.log("VideoLoopInjector already running")
            return
        }

        VirtuCamModule.log("Starting VideoLoopInjector")
        VirtuCamModule.log("  Video: $videoPath")
        VirtuCamModule.log("  FPS: $frameRate")
        VirtuCamModule.log("  Loop: $loop")

        try {
            val file = File(videoPath)
            if (!file.exists()) {
                VirtuCamModule.log("Video file does not exist: $videoPath")
                running.set(false)
                return
            }

            if (!setupDecoder()) {
                VirtuCamModule.log("Failed to setup decoder")
                running.set(false)
                return
            }

            startInjectionThread()
            preloadFrames()

        } catch (e: Exception) {
            VirtuCamModule.log("Error starting VideoLoopInjector: ${e.message}")
            e.printStackTrace()
            running.set(false)
        }
    }

    private fun setupDecoder(): Boolean {
        try {
            extractor = MediaExtractor().apply { setDataSource(videoPath) }

            for (i in 0 until extractor!!.trackCount) {
                format = extractor!!.getTrackFormat(i)
                val mime = format!!.getString(MediaFormat.KEY_MIME)
                if (mime?.startsWith("video/") == true) {
                    extractor!!.selectTrack(i)
                    width = format!!.getInteger(MediaFormat.KEY_WIDTH)
                    height = format!!.getInteger(MediaFormat.KEY_HEIGHT)
                    VirtuCamModule.log("Video dimensions: ${width}x${height}")
                    break
                }
            }

            if (format == null) {
                VirtuCamModule.log("No video track found")
                return false
            }

            decoder = MediaCodec.createDecoderByType(format!!.getString(MediaFormat.KEY_MIME)!!).apply {
                configure(format, null, null, 0)
                start()
            }

            handlerThread = HandlerThread("VideoInjectorThread").apply { start() }
            handler = Handler(handlerThread!!.looper)

            return true
        } catch (e: Exception) {
            VirtuCamModule.log("Error setting up decoder: ${e.message}")
            e.printStackTrace()
            return false
        }
    }

    private fun preloadFrames() {
        handler?.post {
            while (frameQueue.size < 10 && running.get()) {
                decodeNextFrame()?.let { frameQueue.offer(it) }
            }
        }
    }

    private fun startInjectionThread() {
        Thread {
            VirtuCamModule.log("Video injection thread started")
            var frameCount = 0
            val frameDelayMs = 1000L / frameRate

            while (running.get()) {
                try {
                    val yuvFrame = frameQueue.poll()
                    if (yuvFrame != null) {
                        injectYUVFrame(yuvFrame)
                        frameCount++

                        if (frameCount % 100 == 0) {
                            VirtuCamModule.log("Injected $frameCount frames")
                        }

                        Thread.sleep(frameDelayMs)

                        if (frameQueue.size < 5) {
                            preloadFrames()
                        }
                    } else {
                        Thread.sleep(10)
                    }
                } catch (e: InterruptedException) {
                    VirtuCamModule.log("Video injection interrupted")
                    break
                } catch (e: Exception) {
                    VirtuCamModule.log("Error in video injection: ${e.message}")
                    e.printStackTrace()
                }
            }

            VirtuCamModule.log("Video injection thread stopped (total frames: $frameCount)")
        }.apply {
            priority = Thread.MAX_PRIORITY
            start()
        }
    }

    private fun decodeNextFrame(): YUVFrame? {
        try {
            val inputIndex = decoder?.dequeueInputBuffer(10_000) ?: return null
            if (inputIndex >= 0) {
                val inputBuffer = decoder!!.getInputBuffer(inputIndex) ?: return null
                val sampleSize = extractor!!.readSampleData(inputBuffer, 0)

                if (sampleSize < 0) {
                    if (loop && running.get()) {
                        VirtuCamModule.log("Video ended, restarting loop")
                        extractor!!.seekTo(0, MediaExtractor.SEEK_TO_CLOSEST_SYNC)
                        currentTimeUs = 0L
                        return decodeNextFrame()
                    } else {
                        VirtuCamModule.log("Video playback finished")
                        running.set(false)
                        return null
                    }
                }

                decoder!!.queueInputBuffer(inputIndex, 0, sampleSize, currentTimeUs, 0)
                extractor!!.advance()
                currentTimeUs += frameIntervalUs
            }

            val info = MediaCodec.BufferInfo()
            val outputIndex = decoder?.dequeueOutputBuffer(info, 10_000) ?: return null

            if (outputIndex >= 0) {
                val image = decoder!!.getOutputImage(outputIndex)
                val yuvFrame = if (image != null) {
                    extractYUVFromImage(image)
                } else {
                    null
                }

                decoder!!.releaseOutputBuffer(outputIndex, false)
                return yuvFrame
            }
        } catch (e: Exception) {
            VirtuCamModule.log("Error decoding frame: ${e.message}")
            e.printStackTrace()
        }

        return null
    }

    private fun extractYUVFromImage(image: Image): YUVFrame? {
        try {
            val planes = image.planes
            if (planes.size < 3) return null

            val yBuffer = ByteBuffer.allocate(planes[0].buffer.remaining())
            val uBuffer = ByteBuffer.allocate(planes[1].buffer.remaining())
            val vBuffer = ByteBuffer.allocate(planes[2].buffer.remaining())

            yBuffer.put(planes[0].buffer)
            uBuffer.put(planes[1].buffer)
            vBuffer.put(planes[2].buffer)

            yBuffer.rewind()
            uBuffer.rewind()
            vBuffer.rewind()

            return YUVFrame(yBuffer, uBuffer, vBuffer, image.width, image.height)
        } catch (e: Exception) {
            VirtuCamModule.log("Error extracting YUV: ${e.message}")
            return null
        }
    }

    private fun injectYUVFrame(yuvFrame: YUVFrame) {
        try {
            val image = imageReader.imageReader.acquireLatestImage() ?: return

            try {
                val planes = image.planes
                if (planes.size >= 3) {
                    yuvFrame.yPlane.rewind()
                    yuvFrame.uPlane.rewind()
                    yuvFrame.vPlane.rewind()

                    planes[0].buffer.put(yuvFrame.yPlane)
                    planes[1].buffer.put(yuvFrame.uPlane)
                    planes[2].buffer.put(yuvFrame.vPlane)
                }
            } finally {
                image.close()
            }
        } catch (e: Exception) {
            // Silently handle minor errors
        }
    }

    override fun stop() {
        VirtuCamModule.log("Stopping VideoLoopInjector")
        running.set(false)
        frameQueue.clear()

        decoder?.stop()
        decoder?.release()
        decoder = null

        extractor?.release()
        extractor = null

        handlerThread?.quitSafely()
        handlerThread = null
        handler = null
    }
}
