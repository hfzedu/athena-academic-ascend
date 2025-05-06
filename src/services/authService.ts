import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { User, Session, AuthError, Provider, SignInWithPasswordCredentials, SignUpOptions, SignInWithOAuthCredentials, ResetPasswordForEmailOptions } from '@supabase/supabase-js';

// Types
type UserRole = Database["public"]["Enums"]["user_role"];

export interface SignUpData {
  first_name: string;
  last_name: string;
  role: UserRole; // Initial role, might need admin approval for higher roles
  // Add other initial profile data here if needed
  department_id?: string;
}

export interface AuthResponse {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}

// For audit logging
type AuthAuditEvent =
  | 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'LOGOUT'
  | 'SIGNUP_SUCCESS' | 'SIGNUP_FAILURE'
  | 'PASSWORD_RESET_REQUEST' | 'PASSWORD_RESET_SUCCESS' | 'PASSWORD_UPDATE_SUCCESS'
  | 'MFA_ENROLL_SUCCESS' | 'MFA_CHALLENGE_SUCCESS' | 'MFA_CHALLENGE_FAILURE' | 'MFA_UNENROLL_SUCCESS'
  | 'OAUTH_SIGNIN_INITIATED' | 'OAUTH_SIGNIN_SUCCESS' // Success logged on callback
  | 'MAGIC_LINK_REQUESTED' | 'MAGIC_LINK_SUCCESS' // Success logged on callback
  | 'TOKEN_REFRESHED' | 'SESSION_TERMINATED_BY_ADMIN'
  | 'IMPERSONATION_START' | 'IMPERSONATION_END';


const logAuthEvent = async (
    event: AuthAuditEvent,
    userId: string | null,
    error?: AuthError | Error | null,
    details?: Record<string, any>
  ) => {
    // In a real app, you might get IP and User-Agent from the request headers on the server-side
    // For client-side logging, these might be harder to get accurately or reliably.
    console.log(`[AUTH_AUDIT] Event: ${event}, UserID: ${userId}, Error: ${error?.message || 'None'}, Details: ${JSON.stringify(details)}`);
    try {
        await supabase.from('auth_audit_log').insert({
            event_type: event,
            user_id: userId,
            // ip_address: details?.ipAddress, // Best captured server-side
            // user_agent: details?.userAgent, // Best captured server-side
            details: {
                ...(error ? { errorName: error.name, errorMessage: error.message, errorCode: (error as AuthError).status } : {}),
                ...details
            }
        });
    } catch (auditError) {
        console.error("Failed to log auth event:", auditError);
    }
  };


