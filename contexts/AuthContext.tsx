
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/utils/supabase";
import { Session, User as SupabaseUser, AuthError } from "@supabase/supabase-js";
import { router } from "expo-router";
import { registerDevice } from "@/utils/pushNotifications";
import { Platform, Linking } from "react-native";
import Constants from "expo-constants";

interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name?: string, role?: string, companyName?: string) => Promise<{ user: User | null; session: Session | null }>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Get the correct redirect URL based on platform
 */
const getRedirectUrl = (): string => {
  if (Platform.OS === 'web') {
    // For web, use the current origin
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/auth-callback`;
    }
    return 'http://localhost:8081/auth-callback';
  } else {
    // For native (iOS/Android), use the app scheme
    const scheme = Constants.expoConfig?.scheme || 'natively';
    return `${scheme}://auth-callback`;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[Auth] AuthProvider mounted, initializing Supabase Auth...');
    console.log('[Auth] Platform:', Platform.OS);
    console.log('[Auth] Redirect URL:', getRedirectUrl());
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[Auth] Initial session:', session ? 'Found' : 'Not found');
      setSession(session);
      if (session?.user) {
        setUser(mapSupabaseUser(session.user));
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[Auth] Auth state changed:', _event, session ? 'Session active' : 'No session');
      setSession(session);
      if (session?.user) {
        setUser(mapSupabaseUser(session.user));
      } else {
        setUser(null);
      }
    });

    // Handle deep links for email confirmation (native apps)
    if (Platform.OS !== 'web') {
      const handleDeepLink = (event: { url: string }) => {
        console.log('[Auth] Deep link received:', event.url);
        
        // Parse the URL to extract the token
        const url = new URL(event.url);
        const accessToken = url.searchParams.get('access_token');
        const refreshToken = url.searchParams.get('refresh_token');
        const type = url.searchParams.get('type');
        
        if (type === 'signup' && accessToken && refreshToken) {
          console.log('[Auth] Email confirmation detected, setting session...');
          supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          }).then(({ data, error }) => {
            if (error) {
              console.error('[Auth] Error setting session from deep link:', error);
            } else {
              console.log('[Auth] Session set successfully from email confirmation');
              router.replace('/select-role');
            }
          });
        }
      };

      // Listen for deep links
      const subscription = Linking.addEventListener('url', handleDeepLink);

      // Check if app was opened with a deep link
      Linking.getInitialURL().then((url) => {
        if (url) {
          console.log('[Auth] App opened with URL:', url);
          handleDeepLink({ url });
        }
      });

      return () => {
        console.log('[Auth] Cleaning up auth subscription and deep link listener');
        subscription.remove();
      };
    }

    return () => {
      console.log('[Auth] Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

  // Register device when user changes
  useEffect(() => {
    if (user) {
      console.log('[Auth] User logged in, registering device with OneSignal...');
      registerDevice(user.id).catch(error => {
        console.error('[Auth] Failed to register device:', error);
      });
    }
  }, [user]);

  const mapSupabaseUser = (supabaseUser: SupabaseUser): User => {
    return {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      name: supabaseUser.user_metadata?.name || supabaseUser.user_metadata?.full_name,
      image: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture,
    };
  };

  const fetchUser = async () => {
    try {
      console.log('[Auth] Fetching user session...');
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('[Auth] Error fetching session:', error);
        setUser(null);
        setSession(null);
        return;
      }

      if (session?.user) {
        console.log('[Auth] User session found:', session.user.email);
        setSession(session);
        setUser(mapSupabaseUser(session.user));
      } else {
        console.log('[Auth] No user session found');
        setUser(null);
        setSession(null);
      }
    } catch (error) {
      console.error("[Auth] Failed to fetch user:", error);
      setUser(null);
      setSession(null);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      console.log('[Auth] Signing in with email:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('[Auth] Sign in error:', error);
        throw error;
      }

      console.log('[Auth] Sign in successful');
      if (data.session?.user) {
        setSession(data.session);
        setUser(mapSupabaseUser(data.session.user));
      }
    } catch (error) {
      console.error("[Auth] Email sign in failed:", error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, name?: string, role?: string, companyName?: string) => {
    try {
      console.log('[Auth] Signing up with email:', email);
      console.log('[Auth] Using redirect URL:', getRedirectUrl());
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
            role: role,
            company_name: companyName,
          },
          emailRedirectTo: getRedirectUrl(),
        },
      });

      if (error) {
        console.error('[Auth] Sign up error:', error);
        throw error;
      }

      console.log('[Auth] Sign up successful, user:', data.user?.id);
      
      let mappedUser: User | null = null;
      
      if (data.session?.user) {
        setSession(data.session);
        mappedUser = mapSupabaseUser(data.session.user);
        setUser(mappedUser);
      } else if (data.user) {
        // Sometimes Supabase doesn't return a session immediately (e.g., email confirmation required)
        mappedUser = mapSupabaseUser(data.user);
        setUser(mappedUser);
        console.log('[Auth] Email confirmation required. Check your email to confirm your account.');
      }

      return { user: mappedUser, session: data.session };
    } catch (error) {
      console.error("[Auth] Email sign up failed:", error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      console.log('[Auth] Signing in with Google');
      const redirectUrl = getRedirectUrl();
      console.log('[Auth] Using redirect URL:', redirectUrl);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        console.error('[Auth] Google sign in error:', error);
        throw error;
      }

      console.log('[Auth] Google sign in initiated');
    } catch (error) {
      console.error("[Auth] Google sign in failed:", error);
      throw error;
    }
  };

  const signInWithApple = async () => {
    try {
      console.log('[Auth] Signing in with Apple');
      const redirectUrl = getRedirectUrl();
      console.log('[Auth] Using redirect URL:', redirectUrl);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        console.error('[Auth] Apple sign in error:', error);
        throw error;
      }

      console.log('[Auth] Apple sign in initiated');
    } catch (error) {
      console.error("[Auth] Apple sign in failed:", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log('[Auth] ========== LOGOUT STARTED ==========');
      
      // Step 1: Sign out from Supabase
      console.log('[Auth] Step 1: Signing out from Supabase');
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('[Auth] Supabase sign out error:', error);
      }
      
      // Step 2: Clear local state
      console.log('[Auth] Step 2: Clearing local state');
      setUser(null);
      setSession(null);
      
      console.log('[Auth] ========== LOGOUT COMPLETED ==========');
      
      // Step 3: Navigate to auth screen
      console.log('[Auth] Step 3: Redirecting to auth screen');
      setTimeout(() => {
        router.replace('/auth');
      }, 50);
      
    } catch (error) {
      console.error('[Auth] ========== LOGOUT ERROR ==========');
      console.error('[Auth] Error during logout:', error);
      
      // Even if something fails, ensure local state is cleared
      setUser(null);
      setSession(null);
      
      // Always redirect to auth screen
      console.log('[Auth] Forcing redirect to auth screen after error');
      setTimeout(() => {
        router.replace('/auth');
      }, 50);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signInWithApple,
        signOut,
        fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
