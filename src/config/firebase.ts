import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBIGFCbr51d6YWb1Efs3_m61wIT01mcK_o",
  authDomain: "pich-app-51961.firebaseapp.com",
  projectId: "pich-app-51961",
  storageBucket: "pich-app-51961.firebasestorage.app",
  messagingSenderId: "308003142827",
  appId: "1:308003142827:web:bd758f5a64040706338bee"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;