export const authService = {
  /**
   * Gets the currently authenticated user.
   */
  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  /**
   * Gets the current session.
   */
  async getCurrentSession(): Promise<Session | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  /**
   * Signs in a user with email and password.
   */
  async signInWithPassword(credentials: SignInWithPasswordCredentials): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.signInWithPassword(credentials);
    if (error) {
      await logAuthEvent('LOGIN_FAILURE', null, error, { email: credentials.email });
      throw error; // Re-throw for UI handling
    }
    await logAuthEvent('LOGIN_SUCCESS', data.user?.id || null, null, { email: credentials.email });
    return { user: data.user, session: data.session, error: null };
  },

  /**
   * Initiates sign-in with an OAuth provider (e.g., Google, GitHub, Azure AD for SSO).
   * redirectTo is crucial for the OAuth flow to return to your app.
   */
  async signInWithOAuth(provider: Provider, redirectTo?: string): Promise<{ provider: Provider; url: string | null; error: AuthError | null }> {
    const redirectUrl = redirectTo || `${window.location.origin}/auth/callback`;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl,
        // scopes: 'openid profile email', // Request specific scopes if needed
        // queryParams: { access_type: 'offline', prompt: 'consent' } // For refresh tokens with Google
      },
    });

    if (error) {
      await logAuthEvent('OAUTH_SIGNIN_INITIATED', null, error, { provider });
      throw error;
    }
    await logAuthEvent('OAUTH_SIGNIN_INITIATED', null, null, { provider, redirectTo: redirectUrl });
    return { provider, url: data.url, error: null }; // URL to redirect the user to
  },

  /**
   * Signs up a new user with email, password, and additional profile data.
   * options.data is stored in auth.users.raw_user_meta_data and can be used by a trigger
   * to populate a public 'profiles' table.
   */
  async signUp(email: string, password: string, userData: SignUpData, options?: SignUpOptions): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData, // This data is passed to the new user's metadata
        emailRedirectTo: options?.emailRedirectTo || `${window.location.origin}/welcome`, // For email confirmation
        ...(options || {})
      },
    });

    if (error) {
      await logAuthEvent('SIGNUP_FAILURE', null, error, { email });
      throw error;
    }
    // User is created but might require email confirmation. Profile creation usually handled by DB trigger.
    await logAuthEvent('SIGNUP_SUCCESS', data.user?.id || null, null, { email, role: userData.role });
    return { user: data.user, session: data.session, error: null };
  },

  /**
   * Signs out the current user, invalidating the session.
   */
  async signOut(scope: 'global' | 'local' | 'others' = 'global'): Promise<{ error: AuthError | null }> {
    const user = await this.getCurrentUser();
    const { error } = await supabase.auth.signOut({ scope }); // 'global' signs out from all devices
    if (error) {
        await logAuthEvent('LOGOUT', user?.id || null, error);
        throw error;
    }
    await logAuthEvent('LOGOUT', user?.id || null);
    return { error: null };
  },

  /**
   * Sends a password reset email to the user.
   * redirectTo specifies where the user is sent after clicking the reset link.
   */
  async requestPasswordReset(email: string, options?: ResetPasswordForEmailOptions): Promise<{ error: AuthError | null }> {
    const redirectUrl = options?.redirectTo || `${window.location.origin}/auth/update-password`; // Page to enter new password
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
      ...(options || {})
    });

    if (error) {
        await logAuthEvent('PASSWORD_RESET_REQUEST', null, error, { email });
        throw error;
    }
    await logAuthEvent('PASSWORD_RESET_REQUEST', null, null, { email });
    return { error: null };
  },

  /**
   * Updates the user's password. Typically used after a password reset flow or by an authenticated user.
   */
  async updateUserPassword(newPassword: string): Promise<{ user: User | null; error: AuthError | null }> {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    const userId = data.user?.id || (await this.getCurrentUser())?.id; // Get current user ID if not in response
    if (error) {
        await logAuthEvent('PASSWORD_UPDATE_SUCCESS', userId || null, error); // Log failure
        throw error;
    }
    await logAuthEvent('PASSWORD_UPDATE_SUCCESS', userId || null);
    return { user: data.user, error: null };
  },

  /**
   * Handles the OAuth callback. Exchanges a code for a session.
   * This should typically be called on your `/auth/callback` page/route.
   */
  async handleOAuthCallback(): Promise<AuthResponse> {
    // Supabase JS client handles this internally when session is refreshed,
    // but if you need to explicitly manage it or log:
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
        // This could happen if the hash is already processed or there's an issue.
        // Attempt to refresh to be sure.
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
            await logAuthEvent('OAUTH_SIGNIN_SUCCESS', null, refreshError); // Log as failure if refresh fails
            return { user: null, session: null, error: refreshError };
        }
        await logAuthEvent('OAUTH_SIGNIN_SUCCESS', refreshed.user?.id || null);
        return { user: refreshed.user, session: refreshed.session, error: null };
    }
    await logAuthEvent('OAUTH_SIGNIN_SUCCESS', session.user.id);
    return { user: session.user, session, error: null };
  },

  /**
   * Sends a magic link for passwordless sign-in.
   */
  async signInWithMagicLink(email: string, redirectTo?: string): Promise<{ error: AuthError | null }> {
    const redirectUrl = redirectTo || `${window.location.origin}/auth/callback`; // Magic link also uses callback
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl,
        // shouldCreateUser: false, // Set to true if magic link can also sign up new users
      },
    });
    if (error) {
        await logAuthEvent('MAGIC_LINK_REQUESTED', null, error, { email });
        throw error;
    }
    await logAuthEvent('MAGIC_LINK_REQUESTED', null, null, { email });
    return { error: null };
  },

  // --- MFA Methods ---
  /**
   * Enrolls the current user in MFA with a Time-based One-Time Password (TOTP) factor.
   * Returns QR code URI and secret for the user to scan with an authenticator app.
   */
  async mfaEnroll(): Promise<{ data: any; error: AuthError | null }> {
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
    const user = await this.getCurrentUser();
    if (error) {
        await logAuthEvent('MFA_ENROLL_SUCCESS', user?.id || null, error); // Log failure
        throw error;
    }
    // data contains: id, factor_type, status, friendly_name, totp.qr_code, totp.secret
    await logAuthEvent('MFA_ENROLL_SUCCESS', user?.id || null, null, { factorId: data?.id });
    return { data, error };
  },

  /**
   * Verifies an MFA enrollment by submitting a code from the authenticator app.
   * This finalizes the enrollment process for the factor.
   */
  async mfaChallengeAndVerify(factorId: string, code: string): Promise<{ data: any; error: AuthError | null }> {
    const { data, error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    const user = await this.getCurrentUser();
     if (error) {
        await logAuthEvent('MFA_CHALLENGE_FAILURE', user?.id || null, error, { factorId });
        throw error;
    }
    // This completes enrollment. Session is now MFA protected.
    await logAuthEvent('MFA_CHALLENGE_SUCCESS', user?.id || null, null, { factorId });
    return { data, error };
  },

  /**
   * Unenrolls an MFA factor.
   */
  async mfaUnenroll(factorId: string): Promise<{ data: any; error: AuthError | null }> {
    const { data, error } = await supabase.auth.mfa.unenroll({ factorId });
    const user = await this.getCurrentUser();
    if (error) {
        await logAuthEvent('MFA_UNENROLL_SUCCESS', user?.id || null, error, { factorId }); // Log failure
        throw error;
    }
    await logAuthEvent('MFA_UNENROLL_SUCCESS', user?.id || null, null, { factorId });
    return { data, error };
  },

  /**
   * Lists all enrolled MFA factors for the current user.
   */
  async mfaListFactors(): Promise<{ data: any; error: AuthError | null }> {
    // This gets factors from AAL (Assurance Level), not directly all enrolled factors for management.
    // To list all factors for management, you typically need admin privileges or a custom setup.
    // The `getAuthenticatorAssuranceLevel` gives current AAL status.
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    return { data, error };
  },


  // --- Session Management & Admin ---
  /**
   * Refreshes the current session if a refresh token is available.
   */
  async refreshUserSession(): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
        // If refresh fails, user might need to log in again.
        await logAuthEvent('TOKEN_REFRESHED', data.user?.id || null, error);
        return { user: null, session: null, error };
    }
    await logAuthEvent('TOKEN_REFRESHED', data.user?.id || null);
    return { user: data.user, session: data.session, error: null };
  },

  /**
   * Allows an administrator to sign out a specific user from all sessions.
   * Requires service_role key or appropriate admin permissions.
   * This is a server-side operation. The client-side `authService` might call a
   * secure server-side endpoint that performs this.
   */
  async adminSignOutUser(userIdToSignOut: string, actingAdminId: string): Promise<{ error: Error | null }> {
    // IMPORTANT: This uses supabase.auth.admin.signOut(), which requires admin privileges.
    // It should NOT be directly callable from the client without mediation by a secure backend function.
    console.warn("adminSignOutUser should be called from a secure server environment.");
    // Example of how it might be structured if this service WAS on the server or calling a server function:
    // const { error } = await getSupabaseAdminClient().auth.admin.signOut(userIdToSignOut);
    // For now, this is a conceptual placeholder.
    // if (error) {
    //     await logAuthEvent('SESSION_TERMINATED_BY_ADMIN', userIdToSignOut, error, { adminId: actingAdminId });
    //     throw error;
    // }
    // await logAuthEvent('SESSION_TERMINATED_BY_ADMIN', userIdToSignOut, null, { adminId: actingAdminId });
    // return { error: null };
    await logAuthEvent('SESSION_TERMINATED_BY_ADMIN', userIdToSignOut, null, { adminId: actingAdminId, note: "Conceptual - requires server-side execution" });
    return { error: new Error("Conceptual method: Requires server-side execution with admin privileges.") };
  },

  /**
   * List all active sessions for the current user.
   * (Supabase JS client doesn't directly expose this; it's more of a backend/admin feature)
   * Typically you'd build a custom table to track sessions if granular control is needed.
   */
  async listUserSessions(): Promise<any> {
    console.warn("listUserSessions is not directly supported by Supabase JS client for end-users. Admin feature or custom tracking needed.");
    // const user = await this.getCurrentUser();
    // if (!user) return { data: [], error: new AuthError('User not authenticated')};
    // This would query a custom 'user_sessions' table if you implement one.
    return { data: [], error: null, note: "Conceptual - requires custom session tracking table." };
  },


  // --- Event Listener ---
  /**
   * Sets up a listener for auth state changes (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.).
   * The callback receives the event and session.
   * Returns an object with an `unsubscribe` method.
   */
  onAuthStateChange(callback: (event: string, session: Session | null) => void): { data: { subscription: any }; error: null } {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // You could add more detailed logging here based on event types.
      // e.g. if (event === 'TOKEN_REFRESHED') await logAuthEvent('TOKEN_REFRESHED', session?.user.id || null);
      callback(event, session);
    });
    return { data: { subscription }, error: null }; // Subscription object to call .unsubscribe()
  },

};

export default authService;
