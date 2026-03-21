// firebaseConfig.ts
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getReactNativePersistence, initializeAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyATovCL4GD3MGsAdMu3-fwxFBXvZFU1gUE",
  authDomain: "ai-legislative.firebaseapp.com",
  projectId: "ai-legislative",
  storageBucket: "ai-legislative.firebasestorage.app",
  messagingSenderId: "577613263729",
  appId: "1:577613263729:web:2a1c4d9368c9ba09c1bcd0",
  measurementId: "G-T36P7N58KE",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

export default app;
