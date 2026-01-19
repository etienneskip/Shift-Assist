
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/utils/supabase';
import { colors } from '@/styles/commonStyles';

export function SupabaseStatus() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      console.log('[SupabaseStatus] Checking Supabase connection...');
      console.log('[SupabaseStatus] URL:', SUPABASE_URL);
      console.log('[SupabaseStatus] Anon key configured:', !!SUPABASE_ANON_KEY);

      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('[SupabaseStatus] Error getting session:', error);
        setStatus('error');
        return;
      }

      if (session?.user) {
        console.log('[SupabaseStatus] ✓ Connected - User ID:', session.user.id);
        setUserId(session.user.id);
        setStatus('connected');
      } else {
        console.log('[SupabaseStatus] ✓ Connected - No active session');
        setStatus('connected');
      }
    } catch (error) {
      console.error('[SupabaseStatus] Connection check failed:', error);
      setStatus('error');
    }
  };

  if (status === 'checking') {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>🔄 Checking Supabase connection...</Text>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={[styles.container, styles.error]}>
        <Text style={styles.text}>❌ Supabase connection error</Text>
        <Text style={styles.subtext}>Check console for details</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.success]}>
      <Text style={styles.text}>✓ Supabase connected</Text>
      {userId && <Text style={styles.subtext}>User ID: {userId.substring(0, 8)}...</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: 8,
  },
  success: {
    backgroundColor: '#10B98120',
    borderColor: '#10B981',
  },
  error: {
    backgroundColor: '#EF444420',
    borderColor: '#EF4444',
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  subtext: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
