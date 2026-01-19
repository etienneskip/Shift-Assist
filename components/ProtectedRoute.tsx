
import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { router, useSegments } from 'expo-router';
import { colors } from '@/styles/commonStyles';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (loading) {
      console.log('[ProtectedRoute] Auth loading...');
      return;
    }

    const inAuthGroup = segments[0] === 'auth' || 
                        segments[0] === 'create-service-provider-account' ||
                        segments[0] === 'create-support-worker-account';

    console.log('[ProtectedRoute] User:', user?.email, 'In auth group:', inAuthGroup, 'Segments:', segments);

    if (!user && !inAuthGroup) {
      // User is not signed in and trying to access protected route
      console.log('[ProtectedRoute] Redirecting to auth screen');
      router.replace('/auth');
    } else if (user && inAuthGroup) {
      // User is signed in but on auth screen
      console.log('[ProtectedRoute] User logged in, redirecting to home');
      router.replace('/(tabs)/(home)/');
    }
  }, [user, loading, segments]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
