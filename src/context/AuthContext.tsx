import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithCredential,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  User,
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import { GoogleAuthUser, Member, Church } from '../types';
import {
  getMembersByChurch,
  updateMember,
  getChurchById,
  saveChurch,
  getAllChurches,
  addMember,
  generateSecureMemberPin,
  revokeAdminSession,
  clearChurchAdminLock,
  unifyMemberProfile,
  isCustomMemberPhoto,
} from '../utils/storage';
import { isSuperDeveloperEmail } from '../utils/cryptoSecurity';
import {
  clearVerifiedChurchCache,
  firestoreAutoPurgeAccidentalTestChurches,
} from '../services/firestoreService';

async function forceRefreshAuthToken(user: User | null | undefined): Promise<void> {
  if (!user) return;
  try {
    await user.getIdToken(true);
  } catch {
    // Non-fatal offline/network token refresh note
  }
}

async function applyAuthPersistence(rememberMe: boolean): Promise<void> {
  try {
    await setPersistence(
      auth,
      rememberMe ? browserLocalPersistence : browserSessionPersistence
    );
  } catch (err) {
    console.warn('Firebase auth persistence note:', err);
  }
}

export interface AuthContextType {
  googleUser: GoogleAuthUser | null;
  developerUser: GoogleAuthUser | null;
  isEmailVerified: boolean;
  isLoadingAuth: boolean;
  signInWithGoogle: (options?: { rememberMe?: boolean }) => Promise<GoogleAuthUser>;
  signInSuperDeveloperWithGoogle: () => Promise<{
    user: GoogleAuthUser;
    isSuperDeveloper: boolean;
    emailVerified: boolean;
  }>;
  registerChurchAdminWithEmail: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<GoogleAuthUser>;
  signInChurchAdminWithEmail: (
    email: string,
    password: string,
    options?: { rememberMe?: boolean }
  ) => Promise<GoogleAuthUser>;
  sendChurchAdminPasswordReset: (email: string) => Promise<void>;
  resendAdminVerificationEmail: () => Promise<void>;
  refreshAuthUserState: () => Promise<boolean>;
  signOutGoogle: () => Promise<void>;
  linkMemberGoogleAccount: (
    churchId: string,
    memberId: string,
    customUser?: GoogleAuthUser | null
  ) => boolean;
  unlinkMemberGoogleAccount: (churchId: string, memberId: string) => boolean;
  linkChurchAdminGoogleAccount: (
    churchId: string,
    customUser?: GoogleAuthUser | null,
    authMethod?: Church['adminAuthMethod']
  ) => boolean;
  linkChurchAdminEmailAccount: (
    churchId: string,
    customUser?: GoogleAuthUser | null
  ) => boolean;
  unlinkChurchAdminGoogleAccount: (churchId: string) => boolean;
  findMemberByGoogleEmail: (churchId: string, email?: string | null) => Member | undefined;
  findMemberByGoogleEmailAnyChurch: (
    email?: string | null
  ) => { member: Member; churchId: string; church: Church } | undefined;
  autoCreateMemberFromGoogle: (
    churchId: string,
    customUser?: GoogleAuthUser | null
  ) => Member;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const LOCAL_STORAGE_GOOGLE_USER_KEY = 'app_legiz_google_user_session_v1';
const RESERVED_DEV_ACCOUNT_ERROR =
  'Kont sa a rezève sèlman pou Panèl Administrasyon Jeneral sistèm nan. Li pa ka itilize kòm kont manm oswa administratè legliz.';

function buildAuthUserData(user: User, fallbackName?: string | null, fallbackPhoto?: string | null): GoogleAuthUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName:
      user.displayName ||
      fallbackName ||
      user.email?.split('@')[0] ||
      'Administratè Legliz',
    photoURL: user.photoURL || fallbackPhoto || null,
  };
}

