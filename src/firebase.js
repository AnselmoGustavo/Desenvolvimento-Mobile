import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAyrPJ5xjKardYUQKO7PejWJA-VfdqASYA",
  authDomain: "projeto-flora-yamaguti.firebaseapp.com",
  projectId: "projeto-flora-yamaguti",
  storageBucket: "projeto-flora-yamaguti.firebasestorage.app",
  messagingSenderId: "580000173724",
  appId: "1:580000173724:web:3dfc1ac5fa7ccea97f6759",
};

const app = initializeApp(firebaseConfig);

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache(),
});
