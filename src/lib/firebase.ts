import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInAnonymously,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  onSnapshot, 
  getDocFromServer,
  query,
  where,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Firestore with exact database ID from config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email || null,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on boot as mandated by skill
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('✅ Firebase Firestore connected successfully to project:', firebaseConfig.projectId);
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('⚠️ Firebase client is offline. Please check your network or Firebase configuration.');
    } else {
      console.log('Firebase connection test status:', error);
    }
    return false;
  }
}

// Automatically test connection and authenticate guest if needed
testConnection();
auth.onAuthStateChanged((user) => {
  if (!user) {
    signInAnonymously(auth).catch(() => {});
  }
});

// Auth Helpers
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
}

export async function signInGuest() {
  try {
    const result = await signInAnonymously(auth);
    return result.user;
  } catch (error) {
    console.error('Error signing in anonymously:', error);
    throw error;
  }
}

export async function logOut() {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

// Synchronize all app data to Firestore
export async function syncAllDataToFirestore(data: {
  trabajadores?: any[];
  programas?: any[];
  programaGeneral?: any[];
  detalleJabas?: any[];
  validaciones?: any[];
  grupos?: any[];
  lideres?: any[];
  usuarios?: any[];
  userEmail?: string;
}) {
  const path = 'app_state/master_data';
  try {
    await setDoc(doc(db, 'app_state', 'master_data'), {
      trabajadores: data.trabajadores || [],
      programas: data.programas || [],
      programaGeneral: data.programaGeneral || [],
      detalleJabas: data.detalleJabas || [],
      validaciones: data.validaciones || [],
      grupos: data.grupos || [],
      lideres: data.lideres || [],
      usuarios: data.usuarios || [],
      version: 10,
      lastUpdated: new Date().toISOString(),
      updatedBy: data.userEmail || auth.currentUser?.email || 'App User'
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Fetch all app data from Firestore
export async function fetchAllDataFromFirestore() {
  const path = 'app_state/master_data';
  try {
    const snap = await getDoc(doc(db, 'app_state', 'master_data'));
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

// Real-time listener for Firestore master data
export function subscribeToFirestoreMasterData(
  onData: (data: any) => void,
  onError?: (err: any) => void
) {
  const path = 'app_state/master_data';
  return onSnapshot(
    doc(db, 'app_state', 'master_data'),
    (snapshot) => {
      if (snapshot.exists()) {
        onData(snapshot.data());
      }
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}
