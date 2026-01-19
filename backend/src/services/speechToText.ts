import * as speech from '@google-cloud/speech';

let client: speech.SpeechClient | null = null;

export function initializeSpeechToText(): speech.SpeechClient | null {
  try {
    // Initialize client - credentials will be loaded from environment variable
    // Set GOOGLE_APPLICATION_CREDENTIALS environment variable to path of service account JSON file
    client = new speech.SpeechClient();
    console.log('Google Speech-to-Text client initialized');
    return client;
  } catch (error) {
    console.error('Error initializing Speech-to-Text client:', error);
    return null;
  }
}

export function getSpeechToTextClient(): speech.SpeechClient | null {
  if (!client) {
    return initializeSpeechToText();
  }
  return client;
}

export interface TranscriptionResult {
  transcription: string;
  confidence: number;
  alternatives?: Array<{
    transcript: string;
    confidence: number;
  }>;
}

/**
 * Transcribe audio from base64 encoded data
 */
export async function transcribeAudio(
  audioBase64: string,
  languageCode: string = 'en-US',
): Promise<TranscriptionResult> {
  const speechClient = getSpeechToTextClient();

  if (!speechClient) {
    throw new Error('Speech-to-Text client not initialized');
  }

  try {
    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audioBase64, 'base64');

    // Prepare the request
    const request = {
      audio: {
        content: audioBuffer,
      },
      config: {
        encoding: speech.protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.LINEAR16,
        sampleRateHertz: 16000,
        languageCode: languageCode,
        enableAutomaticPunctuation: true,
        model: 'default',
        useEnhanced: true,
      },
    };

    // Perform recognition
    const [response] = await speechClient.recognize(request as any);
    const transcription = response.results
      ?.map((result) => result.alternatives?.[0]?.transcript || '')
      .join('\n') || '';

    // Get confidence from the first result if available
    let confidence = 0;
    if (response.results && response.results.length > 0) {
      const firstResult = response.results[0];
      if (firstResult.alternatives && firstResult.alternatives.length > 0) {
        confidence = firstResult.alternatives[0].confidence || 0;
      }
    }

    // Collect alternatives
    const alternatives: Array<{ transcript: string; confidence: number }> = [];
    if (response.results && response.results.length > 0) {
      const firstResult = response.results[0];
      if (firstResult.alternatives && firstResult.alternatives.length > 1) {
        for (let i = 1; i < firstResult.alternatives.length; i++) {
          const alt = firstResult.alternatives[i];
          alternatives.push({
            transcript: alt.transcript || '',
            confidence: alt.confidence || 0,
          });
        }
      }
    }

    return {
      transcription,
      confidence,
      alternatives: alternatives.length > 0 ? alternatives : undefined,
    };
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw error;
  }
}

/**
 * Transcribe audio from a file path (for testing/local files)
 */
export async function transcribeAudioFile(
  filePath: string,
  languageCode: string = 'en-US',
): Promise<TranscriptionResult> {
  const fs = await import('fs');
  const audioBase64 = fs.readFileSync(filePath).toString('base64');
  return transcribeAudio(audioBase64, languageCode);
}
