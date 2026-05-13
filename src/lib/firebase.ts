import { initializeApp, getApps } from "firebase/app";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC0JuhK3JgAO2o7AyfZPy3MLXuNIj4IhM4",
  authDomain: "digigold-2d74a.firebaseapp.com",
  projectId: "digigold-2d74a",
  storageBucket: "digigold-2d74a.firebasestorage.app",
  messagingSenderId: "935549858148",
  appId: "1:935549858148:web:282f9a1c5ac96c22340a71",
  measurementId: "G-QDG0S4H3M9",
};

// Prevent duplicate initialization in Next.js dev mode
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
} catch {
  firestoreDb = getFirestore(app);
}

export const db  = firestoreDb;
export const auth = getAuth(app);
export default app;
