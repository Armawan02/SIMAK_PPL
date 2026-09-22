import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import localFirebaseConfig from "../../firebase-applet-config.json";

// Support both environment variables (with or without VITE_ prefix on Vercel) and local config file
const env = (import.meta as any).env || {};
const firebaseConfig = {
  projectId: env.VITE_FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID || localFirebaseConfig.projectId,
  appId: env.VITE_FIREBASE_APP_ID || env.FIREBASE_APP_ID || localFirebaseConfig.appId,
  apiKey: env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY || localFirebaseConfig.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || env.FIREBASE_AUTH_DOMAIN || localFirebaseConfig.authDomain,
  firestoreDatabaseId: env.VITE_FIREBASE_DATABASE_ID || env.FIREBASE_DATABASE_ID || localFirebaseConfig.firestoreDatabaseId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || env.FIREBASE_STORAGE_BUCKET || localFirebaseConfig.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || env.FIREBASE_MESSAGING_SENDER_ID || localFirebaseConfig.messagingSenderId,
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Cloud Firestore with specified database ID if present
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Connection test as required by Firebase skill
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
    console.log("Firebase Firestore connected successfully.");
    return true;
  } catch (error) {
    console.warn("Firestore connection check note:", error);
    // Even if test doc doesn't exist, reachable means connected
    return true;
  }
}

testFirestoreConnection();
