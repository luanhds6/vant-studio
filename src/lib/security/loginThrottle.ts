const STORAGE_KEY = "vant-login-throttle-v1";
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

type Entry = { count: number; firstAttemptAt: number };

function load(): Record<string, Entry> {
  if (typeof sessionStorage === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, Entry>) : {};
  } catch {
    return {};
  }
}

function save(data: Record<string, Entry>): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* quota / modo privado */
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function checkLoginAllowed(email: string): {
  allowed: boolean;
  retryAfterMs?: number;
} {
  const key = normalizeEmail(email);
  const now = Date.now();
  const entry = load()[key];
  if (!entry) return { allowed: true };
  if (now - entry.firstAttemptAt > WINDOW_MS) return { allowed: true };
  if (entry.count < MAX_ATTEMPTS) return { allowed: true };
  const retryAfterMs = WINDOW_MS - (now - entry.firstAttemptAt);
  return { allowed: false, retryAfterMs: Math.max(0, retryAfterMs) };
}

export function recordLoginFailure(email: string): void {
  const key = normalizeEmail(email);
  const now = Date.now();
  const all = load();
  const prev = all[key];
  if (!prev || now - prev.firstAttemptAt > WINDOW_MS) {
    all[key] = { count: 1, firstAttemptAt: now };
  } else {
    all[key] = { count: prev.count + 1, firstAttemptAt: prev.firstAttemptAt };
  }
  save(all);
}

export function clearLoginAttempts(email: string): void {
  const key = normalizeEmail(email);
  const all = load();
  delete all[key];
  save(all);
}
