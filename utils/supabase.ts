
/**
 * Supabase Client Utilities
 * 
 * Provides utilities for interacting with Supabase backend database.
 * Handles authentication, database operations, and storage.
 * 
 * Configuration:
 * - SUPABASE_URL: Your Supabase project URL (from app.json)
 * - SUPABASE_ANON_KEY: Your Supabase anonymous key (from app.json)
 * 
 * Features:
 * - Supabase Auth for authentication
 * - REST API calls for database operations (CRUD)
 * - Storage API for file uploads
 * - Automatic authentication header management
 * - Type-safe request/response handling
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Constants from "expo-constants";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import 'react-native-url-polyfill/auto';

/**
 * Supabase configuration from app.json
 */
export const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl || "";
export const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.supabaseAnonKey || "";

// Log configuration on module load for debugging
console.log('[Supabase] URL configured:', SUPABASE_URL);
console.log('[Supabase] Anon key configured:', SUPABASE_ANON_KEY ? '✓' : '✗');

/**
 * Check if Supabase is properly configured
 */
export const isSupabaseConfigured = (): boolean => {
  const isConfigured = !!SUPABASE_URL && !!SUPABASE_ANON_KEY;
  if (!isConfigured) {
    console.warn('[Supabase] Configuration missing! Please check app.json');
  }
  return isConfigured;
};

/**
 * Platform-specific secure storage for Supabase Auth
 */
const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

/**
 * Create Supabase client with auth storage
 */
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

console.log('[Supabase] Client initialized with auth storage');

/**
 * Legacy bearer token storage key (for backward compatibility)
 */
const BEARER_TOKEN_KEY = "natively_bearer_token";

/**
 * Get bearer token from platform-specific storage (legacy)
 */
export const getBearerToken = async (): Promise<string | null> => {
  try {
    // First try to get from Supabase session
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return session.access_token;
    }

    // Fallback to legacy storage
    if (Platform.OS === "web") {
      return localStorage.getItem(BEARER_TOKEN_KEY);
    } else {
      return await SecureStore.getItemAsync(BEARER_TOKEN_KEY);
    }
  } catch (error) {
    console.error("[Supabase] Error retrieving bearer token:", error);
    return null;
  }
};

/**
 * Set bearer token in platform-specific storage (legacy)
 */
export const setBearerToken = async (token: string): Promise<void> => {
  try {
    if (Platform.OS === "web") {
      localStorage.setItem(BEARER_TOKEN_KEY, token);
    } else {
      await SecureStore.setItemAsync(BEARER_TOKEN_KEY, token);
    }
  } catch (error) {
    console.error("[Supabase] Error storing bearer token:", error);
    throw error;
  }
};

/**
 * Clear bearer token from storage (legacy)
 */
export const clearBearerToken = async (): Promise<void> => {
  try {
    if (Platform.OS === "web") {
      localStorage.removeItem(BEARER_TOKEN_KEY);
    } else {
      await SecureStore.deleteItemAsync(BEARER_TOKEN_KEY);
    }
  } catch (error) {
    console.error("[Supabase] Error clearing bearer token:", error);
  }
};

/**
 * Build Supabase headers with authentication
 */
const buildHeaders = async (includeAuth: boolean = true): Promise<HeadersInit> => {
  const headers: HeadersInit = {
    "apikey": SUPABASE_ANON_KEY,
    "Content-Type": "application/json",
  };

  if (includeAuth) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }
  }

  return headers;
};

/**
 * Generic Supabase REST API call
 */
const supabaseCall = async <T = any>(
  endpoint: string,
  options?: RequestInit,
  includeAuth: boolean = true
): Promise<T> => {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase not configured. Please check app.json.");
  }

  const url = `${SUPABASE_URL}${endpoint}`;
  const headers = await buildHeaders(includeAuth);

  console.log("[Supabase] Calling:", url, options?.method || "GET");

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("[Supabase] Error response:", response.status, text);
      throw new Error(`Supabase error: ${response.status} - ${text}`);
    }

    // Handle empty responses (e.g., DELETE operations)
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      console.log("[Supabase] Success:", data);
      return data;
    }

    return {} as T;
  } catch (error) {
    console.error("[Supabase] Request failed:", error);
    throw error;
  }
};

/**
 * Database Operations
 */

/**
 * Select records from a table
 * @param table - Table name
 * @param select - Columns to select (default: "*")
 * @param filters - Query filters (e.g., { id: "eq.123", status: "eq.active" })
 */
export const supabaseSelect = async <T = any>(
  table: string,
  select: string = "*",
  filters?: Record<string, string>
): Promise<T[]> => {
  let endpoint = `/rest/v1/${table}?select=${select}`;
  
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      endpoint += `&${key}=${value}`;
    });
  }

  return supabaseCall<T[]>(endpoint, { method: "GET" });
};

