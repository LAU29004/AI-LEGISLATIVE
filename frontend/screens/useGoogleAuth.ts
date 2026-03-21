// useGoogleAuth.ts
import * as Google from "expo-auth-session/providers/google";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signOut,
  User,
} from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "./firebaseConfig";

WebBrowser.maybeCompleteAuthSession();

interface UseGoogleAuthReturn {
  promptAsync: () => Promise<void>;
  user: User | null;
  authLoading: boolean;
  signOutUser: () => Promise<void>;
}

export default function useGoogleAuth(
  onSuccess?: () => void,
): UseGoogleAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const extra = Constants.expoConfig?.extra;
  const redirectUri = "https://auth.expo.io/@laukik_waikar/AILegislative";
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId:
      "577613263729-5ou4f76pa7tmtr022aqve9fbugairdba.apps.googleusercontent.com",
    androidClientId:
      "577613263729-mb0de5jrd9b2rbcnvf4r0stik80svjp3.apps.googleusercontent.com",
    redirectUri: "https://auth.expo.io/@laukik_waikar/AILegislative",
    scopes: ["openid", "profile", "email"],
  });
  const handlePrompt = async () => {
    if (!request) {
      console.warn("[Auth] Request not ready");
      return;
    }
    await promptAsync(); // ignore return
  };
  console.log(redirectUri);
  useEffect(() => {
    if (response?.type === "success") {
      const { id_token } = response.params;
      if (!id_token) {
        console.error("[Auth] No id_token returned");
        return;
      }
      const credential = GoogleAuthProvider.credential(id_token);
      signInWithCredential(auth, credential)
        .then((result) => {
          console.log("[Auth] Signed in:", result.user.email);
          onSuccess?.();
        })
        .catch((e) =>
          console.error("[Auth] Firebase error:", e.code, e.message),
        );
    } else if (response?.type === "error") {
      console.error("[Auth] OAuth error:", response.error);
    }
  }, [response]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const signOutUser = async () => {
    await signOut(auth);
    setUser(null);
  };

  return { promptAsync: handlePrompt, user, authLoading, signOutUser };
}
