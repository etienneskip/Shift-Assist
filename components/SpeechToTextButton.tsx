
import React, { useState } from 'react';
import {
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { IconSymbol } from './IconSymbol';
import { colors } from '@/styles/commonStyles';
import Constants from 'expo-constants';
import { getBearerToken } from '@/utils/supabase';
import { createSpeechToTextLog } from '@/utils/supabaseHelpers';
import { useAuth } from '@/contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';

interface SpeechToTextButtonProps {
  onTranscription: (text: string) => void;
  style?: ViewStyle;
  size?: number;
  color?: string;
}

const WHISPER_API_ENDPOINT = Constants.expoConfig?.extra?.whisperApiEndpoint || '';

export function SpeechToTextButton({
  onTranscription,
  style,
  size = 24,
  color = colors.primary,
}: SpeechToTextButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const { user } = useAuth();

  const handleRecordAudio = async () => {
    try {
      console.log('[SpeechToText] Starting audio recording...');
      setIsRecording(true);

      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant media library access to record audio.');
        return;
      }

      // For now, we'll use the image picker to select an audio file
      // In a production app, you'd use expo-av to record audio
      Alert.alert(
        'Record Audio',
        'Please select an audio file to transcribe. In production, this would record audio directly.',
        [
          {
            text: 'Select Audio File',
            onPress: async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['videos'], // Audio files are often in video category
                allowsEditing: false,
              });

              if (!result.canceled && result.assets[0]) {
                await transcribeAudio(result.assets[0].uri);
              }
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('[SpeechToText] Error recording audio:', error);
      Alert.alert('Error', 'Failed to record audio. Please try again.');
    } finally {
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioUri: string) => {
    try {
      console.log('[SpeechToText] Transcribing audio:', audioUri);
      setIsRecording(true);

      if (!WHISPER_API_ENDPOINT) {
        throw new Error('Whisper API endpoint not configured');
      }

      // Create FormData for audio upload
      const formData = new FormData();
      const filename = audioUri.split('/').pop() || 'audio.m4a';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `audio/${match[1]}` : 'audio/m4a';

      formData.append('audio', {
        uri: audioUri,
        name: filename,
        type,
      } as any);

      // Get auth token
      const token = await getBearerToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      // Call Whisper API
      console.log('[SpeechToText] Calling Whisper API:', WHISPER_API_ENDPOINT);
      const response = await fetch(WHISPER_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[SpeechToText] API error:', response.status, errorText);
        throw new Error(`Transcription failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('[SpeechToText] Transcription result:', result);

      if (result.text) {
        // Log the transcription to Supabase
        if (user) {
          try {
            await createSpeechToTextLog({
              user_id: user.id,
              transcription: result.text,
              audio_url: audioUri,
              duration_seconds: result.duration || 0,
            });
          } catch (logError) {
            console.warn('[SpeechToText] Failed to log transcription:', logError);
          }
        }

        // Call the callback with the transcribed text
        onTranscription(result.text);
        Alert.alert('Success', 'Audio transcribed successfully!');
      } else {
        throw new Error('No transcription text received');
      }
    } catch (error) {
      console.error('[SpeechToText] Transcription error:', error);
      Alert.alert('Error', 'Failed to transcribe audio. Please try again.');
    } finally {
      setIsRecording(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={handleRecordAudio}
      disabled={isRecording}
      activeOpacity={0.7}
    >
      {isRecording ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <IconSymbol
          ios_icon_name="mic.fill"
          android_material_icon_name="mic"
          size={size}
          color={color}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
