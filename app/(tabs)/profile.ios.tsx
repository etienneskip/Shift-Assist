
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedGet, BACKEND_URL } from '@/utils/api';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'support_worker' | 'service_provider';
  phone: string | null;
  avatar_url: string | null;
  image?: string;
}

export default function ProfileScreen() {
  const { user: authUser, loading: authLoading, signOut } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

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

      const response = await authenticatedGet<{ user: any; roles: string[] }>('/api/users/me');
      console.log('[Profile] User profile response:', response);
      
      const profile: UserProfile = {
        id: response.user.id,
        name: response.user.name || authUser.name || 'User',
        email: response.user.email || authUser.email,
        role: response.roles?.includes('service_provider') ? 'service_provider' : 'support_worker',
        phone: response.user.phone || null,
        avatar_url: response.user.image || authUser.image || null,
        image: response.user.image || authUser.image,
      };
      
      setUserProfile(profile);
    } catch (error) {
      console.error('[Profile] Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (loggingOut) {
      console.log('[Profile] Logout already in progress, ignoring duplicate request');
      return;
    }

    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => console.log('[Profile] Logout cancelled by user')
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[Profile] ========== USER CONFIRMED LOGOUT ==========');
              setLoggingOut(true);
              
              // Call signOut from auth context (this handles everything)
              console.log('[Profile] Calling signOut from AuthContext');
              await signOut();
              
              console.log('[Profile] SignOut completed successfully');
              
            } catch (error) {
              console.error('[Profile] ========== LOGOUT ERROR IN PROFILE ==========');
              console.error('[Profile] Error during logout:', error);
              
              // Even if there's an error, force navigation to auth
              console.log('[Profile] Forcing navigation to auth screen after error');
              router.replace('/auth');
              
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  const isServiceProvider = userProfile?.role === 'service_provider';

  const supportWorkerMenuItems = [
    {
      icon: 'calendar',
      label: 'My Shifts',
      route: '/(tabs)/(home)/',
    },
    {
      icon: 'calendar.badge.clock',
      label: 'Calendar',
      route: '/(tabs)/calendar',
    },
    {
      icon: 'doc.text',
      label: 'My Documents',
      route: '/(tabs)/documents',
    },
    {
      icon: 'briefcase',
      label: 'Job Board',
      route: '/job-board',
    },
    {
      icon: 'bell',
      label: 'Notifications',
      route: '/notifications',
    },
  ];

  const serviceProviderMenuItems = [
    {
      icon: 'calendar',
      label: 'Shifts',
      route: '/(tabs)/(home)/',
    },
    {
      icon: 'calendar.badge.clock',
      label: 'Calendar',
      route: '/(tabs)/calendar',
    },
    {
      icon: 'doc.text',
      label: 'Document Hub',
      route: '/(tabs)/documents',
    },
    {
      icon: 'person.3',
      label: 'Support Workers',
      route: '/support-workers',
    },
    {
      icon: 'bell',
      label: 'Notifications',
      route: '/notifications',
    },
  ];

  const menuItems = isServiceProvider ? serviceProviderMenuItems : supportWorkerMenuItems;

  const renderMenuItem = (item: any, index: number) => (
    <TouchableOpacity
      key={index}
      style={styles.menuItem}
      onPress={() => router.push(item.route)}
      activeOpacity={0.7}
    >
      <View style={styles.menuItemLeft}>
        <IconSymbol 
          ios_icon_name={item.icon} 
          android_material_icon_name={item.icon} 
          size={24} 
          color={colors.primary} 
        />
        <Text style={styles.menuItemText}>{item.label}</Text>
      </View>
      <IconSymbol 
        ios_icon_name="chevron.right" 
        android_material_icon_name="chevron-right" 
        size={20} 
        color={colors.textSecondary} 
      />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileCard}>
          <Image
            source={
              userProfile?.avatar_url
                ? { uri: userProfile.avatar_url }
                : require('@/assets/images/cc9a90bf-62a3-4bf4-b218-8a74a4786042.jpeg')
            }
            style={styles.avatar}
          />
          <Text style={styles.userName}>{userProfile?.name || authUser?.name || 'Guest User'}</Text>
          <Text style={styles.userEmail}>{userProfile?.email || authUser?.email || 'Not logged in'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>
              {userProfile?.role === 'support_worker' ? 'Support Worker' : 'Service Provider'}
            </Text>
          </View>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Menu</Text>
          {menuItems.map(renderMenuItem)}
        </View>

        <TouchableOpacity 
          style={[styles.logoutButton, loggingOut && styles.logoutButtonDisabled]} 
          onPress={handleLogout}
          disabled={loggingOut}
        >
          <IconSymbol 
            ios_icon_name="arrow.right.square" 
            android_material_icon_name="logout" 
            size={20} 
            color={loggingOut ? colors.textSecondary : colors.danger} 
          />
          <Text style={[styles.logoutButtonText, loggingOut && styles.logoutButtonTextDisabled]}>
            {loggingOut ? 'Logging out...' : 'Logout'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1E3A5F',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.border,
    marginBottom: 12,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  menuSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: colors.text,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  logoutButtonDisabled: {
    opacity: 0.5,
    borderColor: colors.textSecondary,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.danger,
  },
  logoutButtonTextDisabled: {
    color: colors.textSecondary,
  },
});
