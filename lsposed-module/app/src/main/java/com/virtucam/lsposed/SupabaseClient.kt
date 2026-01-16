package com.virtucam.lsposed

import com.google.gson.Gson
import com.google.gson.annotations.SerializedName
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit

data class ServiceStatus(
    val id: String,
    @SerializedName("is_enabled") val isEnabled: Boolean,
    @SerializedName("selected_media_id") val selectedMediaId: String?,
    @SerializedName("resolution_preset") val resolutionPreset: String,
    @SerializedName("custom_width") val customWidth: Int?,
    @SerializedName("custom_height") val customHeight: Int?,
    @SerializedName("loop_enabled") val loopEnabled: Boolean,
    @SerializedName("frame_rate") val frameRate: Int,
    @SerializedName("updated_at") val updatedAt: String
)

data class MediaFile(
    val id: String,
    @SerializedName("file_uri") val fileUri: String,
    @SerializedName("file_name") val fileName: String,
    @SerializedName("file_type") val fileType: String,
    val duration: Int?,
    val width: Int,
    val height: Int,
    @SerializedName("file_size") val fileSize: Long,
    @SerializedName("thumbnail_uri") val thumbnailUri: String?,
    @SerializedName("is_active") val isActive: Boolean
)

class SupabaseClient {
    private val client = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .writeTimeout(10, TimeUnit.SECONDS)
        .retryOnConnectionFailure(true)
        .build()

    private val gson = Gson()

    companion object {
        private const val SUPABASE_URL = "https://pkruoiiwqygqkagwtobe.supabase.co"
        private const val SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrcnVvaWl3cXlncWthZ3d0b2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NjIwNzEsImV4cCI6MjA4NDEzODA3MX0._hAjrJDDXFkgDKEl8a7NC_r7oI2m4y3BKXBSSriE-NA"
    }

    fun getServiceStatus(): ServiceStatus? {
        return try {
            val request = Request.Builder()
                .url("$SUPABASE_URL/rest/v1/service_status?limit=1")
                .addHeader("apikey", SUPABASE_KEY)
                .addHeader("Authorization", "Bearer $SUPABASE_KEY")
                .addHeader("Content-Type", "application/json")
                .get()
                .build()

            client.newCall(request).execute().use { response ->
                if (response.isSuccessful) {
                    val body = response.body?.string()
                    if (body != null) {
                        val statuses = gson.fromJson(body, Array<ServiceStatus>::class.java)
                        statuses.firstOrNull()
                    } else null
                } else {
                    VirtuCamModule.log("Failed to get service status: ${response.code}")
                    null
                }
            }
        } catch (e: Exception) {
            VirtuCamModule.log("Error in getServiceStatus: ${e.message}")
            e.printStackTrace()
            null
        }
    }

    fun getActiveMedia(): MediaFile? {
        return try {
            val request = Request.Builder()
                .url("$SUPABASE_URL/rest/v1/media_files?is_active=eq.true&limit=1")
                .addHeader("apikey", SUPABASE_KEY)
                .addHeader("Authorization", "Bearer $SUPABASE_KEY")
                .addHeader("Content-Type", "application/json")
                .get()
                .build()

            client.newCall(request).execute().use { response ->
                if (response.isSuccessful) {
                    val body = response.body?.string()
                    if (body != null) {
                        val files = gson.fromJson(body, Array<MediaFile>::class.java)
                        files.firstOrNull()
                    } else null
                } else {
                    VirtuCamModule.log("Failed to get active media: ${response.code}")
                    null
                }
            }
        } catch (e: Exception) {
            VirtuCamModule.log("Error in getActiveMedia: ${e.message}")
            e.printStackTrace()
            null
        }
    }

    fun getMediaById(mediaId: String): MediaFile? {
        return try {
            val request = Request.Builder()
                .url("$SUPABASE_URL/rest/v1/media_files?id=eq.$mediaId&limit=1")
                .addHeader("apikey", SUPABASE_KEY)
                .addHeader("Authorization", "Bearer $SUPABASE_KEY")
                .addHeader("Content-Type", "application/json")
                .get()
                .build()

            client.newCall(request).execute().use { response ->
                if (response.isSuccessful) {
                    val body = response.body?.string()
                    if (body != null) {
                        val files = gson.fromJson(body, Array<MediaFile>::class.java)
                        files.firstOrNull()
                    } else null
                } else null
            }
        } catch (e: Exception) {
            VirtuCamModule.log("Error in getMediaById: ${e.message}")
            null
        }
    }
}
