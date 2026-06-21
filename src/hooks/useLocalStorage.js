import { useState, useEffect, useCallback } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase";

const COLLECTION = "flora-data";

export function useLocalStorage(key, initial) {
  const [state, setState] = useState(initial);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const ref = doc(db, COLLECTION, key);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setState(snap.data().value ?? initial);
        } else {
          const legacy = localStorage.getItem(key);
          if (legacy) {
            try {
              const parsed = JSON.parse(legacy);
              setState(parsed);
              setDoc(ref, { value: parsed });
              localStorage.removeItem(key);
            } catch { }
          }
        }
        setReady(true);
      },
      () => setReady(true)
    );
    return unsub;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const set = useCallback(
    (val) => {
      setState((prev) => {
        const next = typeof val === "function" ? val(prev) : val;
        setDoc(doc(db, COLLECTION, key), { value: next });
        return next;
      });
    },
    [key]
  );

  return [state, set, ready];
}