/**
 * Insert a record into a table
 * @param table - Table name
 * @param data - Record data
 */
export const supabaseInsert = async <T = any>(
  table: string,
  data: any
): Promise<T> => {
  const endpoint = `/rest/v1/${table}`;
  
  const result = await supabaseCall<T[]>(endpoint, {
    method: "POST",
    body: JSON.stringify(data),
    headers: {
      "Prefer": "return=representation",
    },
  });

  // Supabase returns an array, we want the first item
  return Array.isArray(result) ? result[0] : result;
};

/**
 * Update records in a table
 * @param table - Table name
 * @param data - Updated data
 * @param filters - Query filters (e.g., { id: "eq.123" })
 */
export const supabaseUpdate = async <T = any>(
  table: string,
  data: any,
  filters: Record<string, string>
): Promise<T> => {
  let endpoint = `/rest/v1/${table}?`;
  
  Object.entries(filters).forEach(([key, value], index) => {
    if (index > 0) endpoint += "&";
    endpoint += `${key}=${value}`;
  });

  const result = await supabaseCall<T[]>(endpoint, {
    method: "PATCH",
    body: JSON.stringify(data),
    headers: {
      "Prefer": "return=representation",
    },
  });

  // Supabase returns an array, we want the first item
  return Array.isArray(result) ? result[0] : result;
};

/**
 * Delete records from a table
 * @param table - Table name
 * @param filters - Query filters (e.g., { id: "eq.123" })
 */
export const supabaseDelete = async (
  table: string,
  filters: Record<string, string>
): Promise<void> => {
  let endpoint = `/rest/v1/${table}?`;
  
  Object.entries(filters).forEach(([key, value], index) => {
    if (index > 0) endpoint += "&";
    endpoint += `${key}=${value}`;
  });

  await supabaseCall(endpoint, { method: "DELETE" });
};

/**
 * Storage Operations
 */

/**
 * Upload a file to Supabase storage
 * @param bucket - Storage bucket name
 * @param path - File path in bucket
 * @param file - File data (Blob, File, or FormData)
 * @param contentType - File content type
 */
export const supabaseUploadFile = async (
  bucket: string,
  path: string,
  file: Blob | File | FormData,
  contentType?: string
): Promise<{ url: string; path: string }> => {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase not configured. Please check app.json.");
  }

  const url = `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`;
  const headers = await buildHeaders(true);

  // Remove Content-Type for FormData (browser will set it with boundary)
  const uploadHeaders: HeadersInit = { ...headers };
  if (file instanceof FormData) {
    delete uploadHeaders["Content-Type"];
  } else if (contentType) {
    uploadHeaders["Content-Type"] = contentType;
  }

  console.log("[Supabase Storage] Uploading to:", url);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: uploadHeaders,
      body: file,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("[Supabase Storage] Upload error:", response.status, text);
      throw new Error(`Upload failed: ${response.status} - ${text}`);
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
    console.log("[Supabase Storage] Upload success:", publicUrl);

    return { url: publicUrl, path };
  } catch (error) {
    console.error("[Supabase Storage] Upload failed:", error);
    throw error;
  }
};

/**
 * Get public URL for a file in storage
 * @param bucket - Storage bucket name
 * @param path - File path in bucket
 */
export const supabaseGetPublicUrl = (bucket: string, path: string): string => {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
};

/**
 * Delete a file from storage
 * @param bucket - Storage bucket name
 * @param path - File path in bucket
 */
export const supabaseDeleteFile = async (
  bucket: string,
  path: string
): Promise<void> => {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase not configured. Please check app.json.");
  }

  const url = `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`;
  const headers = await buildHeaders(true);

  console.log("[Supabase Storage] Deleting:", url);

  try {
    const response = await fetch(url, {
      method: "DELETE",
      headers,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("[Supabase Storage] Delete error:", response.status, text);
      throw new Error(`Delete failed: ${response.status} - ${text}`);
    }

    console.log("[Supabase Storage] Delete success");
  } catch (error) {
    console.error("[Supabase Storage] Delete failed:", error);
    throw error;
  }
};

/**
 * Helper: Build filter string for Supabase queries
 * Examples:
 * - Equal: buildFilter("id", "eq", "123") → "id=eq.123"
 * - Greater than: buildFilter("age", "gt", "18") → "age=gt.18"
 * - Like: buildFilter("name", "like", "*John*") → "name=like.*John*"
 */
export const buildFilter = (
  column: string,
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "like" | "ilike" | "is" | "in",
  value: string
): string => {
  return `${column}=${operator}.${value}`;
};
