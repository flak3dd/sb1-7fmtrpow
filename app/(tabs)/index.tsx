import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Video, ResizeMode } from 'expo-av';
import { Plus, Trash2, Check, Video as VideoIcon } from 'lucide-react-native';
import { supabase, MediaFile } from '@/lib/supabase';

export default function MediaLibraryScreen() {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMediaFiles();
  }, []);

  const loadMediaFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('media_files')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMediaFiles(data || []);
    } catch (error) {
      console.error('Error loading media files:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Please grant media library permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      await addMediaFile(result.assets[0]);
    }
  };

  const pickVideo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        await addMediaFile({
          uri: asset.uri,
          width: 1920,
          height: 1080,
          fileName: asset.name,
          fileSize: asset.size || 0,
          mimeType: asset.mimeType,
        });
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to pick video file');
    }
  };

  const addMediaFile = async (asset: any) => {
    try {
      const fileType = asset.mimeType?.startsWith('video') ? 'video' : 'image';
      const duration = asset.duration ? Math.floor(asset.duration * 1000) : null;

      const { data, error } = await supabase
        .from('media_files')
        .insert({
          file_uri: asset.uri,
          file_name: asset.fileName || 'Untitled',
          file_type: fileType,
          duration,
          width: asset.width || 1920,
          height: asset.height || 1080,
          file_size: asset.fileSize || 0,
          thumbnail_uri: asset.uri,
          is_active: false,
        })
        .select()
        .single();

      if (error) throw error;
      await loadMediaFiles();
      Alert.alert('Success', 'Media file added successfully');
    } catch (error) {
      console.error('Error adding media file:', error);
      Alert.alert('Error', 'Failed to add media file');
    }
  };

  const setActiveMedia = async (id: string) => {
    try {
      await supabase.from('media_files').update({ is_active: false }).neq('id', id);

      const { error } = await supabase
        .from('media_files')
        .update({ is_active: true })
        .eq('id', id);

      if (error) throw error;

      const { data: statusData } = await supabase
        .from('service_status')
        .select('id')
        .limit(1)
        .single();

      if (statusData) {
        await supabase
          .from('service_status')
          .update({ selected_media_id: id })
          .eq('id', statusData.id);
      }

      await loadMediaFiles();
      Alert.alert('Success', 'Active media updated');
    } catch (error) {
      console.error('Error setting active media:', error);
      Alert.alert('Error', 'Failed to set active media');
    }
  };

  const deleteMedia = async (id: string) => {
    Alert.alert(
      'Delete Media',
      'Are you sure you want to delete this media file?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('media_files')
                .delete()
                .eq('id', id);

              if (error) throw error;
              await loadMediaFiles();
            } catch (error) {
              console.error('Error deleting media:', error);
              Alert.alert('Error', 'Failed to delete media');
            }
          },
        },
      ]
    );
  };

  const renderMediaItem = ({ item }: { item: MediaFile }) => (
    <TouchableOpacity
      style={[styles.mediaItem, item.is_active && styles.activeMediaItem]}
      onPress={() => setActiveMedia(item.id)}>
      <View style={styles.mediaPreview}>
        {item.file_type === 'image' ? (
          <Image source={{ uri: item.thumbnail_uri || item.file_uri }} style={styles.thumbnail} />
        ) : (
          <View style={styles.videoPlaceholder}>
            <Video
              source={{ uri: item.file_uri }}
              style={styles.thumbnail}
              resizeMode={ResizeMode.COVER}
              shouldPlay={false}
            />
          </View>
        )}
        {item.is_active && (
          <View style={styles.activeBadge}>
            <Check size={16} color="#fff" />
          </View>
        )}
      </View>
      <View style={styles.mediaInfo}>
        <Text style={styles.fileName} numberOfLines={1}>
          {item.file_name}
        </Text>
        <Text style={styles.mediaDetails}>
          {item.file_type.toUpperCase()} • {item.width}x{item.height}
        </Text>
        {item.duration && (
          <Text style={styles.mediaDuration}>
            Duration: {Math.floor(item.duration / 1000)}s
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteMedia(item.id)}>
        <Trash2 size={20} color="#ef4444" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Media Library</Text>
        <Text style={styles.subtitle}>Select media for virtual camera feed</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.addButton} onPress={pickImage}>
          <Plus size={20} color="#fff" />
          <Text style={styles.buttonText}>Add Image</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addButton} onPress={pickVideo}>
          <Plus size={20} color="#fff" />
          <Text style={styles.buttonText}>Add Video</Text>
        </TouchableOpacity>
      </View>

      {mediaFiles.length === 0 ? (
        <View style={styles.emptyState}>
          <VideoIcon size={64} color="#666" />
          <Text style={styles.emptyText}>No media files yet</Text>
          <Text style={styles.emptySubtext}>Add images or videos to get started</Text>
        </View>
      ) : (
        <FlatList
          data={mediaFiles}
          renderItem={renderMediaItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadMediaFiles();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  header: {
    padding: 24,
    paddingTop: 16,
    backgroundColor: '#0a0a0a',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#999',
    letterSpacing: 0.1,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#0a0a0a',
    paddingBottom: 20,
  },
  addButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  mediaItem: {
    flexDirection: 'row',
    backgroundColor: '#0f0f0f',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#1a1a1a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  activeMediaItem: {
    borderColor: '#10b981',
    backgroundColor: '#0a1510',
    shadowColor: '#10b981',
    shadowOpacity: 0.4,
  },
  mediaPreview: {
    position: 'relative',
    width: 90,
    height: 90,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#10b981',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  mediaInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  fileName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  mediaDetails: {
    fontSize: 13,
    color: '#10b981',
    marginBottom: 4,
    fontWeight: '500',
  },
  mediaDuration: {
    fontSize: 13,
    color: '#666',
  },
  deleteButton: {
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginTop: 20,
    letterSpacing: -0.3,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
});
