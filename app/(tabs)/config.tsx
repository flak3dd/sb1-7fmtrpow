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
        <ActivityIndicator size="large" color="#10b981" />
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
          <Monitor size={26} color="#10b981" />
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
          <Gauge size={26} color="#10b981" />
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
          <Repeat size={26} color="#10b981" />
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
            trackColor={{ false: '#1a1a1a', true: '#10b981' }}
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
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#999',
    marginBottom: 18,
    lineHeight: 21,
  },
  optionsContainer: {
    gap: 10,
  },
  optionButton: {
    backgroundColor: '#0f0f0f',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1a1a1a',
  },
  optionButtonActive: {
    backgroundColor: '#0a1510',
    borderColor: '#10b981',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  optionText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '600',
  },
  optionTextActive: {
    color: '#10b981',
    fontWeight: '700',
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
    color: '#999',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#0f0f0f',
    borderWidth: 2,
    borderColor: '#1a1a1a',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  infoBox: {
    marginTop: 18,
    backgroundColor: '#0f0f0f',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  infoLabel: {
    fontSize: 13,
    color: '#999',
    marginBottom: 6,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10b981',
    letterSpacing: -0.2,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f0f0f',
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  switchInfo: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  switchDescription: {
    fontSize: 14,
    color: '#999',
    lineHeight: 20,
  },
  noteTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 14,
    letterSpacing: -0.2,
  },
  noteText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 10,
    lineHeight: 22,
  },
  saveButton: {
    backgroundColor: '#10b981',
    marginHorizontal: 20,
    marginTop: 24,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  bottomPadding: {
    height: 40,
  },
});
