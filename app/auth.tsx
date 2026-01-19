
import React, { useState, useEffect } from "react";
import { colors } from "@/styles/commonStyles";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Image,
} from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { createServiceProvider } from "@/utils/supabaseHelpers";

type Mode = "signin" | "signup";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  logo: {
    width: 200,
    height: 100,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 32,
  },
  roleInfo: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  roleInfoText: {
    fontSize: 14,
    color: colors.text,
    textAlign: "center",
    lineHeight: 20,
  },
  errorBox: {
    backgroundColor: "#fee",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#fcc",
  },
  errorText: {
    fontSize: 14,
    color: "#c00",
    textAlign: "center",
    lineHeight: 20,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 12,
    marginTop: 8,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  socialButton: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  socialButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: 16,
    color: colors.textSecondary,
    fontSize: 14,
  },
  switchModeContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  switchModeText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  switchModeButton: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  helpText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 16,
    lineHeight: 20,
  },
  requiredText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 16,
    fontStyle: 'italic',
  },
});

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Service Provider specific fields
  const [companyName, setCompanyName] = useState("");
  const [abn, setAbn] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithApple, user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const role = params.role as string | undefined;

  console.log('[Auth] Screen loaded with role:', role, 'mode:', mode);

  // If user is already logged in and has a role parameter, redirect to account creation
  useEffect(() => {
    if (user && role) {
      console.log(`[Auth] User already logged in, redirecting to ${role} account creation`);
      if (role === 'service-provider') {
        router.replace('/create-service-provider-account');
      } else if (role === 'support-worker') {
        router.replace('/create-support-worker-account');
      }
    }
  }, [user, role]);

  const getRoleDisplayName = () => {
    if (role === 'service-provider') return 'Service Provider';
    if (role === 'support-worker') return 'Support Worker';
    return null;
  };

  const getErrorMessage = (error: any): string => {
    console.log('[Auth] Processing error:', error);
    
    // Handle Supabase Auth errors
    if (error?.code === 'invalid_credentials') {
      if (mode === 'signin') {
        return 'Invalid email or password. Please check your credentials or sign up if you don\'t have an account yet.';
      }
      return 'Invalid credentials. Please try again.';
    }
    
    if (error?.code === 'user_not_found') {
      return 'No account found with this email. Please sign up first.';
    }
    
    if (error?.code === 'email_not_confirmed') {
      return 'Please check your email and confirm your account before signing in.';
    }
    
    if (error?.code === 'weak_password') {
      return 'Password is too weak. Please use at least 6 characters.';
    }
    
    if (error?.code === 'email_exists' || error?.code === 'user_already_exists') {
      return 'An account with this email already exists. Please sign in instead.';
    }
    
    if (error?.message) {
      return error.message;
    }
    
    return 'An error occurred during authentication. Please try again.';
  };

  const validateServiceProviderFields = (): boolean => {
    if (mode === 'signup' && role === 'service-provider') {
      if (!companyName.trim()) {
        setError('Please enter a company name');
        return false;
      }
      if (!phone.trim()) {
        setError('Please enter a phone number');
        return false;
      }
    }
    return true;
  };

  const handleEmailAuth = async () => {
    console.log(`[Auth] User tapped ${mode === "signin" ? "Sign In" : "Sign Up"} button`);
    
    if (!email || !password) {
      setError("Please fill in all required fields");
      return;
    }

    if (mode === "signup" && !name) {
      setError("Please enter your name");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    // Validate service provider fields if signing up as service provider
    if (!validateServiceProviderFields()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (mode === "signin") {
        console.log('[Auth] Signing in with email:', email);
        await signInWithEmail(email, password);
        console.log("[Auth] Sign in successful");
        
        // If role parameter exists, redirect to account creation
        if (role === 'service-provider') {
          console.log("[Auth] Redirecting to service provider account creation");
          router.replace('/create-service-provider-account');
        } else if (role === 'support-worker') {
          console.log("[Auth] Redirecting to support worker account creation");
          router.replace('/create-support-worker-account');
        } else {
          console.log("[Auth] Redirecting to home");
          router.replace("/(tabs)");
        }
      } else {
        console.log('[Auth] Signing up with email:', email);
        const { user: newUser, session } = await signUpWithEmail(email, password, name, role);
        console.log("[Auth] Sign up successful, user:", newUser?.id);
        
        // Check if email confirmation is required
        if (!session && newUser) {
          console.log("[Auth] Email confirmation required");
          Alert.alert(
            "Check Your Email",
            "We've sent you a confirmation email. Please click the link in the email to verify your account and complete the signup process.\n\nAfter confirming, you can sign in with your credentials.",
            [{ text: "OK", onPress: () => setMode("signin") }]
          );
          setLoading(false);
          return;
        }
        
        // If signing up as service provider, create the service provider record
        if (role === 'service-provider' && newUser?.id) {
          console.log('[Auth] Creating service provider record for user:', newUser.id);
          try {
            await createServiceProvider({
              user_id: newUser.id,
              company_name: companyName,
              abn: abn || null,
              contact_person: contactPerson || null,
              phone: phone,
              email: email,
              address: address || null,
              description: description || null,
            });
            console.log('[Auth] Service provider record created successfully');
            
            Alert.alert(
              'Success',
              'Your service provider account has been created!',
              [
                {
                  text: 'Continue',
                  onPress: () => {
                    console.log('[Auth] Navigating to Service Provider Dashboard');
                    router.replace('/service-provider-dashboard');
                  },
                },
              ]
            );
          } catch (providerError) {
            console.error('[Auth] Error creating service provider record:', providerError);
            Alert.alert(
              'Account Created',
              'Your account was created but there was an error setting up your service provider profile. Please complete your profile in settings.',
              [
                {
                  text: 'OK',
                  onPress: () => router.replace('/create-service-provider-account'),
                },
              ]
            );
          }
        } else if (role === 'support-worker') {
          console.log("[Auth] Redirecting to support worker account creation");
          router.replace('/create-support-worker-account');
        } else {
          console.log("[Auth] Redirecting to home");
          router.replace("/(tabs)");
        }
      }
    } catch (error: any) {
      console.error("[Auth] Authentication error:", error);
      const errorMessage = getErrorMessage(error);
      setError(errorMessage);
      
      // If it's an invalid credentials error during sign in, suggest signing up
      if (error?.code === 'invalid_credentials' && mode === 'signin') {
        setTimeout(() => {
          Alert.alert(
            "Account Not Found",
            "It looks like you don't have an account yet. Would you like to sign up?",
            [
              { text: "Cancel", style: "cancel" },
              { 
                text: "Sign Up", 
                onPress: () => {
                  console.log("[Auth] User chose to switch to sign up");
                  setMode("signup");
                  setError(null);
                }
              }
            ]
          );
        }, 100);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSocialAuth = async (provider: "google" | "apple") => {
    console.log(`[Auth] User tapped ${provider} sign in button`);
    setLoading(true);
    setError(null);

    try {
      if (provider === "google") {
        await signInWithGoogle();
      } else if (provider === "apple") {
        await signInWithApple();
      }
      console.log(`[Auth] ${provider} sign in initiated`);
      
      // Note: OAuth redirects will be handled by auth-callback.tsx
      // The role parameter will be lost, so we'll need to handle that in the callback
    } catch (error: any) {
      console.error(`[Auth] ${provider} sign in error:`, error);
      const errorMessage = getErrorMessage(error);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const roleDisplayName = getRoleDisplayName();
  const isServiceProviderSignup = mode === 'signup' && role === 'service-provider';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <Image
            source={require("@/assets/images/d535c926-ab15-4bf8-bf1c-71bd6c9d0f49.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>
            {mode === "signin" ? "Welcome Back" : "Create Account"}
          </Text>
          <Text style={styles.subtitle}>
            {mode === "signin"
              ? "Sign in to continue to Shift Assist"
              : "Sign up to get started with Shift Assist"}
          </Text>
        </View>

        {roleDisplayName && (
          <View style={styles.roleInfo}>
            <Text style={styles.roleInfoText}>
              You're {mode === "signin" ? "signing in" : "signing up"} as a {roleDisplayName}
            </Text>
          </View>
        )}

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Basic Account Information */}
        {mode === "signup" && (
          <>
            <Text style={styles.sectionHeader}>Account Information</Text>
            <TextInput
              style={styles.input}
              placeholder="Full Name *"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={(text) => {
                setName(text);
                setError(null);
              }}
              autoCapitalize="words"
              editable={!loading}
            />
          </>
        )}

        <TextInput
          style={styles.input}
          placeholder="Email *"
          placeholderTextColor={colors.textSecondary}
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setError(null);
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Password (min 6 characters) *"
          placeholderTextColor={colors.textSecondary}
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setError(null);
          }}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />

        {/* Service Provider Specific Fields */}
        {isServiceProviderSignup && (
          <>
            <Text style={styles.sectionHeader}>Service Provider Details</Text>
            <Text style={styles.requiredText}>* Required fields</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Company Name *"
              placeholderTextColor={colors.textSecondary}
              value={companyName}
              onChangeText={(text) => {
                setCompanyName(text);
                setError(null);
              }}
              editable={!loading}
            />

            <TextInput
              style={styles.input}
              placeholder="ABN (Australian Business Number)"
              placeholderTextColor={colors.textSecondary}
              value={abn}
              onChangeText={(text) => {
                setAbn(text);
                setError(null);
              }}
              keyboardType="numeric"
              editable={!loading}
            />

            <TextInput
              style={styles.input}
              placeholder="Contact Person Name"
              placeholderTextColor={colors.textSecondary}
              value={contactPerson}
              onChangeText={(text) => {
                setContactPerson(text);
                setError(null);
              }}
              autoCapitalize="words"
              editable={!loading}
            />

            <TextInput
              style={styles.input}
              placeholder="Phone Number *"
              placeholderTextColor={colors.textSecondary}
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                setError(null);
              }}
              keyboardType="phone-pad"
              editable={!loading}
            />

            <TextInput
              style={styles.input}
              placeholder="Business Address"
              placeholderTextColor={colors.textSecondary}
              value={address}
              onChangeText={(text) => {
                setAddress(text);
                setError(null);
              }}
              editable={!loading}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description of Services"
              placeholderTextColor={colors.textSecondary}
              value={description}
              onChangeText={(text) => {
                setDescription(text);
                setError(null);
              }}
              multiline
              numberOfLines={4}
              editable={!loading}
            />
          </>
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleEmailAuth}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>
              {mode === "signin" ? "Sign In" : "Sign Up"}
            </Text>
          )}
        </TouchableOpacity>

        {mode === "signin" && (
          <Text style={styles.helpText}>
            Don't have an account? Tap "Sign Up" below to create one.
          </Text>
        )}

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={styles.socialButton}
          onPress={() => handleSocialAuth("google")}
          disabled={loading}
        >
          <Text style={styles.socialButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        {Platform.OS === "ios" && (
          <TouchableOpacity
            style={styles.socialButton}
            onPress={() => handleSocialAuth("apple")}
            disabled={loading}
          >
            <Text style={styles.socialButtonText}>Continue with Apple</Text>
          </TouchableOpacity>
        )}

        <View style={styles.switchModeContainer}>
          <Text style={styles.switchModeText}>
            {mode === "signin"
              ? "Don't have an account?"
              : "Already have an account?"}
          </Text>
          <TouchableOpacity
            onPress={() => {
              console.log(`[Auth] User switched to ${mode === "signin" ? "signup" : "signin"} mode`);
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
            }}
            disabled={loading}
          >
            <Text style={styles.switchModeButton}>
              {mode === "signin" ? "Sign Up" : "Sign In"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
