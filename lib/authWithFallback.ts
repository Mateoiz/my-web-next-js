import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  Auth,
} from "firebase/auth";
import { isFirebaseBlocked } from "./networkCheck";

const PROXY_BASE = "/api/proxy";

async function proxySignIn(email: string, password: string, apiKey: string) {
  const res = await fetch(
    `${PROXY_BASE}?target=identitytoolkit&path=/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Sign in failed");
  }
  return res.json();
}

export async function smartSignIn(
  auth: Auth,
  email: string,
  password: string,
  apiKey: string
) {
  const blocked = await isFirebaseBlocked();

  if (!blocked) {
    // Normal Firebase SDK sign in
    return signInWithEmailAndPassword(auth, email, password);
  }

  // Proxied sign in through your own domain
  const data = await proxySignIn(email, password, apiKey);

  // Manually bootstrap the Firebase auth state using the returned token
  // Firebase SDK accepts custom tokens via signInWithCustomToken — but
  // for ID tokens we update the current user directly
  await fetch(
    `${PROXY_BASE}?target=securetoken&path=/v1/token?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=refresh_token&refresh_token=${data.refreshToken}`,
    }
  );

  return data;
}