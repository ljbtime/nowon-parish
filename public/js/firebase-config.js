// Firebase 공통 설정
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyDTzBvhJQT8SB8r18kDkt7qo3XHCxrynwY",
  authDomain: "nowon-catholic.firebaseapp.com",
  projectId: "nowon-catholic",
  storageBucket: "nowon-catholic.firebasestorage.app",
  messagingSenderId: "721338735200",
  appId: "1:721338735200:web:0d32f6dc82c0d967994105"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
