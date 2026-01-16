module.exports = {
  expo: {
    name: 'VirtuCam Control',
    slug: 'virtucam-control',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'virtucam',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
    android: {
      package: 'com.virtucam.control',
      permissions: [
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
        'READ_MEDIA_IMAGES',
        'READ_MEDIA_VIDEO',
      ],
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.virtucam.control',
    },
    web: {
      bundler: 'metro',
      output: 'single',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      'expo-font',
      'expo-web-browser',
      [
        'expo-image-picker',
        {
          photosPermission:
            'Allow VirtuCam to access your photos to select media files for the virtual camera feed.',
          cameraPermission: 'Allow VirtuCam to access your camera for potential future features.',
        },
      ],
      [
        'expo-av',
        {
          microphonePermission: 'Allow VirtuCam to access audio for video playback features.',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
  },
};
