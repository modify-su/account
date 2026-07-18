import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  doc, 
  deleteDoc, 
  setDoc 
} from "firebase/firestore";

// Helper to retrieve firebase config from settings/localStorage
export const getFirebaseConfig = () => {
  const saved = localStorage.getItem("flowledger_firebase_config");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Invalid Firebase Config saved:", e);
      return null;
    }
  }
  return null;
};

// Check if Firebase is fully configured
export const isFirebaseConfigured = () => {
  return !!getFirebaseConfig();
};

let app = null;
let db = null;

export const initFirebase = () => {
  const config = getFirebaseConfig();
  if (!config) return null;

  try {
    if (getApps().length === 0) {
      app = initializeApp(config);
    } else {
      app = getApp();
    }
    db = getFirestore(app);
    return { app, db };
  } catch (err) {
    console.error("Firebase init error:", err);
    return null;
  }
};

const collectionKeyMap = {
  transactions: 'flowledger_txs_v3',
  invoices: 'flowledger_invs_v3',
  pos_products: 'pos_products',
  users: 'users',
  documents: 'flowledger_docs_v3',
  chat_messages: 'flowledger_chat_messages_v3',
  settings: 'office_settings',
  salaries: 'flowledger_salaries_v3',
  payroll_history: 'flowledger_payroll_history_v3'
};

const getLocalStorageKey = (collectionName) => {
  return collectionKeyMap[collectionName] || `flowledger_${collectionName}_v3`;
};

// Real-time synchronization helper
export const subscribeToCollection = (collectionName, onUpdate, fallbackData) => {
  const firebaseInstance = initFirebase();
  const storageKey = getLocalStorageKey(collectionName);
  
  if (!firebaseInstance || !firebaseInstance.db) {
    // Fallback: load from localStorage
    const saved = localStorage.getItem(storageKey);
    const initial = saved ? JSON.parse(saved) : fallbackData;
    onUpdate(initial);
    return () => {}; // Return empty unsubscriber
  }

  const { db } = firebaseInstance;
  const colRef = collection(db, collectionName);
  
  // Create snapshot listener
  const unsub = onSnapshot(colRef, (snapshot) => {
    const list = [];
    snapshot.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() });
    });
    
    onUpdate(list);
    
    // Also mirror to localStorage for offline fallback
    localStorage.setItem(storageKey, JSON.stringify(list));
  }, (err) => {
    console.error(`Error subscribing to ${collectionName}:`, err);
  });

  return unsub;
};

// Add / Update item helper
export const saveDocToCloud = async (collectionName, docData) => {
  const firebaseInstance = initFirebase();
  if (!firebaseInstance || !firebaseInstance.db) {
    return null;
  }
  const { db } = firebaseInstance;
  
  const id = docData.id || `doc_${Date.now()}`;
  const docRef = doc(db, collectionName, id);
  
  const cleanData = { ...docData };
  delete cleanData.id;

  await setDoc(docRef, cleanData);
  return id;
};

// Delete item helper
export const deleteDocFromCloud = async (collectionName, docId) => {
  const firebaseInstance = initFirebase();
  if (!firebaseInstance || !firebaseInstance.db) {
    return;
  }
  const { db } = firebaseInstance;
  const docRef = doc(db, collectionName, docId);
  await deleteDoc(docRef);
};