function mapFirebaseAuthError(err: any, fallbackMessage: string): string {
  const code = String(err?.code || '');
  const rawMsg = String(err?.message || '');

  if (code === 'auth/email-already-in-use' || rawMsg.includes('email-already-in-use')) {
    return 'Imèl sa a deja gen yon kont Administratè anrejistre. Konekte ak modpas kont sa a oswa itilize yon lòt imèl.';
  }
  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found' ||
    rawMsg.includes('invalid-credential') ||
    rawMsg.includes('wrong-password') ||
    rawMsg.includes('user-not-found')
  ) {
    return 'Imèl oswa modpas la pa kòrèk. Tanpri verifye yo epi re-eseye.';
  }
  if (code === 'auth/weak-password' || rawMsg.includes('weak-password')) {
    return 'Modpas la twò fèb. Li dwe gen omwen 6 karaktè.';
  }
  if (code === 'auth/invalid-email' || rawMsg.includes('invalid-email')) {
    return 'Adrès imèl la pa gen yon fòma ki valab.';
  }
  if (code === 'auth/too-many-requests' || rawMsg.includes('too-many-requests')) {
    return 'Ou fè twòp tantativ. Tanpri tann kèk minit anvan ou re-eseye oswa chanje modpas ou.';
  }
  if (code === 'auth/operation-not-allowed' || rawMsg.includes('operation-not-allowed')) {
    return 'Otantifikasyon pa Imèl/Modpas poko aktive nan paramèt sistèm nan.';
  }
  if (rawMsg.includes('action is invalid')) {
    return 'Aksyon an pa valab kounye a oswa fenèt la te fèmen. Tanpri re-eseye.';
  }
  return rawMsg || fallbackMessage;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [googleUser, setGoogleUser] = useState<GoogleAuthUser | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_GOOGLE_USER_KEY);
      if (!saved) return null;
      const parsed: GoogleAuthUser = JSON.parse(saved);
      if (isSuperDeveloperEmail(parsed?.email)) {
        localStorage.removeItem(LOCAL_STORAGE_GOOGLE_USER_KEY);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });
  const [developerUser, setDeveloperUser] = useState<GoogleAuthUser | null>(null);
  const [isEmailVerified, setIsEmailVerified] = useState<boolean>(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);

  const applyAuthenticatedUserState = useCallback(
    (authUserData: GoogleAuthUser, verified: boolean) => {
      setIsEmailVerified(verified);
      if (isSuperDeveloperEmail(authUserData.email)) {
        // Strictly isolate the Super Developer account from church/member flows
        setDeveloperUser(authUserData);
        setGoogleUser(null);
        if (verified) {
          firestoreAutoPurgeAccidentalTestChurches().catch(() => {});
        }
        try {
          localStorage.removeItem(LOCAL_STORAGE_GOOGLE_USER_KEY);
        } catch {
          // ignore
        }
      } else {
        setDeveloperUser(null);
        setGoogleUser(authUserData);
        try {
          localStorage.setItem(LOCAL_STORAGE_GOOGLE_USER_KEY, JSON.stringify(authUserData));
        } catch {
          // ignore
        }
      }
    },
    []
  );

  useEffect(() => {
    try {
      if (Capacitor.isNativePlatform()) {
        GoogleAuth.initialize({
          clientId: '770562747895-9u95tikk4ae0u1prn4rmvcl12ubcrd9i.apps.googleusercontent.com',
          scopes: ['profile', 'email'],
          grantOfflineAccess: true,
        });
      }
    } catch (err) {
      console.warn('Native GoogleAuth initialization note:', err);
    }
  }, []);

  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result && result.user) {
          const authUserData = buildAuthUserData(result.user);
          applyAuthenticatedUserState(authUserData, Boolean(result.user.emailVerified));
        }
      })
      .catch((err) => {
        console.warn('Auth redirect note:', err?.message || err);
      });
  }, [applyAuthenticatedUserState]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      clearVerifiedChurchCache();
      if (user) {
        const authUserData = buildAuthUserData(user);
        applyAuthenticatedUserState(authUserData, Boolean(user.emailVerified));
      } else {
        setGoogleUser(null);
        setDeveloperUser(null);
        setIsEmailVerified(false);
        try {
          localStorage.removeItem(LOCAL_STORAGE_GOOGLE_USER_KEY);
        } catch {
          // ignore
        }
      }
      setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, [applyAuthenticatedUserState]);

  const signInWithGoogle = useCallback(
    async (options?: { rememberMe?: boolean }): Promise<GoogleAuthUser> => {
      const rememberMe = options?.rememberMe ?? true;
      setIsLoadingAuth(true);
      await applyAuthPersistence(rememberMe);
      if (Capacitor.isNativePlatform()) {
        try {
          const nativeUser = await GoogleAuth.signIn();
          if (nativeUser && nativeUser.authentication?.idToken) {
            const credential = GoogleAuthProvider.credential(nativeUser.authentication.idToken);
            const fbCredential = await signInWithCredential(auth, credential);
            await forceRefreshAuthToken(fbCredential.user);
            clearVerifiedChurchCache();
            const authUserData = buildAuthUserData(
              fbCredential.user,
              nativeUser.name,
              nativeUser.imageUrl
            );
            if (!authUserData.email && nativeUser.email) {
              authUserData.email = nativeUser.email;
            }
            applyAuthenticatedUserState(authUserData, Boolean(fbCredential.user.emailVerified));
            setIsLoadingAuth(false);
            return authUserData;
          }
        } catch (nativeErr) {
          console.warn('Native GoogleAuth sign-in fallback to web popup:', nativeErr);
        }
      }

      try {
        const result = await signInWithPopup(auth, googleAuthProvider);
        await forceRefreshAuthToken(result.user);
        clearVerifiedChurchCache();
        const authUserData = buildAuthUserData(result.user);
        applyAuthenticatedUserState(authUserData, Boolean(result.user.emailVerified));
        setIsLoadingAuth(false);
        return authUserData;
      } catch (err: any) {
        setIsLoadingAuth(false);
        throw new Error(mapFirebaseAuthError(err, 'Erè otantifikasyon Google.'));
      }
    },
    [applyAuthenticatedUserState]
  );

  const signInSuperDeveloperWithGoogle = useCallback(async (): Promise<{
    user: GoogleAuthUser;
    isSuperDeveloper: boolean;
    emailVerified: boolean;
  }> => {
    const authUserData = await signInWithGoogle();
    const liveUser = auth.currentUser;
    let verified = Boolean(liveUser?.emailVerified);
    if (liveUser) {
      try {
        await liveUser.reload();
        verified = Boolean(liveUser.emailVerified);
      } catch {
        // non-fatal
      }
      await forceRefreshAuthToken(liveUser);
    }
    const email = (liveUser?.email || authUserData.email || '').trim().toLowerCase();
    const isSuperDev = isSuperDeveloperEmail(email) && verified;
    applyAuthenticatedUserState(authUserData, verified);
    return {
      user: authUserData,
      isSuperDeveloper: isSuperDev,
      emailVerified: verified,
    };
  }, [signInWithGoogle, applyAuthenticatedUserState]);

  const registerChurchAdminWithEmail = useCallback(
    async (email: string, password: string, displayName?: string): Promise<GoogleAuthUser> => {
      const cleanEmail = (email || '').trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes('@')) {
        throw new Error('Tanpri antre yon adrès imèl administratè ki valab.');
      }
      if (isSuperDeveloperEmail(cleanEmail)) {
        throw new Error(RESERVED_DEV_ACCOUNT_ERROR);
      }
      if (!password || password.length < 6) {
        throw new Error('Modpas administratè a dwe gen omwen 6 karaktè.');
      }

      setIsLoadingAuth(true);
      try {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        if (displayName && displayName.trim()) {
          try {
            await updateProfile(cred.user, { displayName: displayName.trim() });
          } catch {
            // Non-blocking profile display name update
          }
        }
        try {
          await sendEmailVerification(cred.user);
        } catch (verErr) {
          console.warn('Non-blocking sendEmailVerification note:', verErr);
        }

        await forceRefreshAuthToken(cred.user);
        clearVerifiedChurchCache();

        const authUserData = buildAuthUserData(cred.user, displayName);
        applyAuthenticatedUserState(authUserData, Boolean(cred.user.emailVerified));
        setIsLoadingAuth(false);
        return authUserData;
      } catch (err: any) {
        // If this email already exists in Auth AND the creator typed the matching password,
        // verify ownership cleanly via signInWithEmailAndPassword so multi-church owners can reuse their email.
        const code = String(err?.code || '');
        if (code === 'auth/email-already-in-use') {
          try {
            const existingCred = await signInWithEmailAndPassword(auth, cleanEmail, password);
            if (!existingCred.user.emailVerified) {
              try {
                await sendEmailVerification(existingCred.user);
              } catch (verErr) {
                console.warn('Non-blocking existing user sendEmailVerification note:', verErr);
              }
            }
            await forceRefreshAuthToken(existingCred.user);
            clearVerifiedChurchCache();
            const authUserData = buildAuthUserData(existingCred.user, displayName);
            applyAuthenticatedUserState(authUserData, Boolean(existingCred.user.emailVerified));
            setIsLoadingAuth(false);
            return authUserData;
          } catch {
            setIsLoadingAuth(false);
            throw new Error(
              'Imèl sa a deja gen yon kont nan sistèm nan ak yon lòt modpas. Antre bon modpas kont lan oswa sèvi ak yon lòt imèl.'
            );
          }
        }

        setIsLoadingAuth(false);
        throw new Error(mapFirebaseAuthError(err, 'Pa ka kreye kont administratè a ak imèl sa a.'));
      }
    },
    [applyAuthenticatedUserState]
  );

  const signInChurchAdminWithEmail = useCallback(
    async (
      email: string,
      password: string,
      options?: { rememberMe?: boolean }
    ): Promise<GoogleAuthUser> => {
      const cleanEmail = (email || '').trim().toLowerCase();
      if (!cleanEmail || !password) {
        throw new Error('Tanpri antre imèl administratè a ak modpas li.');
      }
      if (isSuperDeveloperEmail(cleanEmail)) {
        throw new Error(RESERVED_DEV_ACCOUNT_ERROR);
      }

      const rememberMe = options?.rememberMe ?? true;
      setIsLoadingAuth(true);
      try {
        await applyAuthPersistence(rememberMe);
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
        await forceRefreshAuthToken(cred.user);
        clearVerifiedChurchCache();
        const authUserData = buildAuthUserData(cred.user);
        applyAuthenticatedUserState(authUserData, Boolean(cred.user.emailVerified));
        setIsLoadingAuth(false);
        return authUserData;
      } catch (err: any) {
        setIsLoadingAuth(false);
        throw new Error(mapFirebaseAuthError(err, 'Erè pandan koneksyon administratè a.'));
      }
    },
    [applyAuthenticatedUserState]
  );

  const sendChurchAdminPasswordReset = useCallback(async (email: string): Promise<void> => {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Tanpri antre yon adrès imèl valab pou voye lyen re-inisyalizasyon an.');
    }
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
    } catch (err: any) {
      throw new Error(mapFirebaseAuthError(err, 'Pa ka voye imèl re-inisyalizasyon modpas la.'));
    }
  }, []);

  const resendAdminVerificationEmail = useCallback(async (): Promise<void> => {
    if (!auth.currentUser) {
      throw new Error('Ou dwe konekte ak kont imèl la anvan pou w voye verifikasyon an.');
    }
    try {
      await auth.currentUser.reload();
    } catch {
      // ignore reload note
    }
    if (auth.currentUser.emailVerified) {
      await forceRefreshAuthToken(auth.currentUser);
      setIsEmailVerified(true);
      return;
    }
    try {
      await sendEmailVerification(auth.currentUser);
    } catch (err: any) {
      throw new Error(mapFirebaseAuthError(err, 'Pa ka voye imèl verifikasyon an kounye a.'));
    }
  }, []);

  const refreshAuthUserState = useCallback(async (): Promise<boolean> => {
    if (!auth.currentUser) return false;
    try {
      await auth.currentUser.reload();
      await forceRefreshAuthToken(auth.currentUser);
      clearVerifiedChurchCache();
      const verified = Boolean(auth.currentUser.emailVerified);
      const authUserData = buildAuthUserData(auth.currentUser);
      applyAuthenticatedUserState(authUserData, verified);
      return verified;
    } catch {
      return Boolean(auth.currentUser?.emailVerified);
    }
  }, [applyAuthenticatedUserState]);

  const signOutGoogle = useCallback(async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        try {
          await GoogleAuth.signOut();
        } catch (nativeSignOutErr) {
          console.warn('Native GoogleAuth signOut note:', nativeSignOutErr);
        }
      }
      await signOut(auth);
    } catch (err) {
      console.warn('Signout note:', err);
    } finally {
      clearVerifiedChurchCache();
      revokeAdminSession();
      clearChurchAdminLock();
      setGoogleUser(null);
      setDeveloperUser(null);
      setIsEmailVerified(false);
      localStorage.removeItem(LOCAL_STORAGE_GOOGLE_USER_KEY);
    }
  }, []);

  const linkMemberGoogleAccount = useCallback(
    (churchId: string, memberId: string, customUser?: GoogleAuthUser | null) => {
      const targetUser = customUser || googleUser;
      if (!targetUser || !targetUser.email) return false;
      if (isSuperDeveloperEmail(targetUser.email)) return false;
      const members = getMembersByChurch(churchId);
      const member = members.find(
        (m) => m.id === memberId || m.memberId.toUpperCase() === memberId.toUpperCase()
      );
      if (!member) return false;
      const updated = unifyMemberProfile(member, undefined, targetUser);
      updateMember(churchId, updated);
      return true;
    },
    [googleUser]
  );

  const unlinkMemberGoogleAccount = useCallback((churchId: string, memberId: string) => {
    const members = getMembersByChurch(churchId);
    const member = members.find(
      (m) => m.id === memberId || m.memberId.toUpperCase() === memberId.toUpperCase()
    );
    if (!member) return false;
    const preservedCustomPhoto = isCustomMemberPhoto(member.avatarUrl || member.photoUrl)
      ? member.avatarUrl || member.photoUrl
      : undefined;
    const updated: Member = {
      ...member,
      googleEmail: undefined,
      googleUid: undefined,
      googlePhoto: preservedCustomPhoto,
      avatarUrl: preservedCustomPhoto,
      photoUrl: preservedCustomPhoto,
    };
    updateMember(churchId, updated);
    return true;
  }, []);

  const linkChurchAdminGoogleAccount = useCallback(
    (
      churchId: string,
      customUser?: GoogleAuthUser | null,
      authMethod?: Church['adminAuthMethod']
    ) => {
      const targetUser = customUser || googleUser;
      if (!targetUser || !targetUser.email) return false;
      if (isSuperDeveloperEmail(targetUser.email)) return false;
      const church = getChurchById(churchId);
      if (!church) return false;
      const resolvedMethod: Church['adminAuthMethod'] =
        authMethod ||
        (church.adminAuthMethod === 'email_password' ? 'both' : 'google');
      const hasExistingCustomPhoto = isCustomMemberPhoto(church.adminGooglePhoto);
      const hasExplicitlyClearedPhoto =
        Boolean(church.adminGoogleEmail) && church.adminGooglePhoto === '';
      const resolvedAdminPhoto = hasExistingCustomPhoto
        ? church.adminGooglePhoto
        : hasExplicitlyClearedPhoto
        ? ''
        : church.adminGooglePhoto || targetUser.photoURL || undefined;
      const updated: Church = {
        ...church,
        adminGoogleEmail: targetUser.email.toLowerCase(),
        adminGoogleUid: targetUser.uid,
        adminGoogleName: targetUser.displayName || targetUser.email.split('@')[0],
        adminGooglePhoto: resolvedAdminPhoto,
        adminAuthMethod: resolvedMethod,
      };
      saveChurch(updated);
      return true;
    },
    [googleUser]
  );

  const linkChurchAdminEmailAccount = useCallback(
    (churchId: string, customUser?: GoogleAuthUser | null) => {
      const targetUser = customUser || googleUser;
      if (!targetUser || !targetUser.email) return false;
      if (isSuperDeveloperEmail(targetUser.email)) return false;
      const church = getChurchById(churchId);
      if (!church) return false;
      const updated: Church = {
        ...church,
        adminGoogleEmail: targetUser.email.toLowerCase(),
        adminGoogleUid: targetUser.uid,
        adminGoogleName: targetUser.displayName || targetUser.email.split('@')[0],
        adminAuthMethod:
          church.adminAuthMethod === 'google' ? 'both' : 'email_password',
      };
      saveChurch(updated);
      return true;
    },
    [googleUser]
  );

  const unlinkChurchAdminGoogleAccount = useCallback((churchId: string) => {
    const church = getChurchById(churchId);
    if (!church) return false;
    const preservedCustomPhoto = isCustomMemberPhoto(church.adminGooglePhoto)
      ? church.adminGooglePhoto
      : undefined;
    const updated: Church = {
      ...church,
      adminGoogleEmail: undefined,
      adminGoogleUid: undefined,
      adminGoogleName: undefined,
      adminGooglePhoto: preservedCustomPhoto,
      adminAuthMethod: church.adminPasscode ? 'legacy_pin' : undefined,
    };
    saveChurch(updated);
    return true;
  }, []);

  const findMemberByGoogleEmail = useCallback(
    (churchId: string, email?: string | null) => {
      if (!email) return undefined;
      if (isSuperDeveloperEmail(email)) return undefined;
      const cleanEmail = email.trim().toLowerCase();
      const members = getMembersByChurch(churchId);
      return members.find(
        (m) =>
          (m.googleEmail && m.googleEmail.toLowerCase() === cleanEmail) ||
          (m.email && m.email.toLowerCase() === cleanEmail)
      );
    },
    []
  );

  const findMemberByGoogleEmailAnyChurch = useCallback((email?: string | null) => {
    if (!email) return undefined;
    if (isSuperDeveloperEmail(email)) return undefined;
    const cleanEmail = email.trim().toLowerCase();
    const churches = getAllChurches();
    for (const ch of churches) {
      const members = getMembersByChurch(ch.id);
      const match = members.find(
        (m) =>
          (m.googleEmail && m.googleEmail.toLowerCase() === cleanEmail) ||
          (m.email && m.email.toLowerCase() === cleanEmail)
      );
      if (match) {
        return { member: match, churchId: ch.id, church: ch };
      }
    }
    return undefined;
  }, []);

  const autoCreateMemberFromGoogle = useCallback(
    (churchId: string, customUser?: GoogleAuthUser | null) => {
      const targetUser = customUser || googleUser;
      if (!targetUser || !targetUser.email) {
        throw new Error('Kont Google pa disponib pou kreye manm.');
      }
      if (isSuperDeveloperEmail(targetUser.email)) {
        throw new Error(RESERVED_DEV_ACCOUNT_ERROR);
      }
      const email = targetUser.email.trim().toLowerCase();
      const displayName = targetUser.displayName || email.split('@')[0] || 'Nouvo Manm';
      const defaultPin = generateSecureMemberPin();
      const newMember = addMember(churchId, {
        fullName: displayName,
        email,
        phone: '',
        dateOfBirth: '2000-01-01',
        department: 'Lwès',
        role: 'Manm',
        status: 'active',
        pin: defaultPin,
        avatarUrl: targetUser.photoURL || undefined,
        notes: `Kreye otomatikman atravè Google Sign-In (${email})`,
      });
      const updated = unifyMemberProfile(newMember, undefined, targetUser);
      updateMember(churchId, updated);
      return updated;
    },
    [googleUser]
  );

  return (
    <AuthContext.Provider
      value={{
        googleUser,
        developerUser,
        isEmailVerified,
        isLoadingAuth,
        signInWithGoogle,
        signInSuperDeveloperWithGoogle,
        registerChurchAdminWithEmail,
        signInChurchAdminWithEmail,
        sendChurchAdminPasswordReset,
        resendAdminVerificationEmail,
        refreshAuthUserState,
        signOutGoogle,
        linkMemberGoogleAccount,
        unlinkMemberGoogleAccount,
        linkChurchAdminGoogleAccount,
        linkChurchAdminEmailAccount,
        unlinkChurchAdminGoogleAccount,
        findMemberByGoogleEmail,
        findMemberByGoogleEmailAnyChurch,
        autoCreateMemberFromGoogle,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
