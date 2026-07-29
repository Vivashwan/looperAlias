"use client";
import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { getAuth, signInWithCustomToken, signOut } from "firebase/auth";
import { app } from "@/config/firebaseConfig";

/**
 * Bridges Clerk auth → Firebase Auth.
 *
 * The app reads/writes Firestore directly from the browser. Without this, it
 * connects anonymously (request.auth == null), so Firestore rules can't tell
 * users apart and must stay fully open. This mints a Firebase custom token via
 * Clerk's "integration_firebase" JWT template and signs the user in, so rules
 * can authorize by identity.
 *
 * The Clerk JWT template must be named "firebase" (Clerk reserves the
 * "integration_" prefix, so it can't be called "integration_firebase").
 *
 * FAIL-SAFE BY DESIGN: if the Clerk template isn't configured yet, this logs a
 * warning and does nothing — the app keeps working under the current (open)
 * rules. Only once this successfully signs in should you deploy firestore.rules.
 *
 * Renders nothing.
 */
export function FirebaseAuthBridge() {
  const { getToken, isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    const auth = getAuth(app);
    let cancelled = false;

    (async () => {
      try {
        if (isSignedIn) {
          const token = await getToken({ template: "firebase" });
          if (token && !cancelled) {
            await signInWithCustomToken(auth, token);
          }
        } else if (auth.currentUser) {
          await signOut(auth);
        }
      } catch (error) {
        // Most likely: the "integration_firebase" template isn't set up in
        // Clerk yet. Don't break the app — Firestore still works under the
        // current rules until the bridge is live and stricter rules deploy.
        console.warn(
          "[FirebaseAuthBridge] Firebase sign-in skipped:",
          error?.message || error
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken]);

  return null;
}
