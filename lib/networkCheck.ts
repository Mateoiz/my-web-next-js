let _isFirebaseBlocked: boolean | null = null;

export async function isFirebaseBlocked(): Promise<boolean> {
  if (_isFirebaseBlocked !== null) return _isFirebaseBlocked;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    await fetch(
      "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=test",
      { method: "POST", body: "{}", signal: controller.signal }
    );
    clearTimeout(timeout);
    _isFirebaseBlocked = false;
  } catch {
    _isFirebaseBlocked = true;
  }

  return _isFirebaseBlocked;
}

export function resetBlockedCache() {
  _isFirebaseBlocked = null;
}