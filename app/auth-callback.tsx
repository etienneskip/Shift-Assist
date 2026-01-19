
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/utils/supabase';
import { colors } from '@/styles/commonStyles';

/**
 * Auth Callback Screen
 * 
 * Handles OAuth and email confirmation redirects from Supabase.
 * This screen is called when:
 * 1. User completes OAuth flow (Google, Apple)
 * 2. User clicks email confirmation link
 * 3. User resets password
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    console.log('[AuthCallback] Screen loaded');
    console.log('[AuthCallback] Platform:', Platform.OS);
    console.log('[AuthCallback] Params:', params);

    handleAuthCallback();
  }, []);

  const handleAuthCallback = async () => {
    try {
      // For web, check URL hash for tokens
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');
        const error = hashParams.get('error');
        const errorDescription = hashParams.get('error_description');

        console.log('[AuthCallback] Hash params:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          type,
          error,
          errorDescription,
        });

        // Handle errors
        if (error) {
          console.error('[AuthCallback] Auth error:', error, errorDescription);
          setStatus('error');
          setMessage(errorDescription || error);
          setTimeout(() => {
            router.replace('/auth');
          }, 3000);
          return;
        }

        // Handle successful authentication
        if (accessToken && refreshToken) {
          console.log('[AuthCallback] Setting session from tokens...');
          
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error('[AuthCallback] Error setting session:', sessionError);
            setStatus('error');
            setMessage('Failed to authenticate. Please try again.');
            setTimeout(() => {
              router.replace('/auth');
            }, 3000);
            return;
          }

          console.log('[AuthCallback] Session set successfully');
          setStatus('success');
          
          // Determine where to redirect based on type
          if (type === 'signup') {
            setMessage('Email confirmed! Redirecting...');
            setTimeout(() => {
              router.replace('/select-role');
            }, 1500);
          } else {
            setMessage('Authentication successful! Redirecting...');
            setTimeout(() => {
              router.replace('/select-role');
            }, 1500);
          }
          return;
        }
      }

      // For native apps, check URL params
      if (Platform.OS !== 'web') {
        const accessToken = params.access_token as string;
        const refreshToken = params.refresh_token as string;
        const type = params.type as string;
        const error = params.error as string;
        const errorDescription = params.error_description as string;

        console.log('[AuthCallback] URL params:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          type,
          error,
          errorDescription,
        });

        // Handle errors
        if (error) {
          console.error('[AuthCallback] Auth error:', error, errorDescription);
          setStatus('error');
          setMessage(errorDescription || error);
          setTimeout(() => {
            router.replace('/auth');
          }, 3000);
          return;
        }

        // Handle successful authentication
        if (accessToken && refreshToken) {
          console.log('[AuthCallback] Setting session from tokens...');
          
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error('[AuthCallback] Error setting session:', sessionError);
            setStatus('error');
            setMessage('Failed to authenticate. Please try again.');
            setTimeout(() => {
              router.replace('/auth');
            }, 3000);
            return;
          }

          console.log('[AuthCallback] Session set successfully');
          setStatus('success');
          
          // Determine where to redirect based on type
          if (type === 'signup') {
            setMessage('Email confirmed! Redirecting...');
            setTimeout(() => {
              router.replace('/select-role');
            }, 1500);
          } else {
            setMessage('Authentication successful! Redirecting...');
            setTimeout(() => {
              router.replace('/select-role');
            }, 1500);
          }
          return;
        }
      }

      // If we get here, no tokens were found
      console.log('[AuthCallback] No authentication tokens found');
      setStatus('error');
      setMessage('No authentication data received. Please try again.');
      setTimeout(() => {
        router.replace('/auth');
      }, 3000);

    } catch (error) {
      console.error('[AuthCallback] Error handling callback:', error);
      setStatus('error');
      setMessage('An error occurred. Please try again.');
      setTimeout(() => {
        router.replace('/auth');
      }, 3000);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {status === 'loading' && (
          <>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.message}>{message}</Text>
          </>
        )}
        
        {status === 'success' && (
          <>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.successMessage}>{message}</Text>
          </>
        )}
        
        {status === 'error' && (
          <>
            <Text style={styles.errorIcon}>✕</Text>
            <Text style={styles.errorMessage}>{message}</Text>
            <Text style={styles.subMessage}>Redirecting to login...</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: 20,
  },
  message: {
    marginTop: 20,
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },
  successIcon: {
    fontSize: 64,
    color: colors.success || '#4CAF50',
    marginBottom: 20,
  },
  successMessage: {
    fontSize: 18,
    color: colors.success || '#4CAF50',
    textAlign: 'center',
    fontWeight: '600',
  },
  errorIcon: {
    fontSize: 64,
    color: colors.error || '#F44336',
    marginBottom: 20,
  },
  errorMessage: {
    fontSize: 18,
    color: colors.error || '#F44336',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 10,
  },
  subMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
