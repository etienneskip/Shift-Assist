
import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import Constants from "expo-constants";

// Backend URL is configured in app.json under expo.extra.backendUrl
const API_URL = Constants.expoConfig?.extra?.backendUrl || "https://gemvwbnnsvbmxyqhxrry8udv8c5q77ms.app.specular.dev";

console.log('[Auth] Backend URL configured:', API_URL);

const BEARER_TOKEN_KEY = "natively_bearer_token";
const STORAGE_PREFIX = "natively";

// Platform-specific storage: localStorage for web, SecureStore for native
const storage = Platform.OS === "web"
  ? {
      getItem: (key: string) => localStorage.getItem(key),
      setItem: (key: string, value: string) => localStorage.setItem(key, value),
      deleteItem: (key: string) => localStorage.removeItem(key),
    }
  : SecureStore;

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [
    expoClient({
      scheme: "natively",
      storagePrefix: STORAGE_PREFIX,
      storage,
    }),
  ],
  // On web, use bearer token for authenticated requests
  ...(Platform.OS === "web" && {
    fetchOptions: {
      auth: {
        type: "Bearer" as const,
        token: () => localStorage.getItem(BEARER_TOKEN_KEY) || "",
      },
    },
  }),
});

export function storeWebBearerToken(token: string) {
  if (Platform.OS === "web") {
    localStorage.setItem(BEARER_TOKEN_KEY, token);
    console.log('[Auth] Stored web bearer token');
  }
}

export async function clearAuthTokens() {
  console.log('[Auth] ========== CLEARING ALL AUTH TOKENS ==========');
  
  if (Platform.OS === "web") {
    console.log('[Auth] Platform: WEB');
    
    try {
      // Get all localStorage keys
      const allKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          allKeys.push(key);
        }
      }
      
      console.log('[Auth] Total localStorage keys before clear:', allKeys.length);
      
      // Clear all auth-related keys
      const keysToRemove: string[] = [];
      for (const key of allKeys) {
        // Remove any key that might contain auth data
        if (
          key.startsWith(STORAGE_PREFIX) || 
          key.includes('better-auth') || 
          key.includes('session') ||
          key.includes('token') ||
          key.includes('auth') ||
          key === BEARER_TOKEN_KEY
        ) {
          keysToRemove.push(key);
        }
      }
      
      console.log('[Auth] Keys to remove:', keysToRemove.length, keysToRemove);
      
      // Remove all identified keys
      for (const key of keysToRemove) {
        try {
          localStorage.removeItem(key);
          console.log('[Auth] ✓ Removed web key:', key);
        } catch (error) {
          console.error('[Auth] ✗ Failed to remove key:', key, error);
        }
      }
      
      // Verify keys are removed
      const remainingKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith(STORAGE_PREFIX) || key.includes('auth') || key.includes('token'))) {
          remainingKeys.push(key);
        }
      }
      
      if (remainingKeys.length > 0) {
        console.warn('[Auth] Warning: Some auth keys still remain:', remainingKeys);
        // Force remove them
        for (const key of remainingKeys) {
          localStorage.removeItem(key);
        }
      }
      
      console.log('[Auth] Web token clearing completed');
      
    } catch (error) {
      console.error('[Auth] Error during web token clearing:', error);
      // Nuclear option: clear everything if there's an error
      try {
        localStorage.clear();
        console.log('[Auth] Cleared entire localStorage due to error');
      } catch (clearError) {
        console.error('[Auth] Failed to clear localStorage:', clearError);
      }
    }
    
  } else {
    console.log('[Auth] Platform: NATIVE');
    
    // Clear native secure store tokens
    const keysToDelete = [
      `${STORAGE_PREFIX}_session`,
      `${STORAGE_PREFIX}_token`,
      `${STORAGE_PREFIX}_refresh_token`,
      `${STORAGE_PREFIX}_access_token`,
      `${STORAGE_PREFIX}_user`,
      `${STORAGE_PREFIX}_state`,
      `${STORAGE_PREFIX}_auth`,
      BEARER_TOKEN_KEY,
      'session',
      'token',
      'refresh_token',
      'access_token',
      'user',
      'auth',
      'better-auth-session',
      'better-auth-token',
    ];
    
    console.log('[Auth] Keys to delete:', keysToDelete.length);
    
    for (const key of keysToDelete) {
      try {
        await SecureStore.deleteItemAsync(key);
        console.log('[Auth] ✓ Removed native key:', key);
      } catch (error) {
        // Key might not exist, which is fine
        console.log('[Auth] ✗ Could not delete', key, '(may not exist)');
      }
    }
    
    console.log('[Auth] Native token clearing completed');
  }
  
  console.log('[Auth] ========== TOKEN CLEARING COMPLETED ==========');
}

export { API_URL };
