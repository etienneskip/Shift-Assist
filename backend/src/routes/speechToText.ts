import type { FastifyRequest, FastifyReply } from 'fastify';
import * as speechToTextService from '../services/speechToText.js';
import type { App } from '../index.js';

export function registerSpeechToTextRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * Transcribe audio from base64 encoded data
   */
  app.fastify.post('/api/speech-to-text', {
    schema: {
      description: 'Transcribe audio using Google Speech-to-Text API',
      tags: ['speech-to-text'],
      body: {
        type: 'object',
        properties: {
          audioBase64: {
            type: 'string',
            description: 'Audio file encoded in base64 format',
          },
          languageCode: {
            type: 'string',
            description: 'Language code (e.g., en-US, es-ES, fr-FR). Default: en-US',
            default: 'en-US',
          },
        },
        required: ['audioBase64'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            transcription: { type: 'string' },
            confidence: { type: 'number' },
            alternatives: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  transcript: { type: 'string' },
                  confidence: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { audioBase64, languageCode = 'en-US' } = request.body as {
      audioBase64: string;
      languageCode?: string;
    };

    app.logger.info(
      { userId: session.user.id, languageCode },
      'Processing speech-to-text request',
    );

    if (!audioBase64) {
      return reply.status(400).send({
        error: 'audioBase64 is required',
        message: 'Please provide audio data encoded in base64 format',
      });
    }

    try {
      // Validate base64 format
      try {
        Buffer.from(audioBase64, 'base64');
      } catch {
        return reply.status(400).send({
          error: 'Invalid base64 format',
          message: 'The audioBase64 parameter must be valid base64 encoded data',
        });
      }

      // Transcribe audio
      const result = await speechToTextService.transcribeAudio(audioBase64, languageCode);

      app.logger.info(
        {
          userId: session.user.id,
          transcriptionLength: result.transcription.length,
          confidence: result.confidence,
        },
        'Speech-to-text transcription completed successfully',
      );

      return {
        transcription: result.transcription,
        confidence: result.confidence,
        ...(result.alternatives && { alternatives: result.alternatives }),
      };
    } catch (error) {
      app.logger.error(
        {
          err: error,
          userId: session.user.id,
          languageCode,
        },
        'Failed to transcribe audio',
      );

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      // Check if error is due to missing credentials
      if (
        errorMessage.includes('credentials') ||
        errorMessage.includes('GOOGLE_APPLICATION_CREDENTIALS')
      ) {
        return reply.status(503).send({
          error: 'Speech-to-Text service not configured',
          message:
            'Google Cloud credentials are not properly configured. Please set GOOGLE_APPLICATION_CREDENTIALS environment variable.',
        });
      }

      return reply.status(500).send({
        error: 'Failed to transcribe audio',
        message: errorMessage,
      });
    }
  });

  /**
   * Health check endpoint for speech-to-text service
   */
  app.fastify.get('/api/speech-to-text/health', {
    schema: {
      description: 'Check if Speech-to-Text service is available',
      tags: ['speech-to-text'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            service: { type: 'string' },
            available: { type: 'boolean' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const client = speechToTextService.getSpeechToTextClient();
      const available = client !== null;

      return {
        status: available ? 'ok' : 'unavailable',
        service: 'Google Speech-to-Text',
        available,
      };
    } catch (error) {
      app.logger.error({ err: error }, 'Failed to check speech-to-text health');
      return {
        status: 'error',
        service: 'Google Speech-to-Text',
        available: false,
      };
    }
  });
}
