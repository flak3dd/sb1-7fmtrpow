import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import {
  Power,
  CheckCircle,
  XCircle,
  Video as VideoIcon,
  Monitor,
  Gauge,
  Repeat,
  Info,
} from 'lucide-react-native';
import { supabase, ServiceStatus, MediaFile } from '@/lib/supabase';

export default function ServiceStatusScreen() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [activeMedia, setActiveMedia] = useState<MediaFile | null>(null);
  const [serviceEnabled, setServiceEnabled] = useState(false);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    try {
      const { data: statusData, error: statusError } = await supabase
        .from('service_status')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (statusError) throw statusError;

      if (statusData) {
        setStatus(statusData);
        setServiceEnabled(statusData.is_enabled);

        if (statusData.selected_media_id) {
          const { data: mediaData, error: mediaError } = await supabase
            .from('media_files')
            .select('*')
            .eq('id', statusData.selected_media_id)
            .maybeSingle();

          if (!mediaError && mediaData) {
            setActiveMedia(mediaData);
          }
        } else {
          setActiveMedia(null);
        }
      }
    } catch (error) {
      console.error('Error loading status:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleService = async (enabled: boolean) => {
    if (enabled && !activeMedia) {
      Alert.alert(
        'No Media Selected',
        'Please select a media file in the Media Library before enabling the service.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      if (status) {
        const { error } = await supabase
          .from('service_status')
          .update({
            is_enabled: enabled,
            updated_at: new Date().toISOString(),
          })
          .eq('id', status.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('service_status')
          .insert({
            is_enabled: enabled,
          });

        if (error) throw error;
      }

      setServiceEnabled(enabled);
      await loadStatus();

      if (enabled) {
        Alert.alert('Service Enabled', 'Virtual camera service is now active');
      } else {
        Alert.alert('Service Disabled', 'Virtual camera service has been stopped');
      }
    } catch (error) {
      console.error('Error toggling service:', error);
      Alert.alert('Error', 'Failed to toggle service status');
    }
  };

  const getResolutionDisplay = () => {
    if (!status) return 'Not configured';
    if (status.resolution_preset === 'custom' && status.custom_width && status.custom_height) {
      return `${status.custom_width} x ${status.custom_height}`;
    }
    const presets: Record<string, string> = {
      '720p': '1280 x 720',
      '1080p': '1920 x 1080',
      '1440p': '2560 x 1440',
      '4K': '3840 x 2160',
    };
    return presets[status.resolution_preset] || status.resolution_preset;
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4ade80" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Service Status</Text>
        <Text style={styles.subtitle}>Virtual camera control panel</Text>
      </View>

      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Power size={32} color={serviceEnabled ? '#4ade80' : '#666'} />
          <View style={styles.statusInfo}>
            <Text style={styles.statusTitle}>Virtual Camera Service</Text>
            <View style={styles.statusBadge}>
              {serviceEnabled ? (
                <>
                  <CheckCircle size={16} color="#4ade80" />
                  <Text style={[styles.statusText, styles.statusActive]}>Active</Text>
                </>
              ) : (
                <>
                  <XCircle size={16} color="#ef4444" />
                  <Text style={[styles.statusText, styles.statusInactive]}>Inactive</Text>
                </>
              )}
            </View>
          </View>
          <Switch
            value={serviceEnabled}
            onValueChange={toggleService}
            trackColor={{ false: '#333', true: '#4ade80' }}
            thumbColor={serviceEnabled ? '#fff' : '#666'}
          />
        </View>

        {serviceEnabled && (
          <View style={styles.statusDescription}>
            <Info size={16} color="#4ade80" />
            <Text style={styles.descriptionText}>
              The virtual camera is currently broadcasting to target applications
            </Text>
          </View>
        )}
      </View>

      {activeMedia && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <VideoIcon size={24} color="#4ade80" />
            <Text style={styles.sectionTitle}>Active Media</Text>
          </View>

          <View style={styles.mediaCard}>
            <View style={styles.mediaPreview}>
              {activeMedia.file_type === 'image' ? (
                <Image
                  source={{ uri: activeMedia.thumbnail_uri || activeMedia.file_uri }}
                  style={styles.thumbnail}
                />
              ) : (
                <Video
                  source={{ uri: activeMedia.file_uri }}
                  style={styles.thumbnail}
                  resizeMode={ResizeMode.COVER}
                  shouldPlay={false}
                />
              )}
            </View>
            <View style={styles.mediaDetails}>
              <Text style={styles.mediaName}>{activeMedia.file_name}</Text>
              <Text style={styles.mediaType}>
                {activeMedia.file_type.toUpperCase()}
              </Text>
              <Text style={styles.mediaDimensions}>
                {activeMedia.width} x {activeMedia.height}
              </Text>
              {activeMedia.duration && (
                <Text style={styles.mediaDuration}>
                  Duration: {Math.floor(activeMedia.duration / 1000)}s
                </Text>
              )}
            </View>
          </View>
        </View>
      )}

      {!activeMedia && (
        <View style={styles.warningCard}>
          <Info size={24} color="#f59e0b" />
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>No Media Selected</Text>
            <Text style={styles.warningText}>
              Go to Media Library to select a video or image for the virtual camera feed
            </Text>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Monitor size={24} color="#4ade80" />
          <Text style={styles.sectionTitle}>Current Configuration</Text>
        </View>

        <View style={styles.configList}>
          <View style={styles.configItem}>
            <View style={styles.configIcon}>
              <Monitor size={20} color="#888" />
            </View>
            <View style={styles.configInfo}>
              <Text style={styles.configLabel}>Resolution</Text>
              <Text style={styles.configValue}>{getResolutionDisplay()}</Text>
            </View>
          </View>

          <View style={styles.configItem}>
            <View style={styles.configIcon}>
              <Gauge size={20} color="#888" />
            </View>
            <View style={styles.configInfo}>
              <Text style={styles.configLabel}>Frame Rate</Text>
              <Text style={styles.configValue}>{status?.frame_rate || 30} FPS</Text>
            </View>
          </View>

          <View style={styles.configItem}>
            <View style={styles.configIcon}>
              <Repeat size={20} color="#888" />
            </View>
            <View style={styles.configInfo}>
              <Text style={styles.configLabel}>Loop Playback</Text>
              <Text style={styles.configValue}>
                {status?.loop_enabled ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.infoTitle}>Integration Instructions</Text>
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            1. Ensure the LSPosed module is installed and activated on your device
          </Text>
          <Text style={styles.infoText}>
            2. Select a media file from the Media Library tab
          </Text>
          <Text style={styles.infoText}>
            3. Configure resolution and playback settings in the Configuration tab
          </Text>
          <Text style={styles.infoText}>
            4. Enable the virtual camera service using the toggle above
          </Text>
          <Text style={styles.infoText}>
            5. The LSPosed module will read these settings from the Supabase database
          </Text>
          <Text style={styles.infoText}>
            6. Open target apps (Chrome, Camera, etc.) to use the virtual camera
          </Text>
        </View>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
  },
  statusCard: {
    margin: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#333',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusActive: {
    color: '#4ade80',
  },
  statusInactive: {
    color: '#ef4444',
  },
  statusDescription: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    padding: 12,
    backgroundColor: '#1a2a1a',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4ade80',
  },
  descriptionText: {
    flex: 1,
    fontSize: 14,
    color: '#4ade80',
    lineHeight: 20,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  mediaCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  mediaPreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#333',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  mediaDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  mediaName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  mediaType: {
    fontSize: 12,
    color: '#4ade80',
    marginBottom: 4,
  },
  mediaDimensions: {
    fontSize: 14,
    color: '#888',
    marginBottom: 2,
  },
  mediaDuration: {
    fontSize: 14,
    color: '#666',
  },
  warningCard: {
    flexDirection: 'row',
    margin: 20,
    backgroundColor: '#2a1a0a',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f59e0b',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    color: '#d97706',
    lineHeight: 20,
  },
  configList: {
    gap: 12,
  },
  configItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 8,
    gap: 12,
  },
  configIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  configInfo: {
    flex: 1,
  },
  configLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  configValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  infoBox: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#888',
    lineHeight: 20,
  },
  bottomPadding: {
    height: 40,
  },
});
