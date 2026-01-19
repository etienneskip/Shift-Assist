
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
  Alert,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedGet, BACKEND_URL } from '@/utils/api';
import { PushNotificationSettings } from '@/components/PushNotificationSettings';
import { SupabaseStatus } from '@/components/SupabaseStatus';

interface UserProfile {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    image: string | null;
    companyName?: string;
  };
  roles: string[];
  serviceProviders?: Array<{ id: string; name: string; companyName: string }>;
  supportWorkers?: Array<{ id: string; name: string; email: string }>;
}

export default function ProfileScreen() {
  const { user: authUser, loading: authLoading, signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (authUser) {
        loadUserProfile();
      } else {
        router.replace('/auth');
      }
    }
  }, [authUser, authLoading]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      console.log('[Profile] Loading user profile from:', BACKEND_URL);
      
      if (!authUser) {
        console.log('[Profile] No user found, skipping load');
        return;
      }

      const profileData = await authenticatedGet<UserProfile>('/api/users/profile');
      console.log('[Profile] Profile data:', profileData);
      setProfile(profileData);
    } catch (error) {
      console.error('[Profile] Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[Profile] User tapped Logout button');
              await signOut();
            } catch (error) {
              console.error('[Profile] Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const menuItems = [
    {
      id: 'notifications',
      icon: 'notifications',
      label: 'Push Notifications',
      onPress: () => setShowNotificationSettings(true),
    },
    {
      id: 'settings',
      icon: 'settings',
      label: 'Settings',
      onPress: () => Alert.alert('Settings', 'Settings screen coming soon'),
    },
    {
      id: 'help',
      icon: 'help',
      label: 'Help & Support',
      onPress: () => Alert.alert('Help', 'Help & Support coming soon'),
    },
    {
      id: 'logout',
      icon: 'logout',
      label: 'Logout',
      onPress: handleLogout,
      danger: true,
    },
  ];

  const renderMenuItem = (item: typeof menuItems[0], index: number) => (
    <TouchableOpacity
      key={item.id}
      style={[
        styles.menuItem,
        index === menuItems.length - 1 && styles.menuItemLast,
      ]}
      onPress={item.onPress}
      activeOpacity={0.7}
    >
      <View style={styles.menuItemLeft}>
        <IconSymbol
          ios_icon_name={item.icon}
          android_material_icon_name={item.icon}
          size={24}
          color={item.danger ? colors.danger : colors.text}
        />
        <Text style={[styles.menuItemText, item.danger && styles.menuItemTextDanger]}>
          {item.label}
        </Text>
      </View>
      <IconSymbol
        ios_icon_name="chevron.right"
        android_material_icon_name="chevron-right"
        size={20}
        color={colors.textSecondary}
      />
    </TouchableOpacity>
  );

  if (authLoading || loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  const user = profile?.user || authUser;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Image
            source={
              user?.image
                ? { uri: user.image }
                : require('@/assets/images/cc9a90bf-62a3-4bf4-b218-8a74a4786042.jpeg')
            }
            style={styles.avatar}
          />
          <Text style={styles.name}>{user?.name || 'User'}</Text>
          <Text style={styles.email}>{user?.email || ''}</Text>
          {user?.companyName && (
            <View style={styles.companyBadge}>
              <Text style={styles.companyText}>{user.companyName}</Text>
            </View>
          )}
        </View>

        <SupabaseStatus />

        {profile?.roles && profile.roles.length > 0 && (
          <View style={styles.rolesSection}>
            <Text style={styles.sectionTitle}>Roles</Text>
            <View style={styles.rolesList}>
              {profile.roles.map((role, index) => (
                <View key={index} style={styles.roleBadge}>
                  <Text style={styles.roleText}>{role}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.menuList}>
            {menuItems.map(renderMenuItem)}
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Shift Assist v1.0.0</Text>
          <Text style={styles.footerText}>Powered by Supabase</Text>
        </View>
      </ScrollView>

      <Modal
        visible={showNotificationSettings}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNotificationSettings(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Push Notifications</Text>
            <TouchableOpacity onPress={() => setShowNotificationSettings(false)}>
              <IconSymbol
                ios_icon_name="xmark"
                android_material_icon_name="close"
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
          </View>
          <PushNotificationSettings />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? 48 : 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.border,
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  companyBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  companyText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  rolesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  rolesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleBadge: {
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  menuSection: {
    marginBottom: 24,
  },
  menuList: {
    backgroundColor: colors.card,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  menuItemTextDanger: {
    color: colors.danger,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingTop: Platform.OS === 'android' ? 48 : 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
});
