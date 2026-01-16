package com.virtucam.lsposed.video

import android.graphics.Bitmap
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import com.virtucam.lsposed.VirtuCamModule
import java.nio.ByteBuffer

class VideoFrameExtractor(private val videoPath: String) {

    private val extractor = MediaExtractor()
    private var decoder: MediaCodec? = null
    private var width = 0
    private var height = 0
    private var colorFormat = 0
    private var isEOS = false

    init {
        try {
            extractor.setDataSource(videoPath)
            setupDecoder()
            VirtuCamModule.log("VideoFrameExtractor initialized for: $videoPath")
        } catch (e: Exception) {
            VirtuCamModule.log("Error initializing VideoFrameExtractor: ${e.message}")
            e.printStackTrace()
        }
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

                if (format.containsKey(MediaFormat.KEY_COLOR_FORMAT)) {
                    colorFormat = format.getInteger(MediaFormat.KEY_COLOR_FORMAT)
                }

                VirtuCamModule.log("Video track found:")
                VirtuCamModule.log("  MIME: $mime")
                VirtuCamModule.log("  Size: ${width}x${height}")
                VirtuCamModule.log("  Color format: $colorFormat")

                decoder = MediaCodec.createDecoderByType(mime)
                decoder?.configure(format, null, null, 0)
                decoder?.start()

                VirtuCamModule.log("Decoder started")
                break
            }
        }

        if (decoder == null) {
            VirtuCamModule.log("No video track found in file")
        }
    }

    fun getNextFrame(): Bitmap? {
        val decoder = this.decoder ?: return null

        if (isEOS) {
            return null
        }

        try {
            // Feed input buffer
            val inputBufferIndex = decoder.dequeueInputBuffer(10_000)
            if (inputBufferIndex >= 0) {
                val inputBuffer = decoder.getInputBuffer(inputBufferIndex)
                if (inputBuffer != null) {
                    val sampleSize = extractor.readSampleData(inputBuffer, 0)

                    if (sampleSize > 0) {
                        decoder.queueInputBuffer(
                            inputBufferIndex,
                            0,
                            sampleSize,
                            extractor.sampleTime,
                            0
                        )
                        extractor.advance()
                    } else {
                        // End of stream
                        decoder.queueInputBuffer(
                            inputBufferIndex,
                            0,
                            0,
                            0,
                            MediaCodec.BUFFER_FLAG_END_OF_STREAM
                        )
                        isEOS = true
                    }
                }
            }

            // Get output buffer
            val bufferInfo = MediaCodec.BufferInfo()
            val outputBufferIndex = decoder.dequeueOutputBuffer(bufferInfo, 10_000)

            if (outputBufferIndex >= 0) {
                val outputBuffer = decoder.getOutputBuffer(outputBufferIndex)
                val bitmap = bufferToBitmap(outputBuffer, width, height, colorFormat)
                decoder.releaseOutputBuffer(outputBufferIndex, false)
                return bitmap
            } else if (outputBufferIndex == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
                val newFormat = decoder.outputFormat
                VirtuCamModule.log("Decoder output format changed: $newFormat")
            }

        } catch (e: Exception) {
            VirtuCamModule.log("Error getting next frame: ${e.message}")
            e.printStackTrace()
        }

        return null
    }

    private fun bufferToBitmap(
        buffer: ByteBuffer?,
        width: Int,
        height: Int,
        colorFormat: Int
    ): Bitmap? {
        if (buffer == null) return null

        try {
            // Create a simple bitmap
            // Note: This is a simplified implementation
            // Real implementation would need to handle different color formats
            val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)

            // For now, return a blank bitmap
            // TODO: Implement proper YUV to RGB conversion based on colorFormat
            return bitmap

        } catch (e: Exception) {
            VirtuCamModule.log("Error converting buffer to bitmap: ${e.message}")
            return null
        }
    }

    fun seekTo(timeUs: Long) {
        try {
            extractor.seekTo(timeUs, MediaExtractor.SEEK_TO_CLOSEST_SYNC)
            decoder?.flush()
            isEOS = false
            VirtuCamModule.log("Seeked to: ${timeUs}us")
        } catch (e: Exception) {
            VirtuCamModule.log("Error seeking: ${e.message}")
        }
    }

    fun release() {
        try {
            decoder?.stop()
            decoder?.release()
            decoder = null
            extractor.release()
            VirtuCamModule.log("VideoFrameExtractor released")
        } catch (e: Exception) {
            VirtuCamModule.log("Error releasing VideoFrameExtractor: ${e.message}")
        }
    }
}
