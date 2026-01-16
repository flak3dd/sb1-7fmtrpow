import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Monitor, Repeat, Gauge } from 'lucide-react-native';
import { supabase, ServiceStatus } from '@/lib/supabase';

const RESOLUTION_PRESETS = [
  { label: '720p (1280x720)', value: '720p', width: 1280, height: 720 },
  { label: '1080p (1920x1080)', value: '1080p', width: 1920, height: 1080 },
  { label: '1440p (2560x1440)', value: '1440p', width: 2560, height: 1440 },
  { label: '4K (3840x2160)', value: '4K', width: 3840, height: 2160 },
  { label: 'Custom', value: 'custom', width: null, height: null },
];

const FRAME_RATE_OPTIONS = [15, 24, 30, 60];

export default function ConfigurationScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<ServiceStatus | null>(null);
  const [selectedResolution, setSelectedResolution] = useState('1080p');
  const [customWidth, setCustomWidth] = useState('1920');
  const [customHeight, setCustomHeight] = useState('1080');
  const [loopEnabled, setLoopEnabled] = useState(true);
  const [frameRate, setFrameRate] = useState(30);

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      const { data, error } = await supabase
        .from('service_status')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConfig(data);
        setSelectedResolution(data.resolution_preset || '1080p');
        setCustomWidth(data.custom_width?.toString() || '1920');
        setCustomHeight(data.custom_height?.toString() || '1080');
        setLoopEnabled(data.loop_enabled);
        setFrameRate(data.frame_rate || 30);
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
      Alert.alert('Error', 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const saveConfiguration = async () => {
    setSaving(true);
    try {
      const updates = {
        resolution_preset: selectedResolution,
        custom_width: selectedResolution === 'custom' ? parseInt(customWidth) || null : null,
        custom_height: selectedResolution === 'custom' ? parseInt(customHeight) || null : null,
        loop_enabled: loopEnabled,
        frame_rate: frameRate,
        updated_at: new Date().toISOString(),
      };

      if (config) {
        const { error } = await supabase
          .from('service_status')
          .update(updates)
          .eq('id', config.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('service_status')
          .insert(updates);

        if (error) throw error;
      }

      Alert.alert('Success', 'Configuration saved successfully');
      await loadConfiguration();
    } catch (error) {
      console.error('Error saving configuration:', error);
      Alert.alert('Error', 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const getResolutionInfo = () => {
    if (selectedResolution === 'custom') {
      return `${customWidth} x ${customHeight}`;
    }
    const preset = RESOLUTION_PRESETS.find((p) => p.value === selectedResolution);
    return preset ? `${preset.width} x ${preset.height}` : '';
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
        <Text style={styles.title}>Configuration</Text>
        <Text style={styles.subtitle}>Configure virtual camera settings</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Monitor size={24} color="#4ade80" />
          <Text style={styles.sectionTitle}>Resolution</Text>
        </View>
        <Text style={styles.sectionDescription}>
          Select output resolution for the virtual camera feed
        </Text>

        <View style={styles.optionsContainer}>
          {RESOLUTION_PRESETS.map((preset) => (
            <TouchableOpacity
              key={preset.value}
              style={[
                styles.optionButton,
                selectedResolution === preset.value && styles.optionButtonActive,
              ]}
              onPress={() => setSelectedResolution(preset.value)}>
              <Text
                style={[
                  styles.optionText,
                  selectedResolution === preset.value && styles.optionTextActive,
                ]}>
                {preset.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {selectedResolution === 'custom' && (
          <View style={styles.customResolution}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Width (px)</Text>
              <TextInput
                style={styles.input}
                value={customWidth}
                onChangeText={setCustomWidth}
                keyboardType="numeric"
                placeholder="1920"
                placeholderTextColor="#666"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Height (px)</Text>
              <TextInput
                style={styles.input}
                value={customHeight}
                onChangeText={setCustomHeight}
                keyboardType="numeric"
                placeholder="1080"
                placeholderTextColor="#666"
              />
            </View>
          </View>
        )}

        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Current Resolution:</Text>
          <Text style={styles.infoValue}>{getResolutionInfo()}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Gauge size={24} color="#4ade80" />
          <Text style={styles.sectionTitle}>Frame Rate</Text>
        </View>
        <Text style={styles.sectionDescription}>
          Set the target frame rate for video playback
        </Text>

        <View style={styles.optionsContainer}>
          {FRAME_RATE_OPTIONS.map((fps) => (
            <TouchableOpacity
              key={fps}
              style={[
                styles.optionButton,
                frameRate === fps && styles.optionButtonActive,
              ]}
              onPress={() => setFrameRate(fps)}>
              <Text
                style={[
                  styles.optionText,
                  frameRate === fps && styles.optionTextActive,
                ]}>
                {fps} FPS
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Repeat size={24} color="#4ade80" />
          <Text style={styles.sectionTitle}>Playback Options</Text>
        </View>

        <View style={styles.switchRow}>
          <View style={styles.switchInfo}>
            <Text style={styles.switchLabel}>Loop Video</Text>
            <Text style={styles.switchDescription}>
              Automatically restart video when it reaches the end
            </Text>
          </View>
          <Switch
            value={loopEnabled}
            onValueChange={setLoopEnabled}
            trackColor={{ false: '#333', true: '#4ade80' }}
            thumbColor={loopEnabled ? '#fff' : '#666'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.noteTitle}>Configuration Notes</Text>
        <Text style={styles.noteText}>
          • Resolution changes will apply to the next video feed initialization
        </Text>
        <Text style={styles.noteText}>
          • Higher resolutions and frame rates require more processing power
        </Text>
        <Text style={styles.noteText}>
          • The LSPosed module must be active to apply these settings
        </Text>
        <Text style={styles.noteText}>
          • Settings are stored in Supabase and can be read by the backend module
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={saveConfiguration}
        disabled={saving}>
        {saving ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save Configuration</Text>
        )}
      </TouchableOpacity>

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
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
  },
  optionsContainer: {
    gap: 8,
  },
  optionButton: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionButtonActive: {
    backgroundColor: '#1a2a1a',
    borderColor: '#4ade80',
  },
  optionText: {
    fontSize: 16,
    color: '#888',
    fontWeight: '500',
  },
  optionTextActive: {
    color: '#4ade80',
    fontWeight: '600',
  },
  customResolution: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#fff',
  },
  infoBox: {
    marginTop: 16,
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4ade80',
  },
  infoLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4ade80',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 8,
  },
  switchInfo: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 14,
    color: '#888',
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  noteText: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: '#4ade80',
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  bottomPadding: {
    height: 40,
  },
});
