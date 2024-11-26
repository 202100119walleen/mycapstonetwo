// src/firebase/firebase-config.js

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, FacebookAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'; // Import Firestore
import { getStorage } from 'firebase/storage'; // Import Storage

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBO997kWYHadeaJKPvw_SjUBhFpebIeXFo",
  authDomain: "myspcinv1.firebaseapp.com",
  projectId: "myspcinv1",
  storageBucket: "myspcinv1.appspot.com",
  messagingSenderId: "765439066274",
  appId: "1:765439066274:web:34de3b8a8376de2a0ed7fb",
  measurementId: "G-5VSST79WDZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);

// Initialize Firestore and Storage
const db = getFirestore(app);
const storage = getStorage(app); // Initialize Storage

// Initialize Google and Facebook Auth Providers
const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();

// Export the auth, db, storage, and providers
export { auth, db, storage, googleProvider, facebookProvider };
