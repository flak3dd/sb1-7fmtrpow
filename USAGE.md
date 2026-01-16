# VirtuCam Usage Guide

Quick reference for using your virtual camera system.

## Using the Control App

### 1. Add Media Files

**Add an Image:**
1. Open VirtuCam Control app
2. Tap "Media Library" tab
3. Tap "Add Image" button
4. Select an image from your gallery
5. Image appears in the list

**Add a Video:**
1. Tap "Add Video" button
2. Select a video file
3. Video appears with thumbnail

### 2. Select Active Media

1. Tap any media item in the list
2. Selected item gets a **green border**
3. Green checkmark badge appears
4. Only one item can be active at a time

### 3. Configure Settings

1. Tap "Configuration" tab

**Resolution:**
- Tap a preset: 720p, 1080p, 1440p, or 4K
- Or select "Custom" and enter dimensions

**Frame Rate:**
- Choose: 15, 24, 30, or 60 FPS
- Higher FPS = smoother but more CPU

**Loop Video:**
- Toggle ON to restart video automatically
- Toggle OFF to play once

2. Tap "Save Configuration"

### 4. Enable Service

1. Tap "Service Status" tab
2. Toggle the service switch ON
3. Verify active media is displayed
4. Check current configuration

**Service is now active!** ✅

## Using with Target Apps

### Chrome Webcam Test

1. Ensure service is enabled
2. Open Chrome browser
3. Go to: `https://test.webrtc.org/`
4. Tap "Start camera test"
5. Your virtual camera appears!

### Google Meet

1. Open Google Meet app
2. Start or join a meeting
3. Your virtual camera is used automatically
4. Other participants see your selected media

### Zoom

1. Open Zoom app
2. Start a meeting
3. Tap video icon
4. Virtual camera is active

### Microsoft Teams

1. Open Teams app
2. Join a meeting
3. Enable video
4. Virtual feed appears

### Discord

1. Open Discord app
2. Join a voice channel
3. Enable video
4. Virtual camera is used

## Tips & Tricks

### Performance
- Start with 720p @ 30 FPS for best performance
- Use 1080p for high quality
- Only use 4K on powerful devices
- Lower FPS if experiencing lag

### Battery Life
- Stop service when not in use
- Lower resolution to save battery
- Reduce frame rate
- Disable loop if using long videos

### File Management
- Delete unused media to save space
- Keep file sizes reasonable
- Use H.264 encoded videos
- Compress images before adding

### Troubleshooting
- If feed freezes: Restart target app
- If wrong media: Check active selection (green border)
- If poor quality: Increase resolution
- If lag: Decrease FPS or resolution

## Common Workflows

### Video Call Workflow
1. Add your video file
2. Tap to activate (green border)
3. Set resolution to 1080p
4. Set FPS to 30
5. Enable loop
6. Save configuration
7. Enable service
8. Open video call app
9. Start video

### Static Image Workflow
1. Add your image
2. Tap to activate
3. Set desired resolution
4. FPS doesn't matter (static image)
5. Disable loop (not needed)
6. Enable service
7. Open target app

### Quick Switch Media
1. Tap different media in library
2. New media is activated immediately
3. No need to restart service
4. Change applies on next camera open

## Viewing Status

### Check Service Status
1. Go to "Service Status" tab
2. See if toggle is ON (green) or OFF (red)
3. View active media details
4. Check current configuration

### Monitor in Real-time
- Status updates every 5 seconds
- Pull down to refresh
- Green badge = service active
- Red badge = service inactive

## File Paths

Media files are stored at their original locations:
- Gallery images: `/storage/emulated/0/DCIM/`
- Videos: `/storage/emulated/0/Movies/` or `/Download/`
- Document Picker: Various locations

**Note:** Don't delete or move files after adding them!

## Limitations

### What Works
✅ Images (JPG, PNG, etc.)
✅ Videos (MP4, MOV, etc.)
✅ Apps using Camera2 API
✅ Front and back camera
✅ Multiple apps simultaneously

### What Doesn't Work
❌ Apps using Camera1 API (old)
❌ Some hardware-specific camera apps
❌ Live streaming (files only)
❌ Audio passthrough (video only)

## Best Practices

1. **Test first:** Try with Chrome before important calls
2. **Check quality:** Preview in target app before joining calls
3. **Prepare backup:** Have real camera ready if issues occur
4. **Monitor battery:** Keep device charging during long sessions
5. **Update regularly:** Check for media file updates
6. **Save settings:** Use different configs for different scenarios
7. **Clean library:** Remove old media periodically

## Keyboard Shortcuts

None - this is a mobile app using touch interface.

## Data Usage

- **Control App:** Minimal (only Supabase API calls)
- **Video Streaming:** None (files are local)
- **Database Sync:** <1 MB per day

## Privacy

- All media files stay on your device
- Only metadata stored in Supabase
- No media uploaded to cloud
- Service status stored in database
- Secure HTTPS connection

## Support

If you encounter issues:
1. Check service is enabled
2. Verify media is selected (green border)
3. Restart target app
4. Check logs: `adb logcat | grep VirtuCam`
5. Review INTEGRATION_GUIDE.md
6. Check TROUBLESHOOTING section in README

## Quick Reference

| Action | Location | Steps |
|--------|----------|-------|
| Add media | Media Library | Tap "Add Image/Video" |
| Select media | Media Library | Tap item (green border) |
| Delete media | Media Library | Tap trash icon |
| Set resolution | Configuration | Select preset or custom |
| Set FPS | Configuration | Choose from 15-60 |
| Enable loop | Configuration | Toggle switch |
| Enable service | Service Status | Toggle switch ON |
| View status | Service Status | Check badge color |

---

**Ready to use!** Start with Chrome webcam test, then try your video conferencing apps. 🎥
