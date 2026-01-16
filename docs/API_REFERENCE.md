# VirtuCam API Reference

This document provides API endpoints and data structures for integrating with the VirtuCam system.

## Supabase REST API Base URL

```
https://pkruoiiwqygqkagwtobe.supabase.co/rest/v1
```

## Authentication

All requests require these headers:

```
apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Endpoints

### Get Service Status

**GET** `/service_status?limit=1`

Returns the current service configuration.

**Response:**
```json
[
  {
    "id": "uuid",
    "is_enabled": true,
    "selected_media_id": "uuid",
    "resolution_preset": "1080p",
    "custom_width": null,
    "custom_height": null,
    "loop_enabled": true,
    "frame_rate": 30,
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

### Get Active Media

**GET** `/media_files?is_active=eq.true&limit=1`

Returns the currently active media file.

**Response:**
```json
[
  {
    "id": "uuid",
    "file_uri": "/storage/emulated/0/DCIM/video.mp4",
    "file_name": "video.mp4",
    "file_type": "video",
    "duration": 15000,
    "width": 1920,
    "height": 1080,
    "file_size": 5242880,
    "thumbnail_uri": "/storage/emulated/0/DCIM/.thumbnails/video.jpg",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

### Get Media by ID

**GET** `/media_files?id=eq.{uuid}`

Returns a specific media file by ID.

### Get All Media Files

**GET** `/media_files?order=created_at.desc`

Returns all media files, ordered by creation date.

### Update Service Status

**PATCH** `/service_status?id=eq.{uuid}`

Update service configuration.

**Request Body:**
```json
{
  "is_enabled": false,
  "frame_rate": 60
}
```

## Query Parameters

### Filtering

- **Equality:** `?column=eq.value`
- **Greater than:** `?column=gt.value`
- **Less than:** `?column=lt.value`
- **Like:** `?column=like.*pattern*`
- **Is null:** `?column=is.null`
- **Not null:** `?column=not.is.null`

### Ordering

- **Ascending:** `?order=column.asc`
- **Descending:** `?order=column.desc`

### Limiting

- **Limit:** `?limit=10`
- **Offset:** `?offset=20`

## Data Types

### ServiceStatus

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| is_enabled | boolean | Service active state |
| selected_media_id | uuid | FK to media_files |
| resolution_preset | string | '720p', '1080p', '1440p', '4K', 'custom' |
| custom_width | integer | Custom width in pixels (nullable) |
| custom_height | integer | Custom height in pixels (nullable) |
| loop_enabled | boolean | Loop video playback |
| frame_rate | integer | Target FPS (15, 24, 30, 60) |
| updated_at | timestamp | Last modification time |

### MediaFile

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| file_uri | string | Local file path |
| file_name | string | Original filename |
| file_type | string | 'video' or 'image' |
| duration | integer | Duration in ms (null for images) |
| width | integer | Media width in pixels |
| height | integer | Media height in pixels |
| file_size | bigint | File size in bytes |
| thumbnail_uri | string | Path to thumbnail (nullable) |
| is_active | boolean | Currently selected media |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Last modification time |

## Resolution Presets

| Preset | Width | Height | Aspect Ratio |
|--------|-------|--------|--------------|
| 720p | 1280 | 720 | 16:9 |
| 1080p | 1920 | 1080 | 16:9 |
| 1440p | 2560 | 1440 | 16:9 |
| 4K | 3840 | 2160 | 16:9 |
| custom | user-defined | user-defined | any |

## Frame Rate Options

- 15 FPS - Low bandwidth/performance
- 24 FPS - Cinematic
- 30 FPS - Standard video
- 60 FPS - High-quality/smooth

## Example cURL Requests

### Get Service Status
```bash
curl -X GET \
  'https://pkruoiiwqygqkagwtobe.supabase.co/rest/v1/service_status?limit=1' \
  -H 'apikey: YOUR_API_KEY' \
  -H 'Authorization: Bearer YOUR_API_KEY'
```

### Get Active Media
```bash
curl -X GET \
  'https://pkruoiiwqygqkagwtobe.supabase.co/rest/v1/media_files?is_active=eq.true' \
  -H 'apikey: YOUR_API_KEY' \
  -H 'Authorization: Bearer YOUR_API_KEY'
```

### Enable Service
```bash
curl -X PATCH \
  'https://pkruoiiwqygqkagwtobe.supabase.co/rest/v1/service_status?id=eq.UUID' \
  -H 'apikey: YOUR_API_KEY' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"is_enabled": true}'
```

## Error Responses

### 400 Bad Request
```json
{
  "message": "Invalid request parameters",
  "details": "..."
}
```

### 404 Not Found
```json
{
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "message": "Internal server error",
  "details": "..."
}
```

## Rate Limiting

Supabase has rate limits based on your plan:
- Free tier: ~100 requests per second
- Paid tiers: Higher limits

For LSPosed module, consider:
- Caching configuration locally
- Polling interval: 5-10 seconds (not every frame)
- Only fetch when service is enabled

## Best Practices

1. **Cache Configuration:** Don't fetch config on every camera frame
2. **Poll Periodically:** Check for updates every 5-10 seconds
3. **Handle Errors:** Gracefully fall back if API is unavailable
4. **Validate Data:** Check for null values before using
5. **File Paths:** Ensure media file exists before loading
