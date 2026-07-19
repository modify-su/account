import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  doc, 
  deleteDoc, 
  setDoc 
} from "firebase/firestore";

// Default Hardcoded Firebase Configuration Fallback
// วางค่า Firebase Config ของคุณที่นี่เพื่อให้แอปเชื่อมต่ออัตโนมัติทุกอุปกรณ์โดยไม่ต้องตั้งค่าในบราวเซอร์
const DEFAULT_CONFIG = {
  apiKey: "AIzaSyBqLwYJ9m8VZxLHprterX_o-0AiAR9kSAM",
  authDomain: "smart-3c6d8.firebaseapp.com",
  projectId: "smart-3c6d8",
  storageBucket: "smart-3c6d8.firebasestorage.app",
  messagingSenderId: "314812614488",
  appId: "1:314812614488:web:79a2696302699414be472d"
};

// Helper to retrieve firebase config from settings/localStorage
export const getFirebaseConfig = () => {
  const saved = localStorage.getItem("flowledger_firebase_config");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Invalid Firebase Config saved:", e);
    }
  }
  
  // คืนค่า Config เริ่มต้น หากกรอกรายละเอียดด้านบนไว้
  if (DEFAULT_CONFIG && DEFAULT_CONFIG.apiKey) {
    return DEFAULT_CONFIG;
  }
  
  return null;
};

// Check if Firebase is fully configured
export const isFirebaseConfigured = () => {
  const mode = localStorage.getItem("flowledger_db_mode");
  if (mode === "local") return false;
  return !!getFirebaseConfig();
};

let app = null;
let db = null;

export const initFirebase = () => {
  if (!isFirebaseConfigured()) return null;
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
  
  // Get local items first
  const localSaved = localStorage.getItem(storageKey);
  let localList = [];
  try {
    localList = localSaved ? JSON.parse(localSaved) : [];
  } catch (e) {
    console.error(e);
  }
  
  const migrationKey = `flowledger_migrated_${collectionName}`;
  const alreadyMigrated = localStorage.getItem(migrationKey) === "true";

  if (!firebaseInstance || !firebaseInstance.db) {
    // Fallback: load from localStorage
    const initial = localList.length > 0 ? localList : fallbackData;
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
    
    // Auto-migration & Seeding: If Firestore is empty, upload local data or seed defaults (for users)
    if (!alreadyMigrated && snapshot.empty) {
      const listToUpload = localList.length > 0 ? localList : (collectionName === 'users' ? fallbackData : []);
      if (listToUpload.length > 0) {
        console.log(`Migrating/Seeding data for ${collectionName} to Firestore...`);
        listToUpload.forEach(item => {
          saveDocToCloud(collectionName, item);
        });
        localStorage.setItem(migrationKey, "true");
        return;
      }
    }
    
    localStorage.setItem(migrationKey, "true");
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
