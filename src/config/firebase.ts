// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAPCb1SEsMCPZJBqFOEKluepRJ_hzimiEs",
  authDomain: "makeagend-ec655.firebaseapp.com",
  databaseURL: "https://makeagend-ec655-default-rtdb.firebaseio.com/",
  projectId: "makeagend-ec655",
  storageBucket: "makeagend-ec655.firebasestorage.app",
  messagingSenderId: "1037446080298",
  appId: "1:1037446080298:web:b3b4482f68a452985e2053",
  measurementId: "G-L6D17P8H8H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const analytics = getAnalytics(app);
export const database = getDatabase(app);
export const auth = getAuth(app);

// Debug Firebase initialization
console.log('Firebase initialized:', app.name);
console.log('Auth instance:', auth);
console.log('Database instance:', database);

export default app;
