import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithCredential,
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
} from '../utils/storage';

export interface AuthContextType {
  googleUser: GoogleAuthUser | null;
  isLoadingAuth: boolean;
  signInWithGoogle: () => Promise<GoogleAuthUser>;
  signOutGoogle: () => Promise<void>;
  linkMemberGoogleAccount: (
    churchId: string,
    memberId: string,
    customUser?: GoogleAuthUser | null
  ) => boolean;
  unlinkMemberGoogleAccount: (churchId: string, memberId: string) => boolean;
  linkChurchAdminGoogleAccount: (
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [googleUser, setGoogleUser] = useState<GoogleAuthUser | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_GOOGLE_USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);

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
          const user = result.user;
          const authUserData: GoogleAuthUser = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email?.split('@')[0] || 'Itilizatè Google',
            photoURL: user.photoURL,
          };
          setGoogleUser(authUserData);
          localStorage.setItem(LOCAL_STORAGE_GOOGLE_USER_KEY, JSON.stringify(authUserData));
        }
      })
      .catch((err) => {
        console.warn('Firebase getRedirectResult note:', err?.message || err);
      });
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const authUserData: GoogleAuthUser = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0] || 'Itilizatè Google',
          photoURL: user.photoURL,
        };
        setGoogleUser(authUserData);
        localStorage.setItem(LOCAL_STORAGE_GOOGLE_USER_KEY, JSON.stringify(authUserData));
      } else {
        const saved = localStorage.getItem(LOCAL_STORAGE_GOOGLE_USER_KEY);
        if (!saved) {
          setGoogleUser(null);
        }
      }
      setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<GoogleAuthUser> => {
    setIsLoadingAuth(true);
    if (Capacitor.isNativePlatform()) {
      try {
        const nativeUser = await GoogleAuth.signIn();
        if (nativeUser && nativeUser.authentication?.idToken) {
          const credential = GoogleAuthProvider.credential(nativeUser.authentication.idToken);
          const fbCredential = await signInWithCredential(auth, credential);
          const user = fbCredential.user;
          const authUserData: GoogleAuthUser = {
            uid: user.uid,
            email: user.email || nativeUser.email,
            displayName:
              user.displayName ||
              nativeUser.name ||
              user.email?.split('@')[0] ||
              'Itilizatè Google',
            photoURL: user.photoURL || nativeUser.imageUrl,
          };
          setGoogleUser(authUserData);
          localStorage.setItem(LOCAL_STORAGE_GOOGLE_USER_KEY, JSON.stringify(authUserData));
          setIsLoadingAuth(false);
          return authUserData;
        }
      } catch (nativeErr) {
        console.warn('Native GoogleAuth sign-in fallback to web popup:', nativeErr);
      }
    }

    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const user = result.user;
      const authUserData: GoogleAuthUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0] || 'Itilizatè Google',
        photoURL: user.photoURL,
      };
      setGoogleUser(authUserData);
      localStorage.setItem(LOCAL_STORAGE_GOOGLE_USER_KEY, JSON.stringify(authUserData));
      setIsLoadingAuth(false);
      return authUserData;
    } catch (err: any) {
      setIsLoadingAuth(false);
      throw new Error(
        err?.message?.includes('action is invalid')
          ? 'Aksyon an pa valab kounye a oswa fenèt la te fèmen. Tanpri re-eseye.'
          : err?.message || 'Erè otantifikasyon Google.'
      );
    }
  }, []);

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
      console.warn('Firebase signout note:', err);
    } finally {
      revokeAdminSession();
      setGoogleUser(null);
      localStorage.removeItem(LOCAL_STORAGE_GOOGLE_USER_KEY);
    }
  }, []);

  const linkMemberGoogleAccount = useCallback(
    (churchId: string, memberId: string, customUser?: GoogleAuthUser | null) => {
      const targetUser = customUser || googleUser;
      if (!targetUser || !targetUser.email) return false;
      const members = getMembersByChurch(churchId);
      const member = members.find(
        (m) => m.id === memberId || m.memberId.toUpperCase() === memberId.toUpperCase()
      );
      if (!member) return false;
      const updated: Member = {
        ...member,
        googleEmail: targetUser.email.toLowerCase(),
        googleUid: targetUser.uid,
        googlePhoto: targetUser.photoURL || member.avatarUrl,
      };
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
    const updated: Member = {
      ...member,
      googleEmail: undefined,
      googleUid: undefined,
      googlePhoto: undefined,
    };
    updateMember(churchId, updated);
    return true;
  }, []);

  const linkChurchAdminGoogleAccount = useCallback(
    (churchId: string, customUser?: GoogleAuthUser | null) => {
      const targetUser = customUser || googleUser;
      if (!targetUser || !targetUser.email) return false;
      const church = getChurchById(churchId);
      if (!church) return false;
      const updated: Church = {
        ...church,
        adminGoogleEmail: targetUser.email.toLowerCase(),
        adminGoogleUid: targetUser.uid,
        adminGoogleName: targetUser.displayName || targetUser.email.split('@')[0],
        adminGooglePhoto: targetUser.photoURL || undefined,
      };
      saveChurch(updated);
      return true;
    },
    [googleUser]
  );

  const unlinkChurchAdminGoogleAccount = useCallback((churchId: string) => {
    const church = getChurchById(churchId);
    if (!church) return false;
    const updated: Church = {
      ...church,
      adminGoogleEmail: undefined,
      adminGoogleUid: undefined,
      adminGoogleName: undefined,
      adminGooglePhoto: undefined,
    };
    saveChurch(updated);
    return true;
  }, []);

  const findMemberByGoogleEmail = useCallback(
    (churchId: string, email?: string | null) => {
      if (!email) return undefined;
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
      const updated: Member = {
        ...newMember,
        googleEmail: email,
        googleUid: targetUser.uid,
        googlePhoto: targetUser.photoURL || newMember.avatarUrl,
      };
      updateMember(churchId, updated);
      return updated;
    },
    [googleUser]
  );

  return (
    <AuthContext.Provider
      value={{
        googleUser,
        isLoadingAuth,
        signInWithGoogle,
        signOutGoogle,
        linkMemberGoogleAccount,
        unlinkMemberGoogleAccount,
        linkChurchAdminGoogleAccount,
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
