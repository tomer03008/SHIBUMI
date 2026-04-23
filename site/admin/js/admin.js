/* Shibumi Admin — auth + common admin utilities.
 *
 * Auth model: this is a static-site admin. We store credentials and data
 * in localStorage. This is NOT production security — it's a working
 * control panel for a prototype. To run behind a real server later,
 * swap the auth calls with API calls and leave the UI identical.
 *
 * Default credentials (user MUST change on first login):
 *   username: ShibumiEstate_Admin
 *   password: Sb#8mL4$pK9wN@xT6yR!Z2
 *
 * Password policy enforced on CHANGE:
 *   - min 12 chars
 *   - at least one uppercase, one lowercase, one digit, one symbol
 *   - cannot equal previous password
 */

const ADMIN_DEFAULTS = {
  username: "ShibumiEstate_Admin",
  password: "Sb#8mL4$pK9wN@xT6yR!Z2",
};

const AUTH_KEY   = "shibumi:admin:credentials";
const SESSION    = "shibumi:admin:session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

/* ---- SHA-256 via SubtleCrypto ---- */

async function sha256Hex(s) {
  const enc = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}
async function hashPassword(pw, salt) {
  return sha256Hex(salt + "::" + pw + "::shibumi");
}

function randomSalt() {
  const a = new Uint8Array(12);
  crypto.getRandomValues(a);
  return Array.from(a).map(b => b.toString(16).padStart(2, "0")).join("");
}

/* ---- Credentials init / read ---- */

async function initCredentials() {
  const raw = localStorage.getItem(AUTH_KEY);
  if (raw) return JSON.parse(raw);
  const salt = randomSalt();
  const hash = await hashPassword(ADMIN_DEFAULTS.password, salt);
  const creds = {
    username: ADMIN_DEFAULTS.username,
    salt,
    hash,
    createdAt: Date.now(),
  };
  localStorage.setItem(AUTH_KEY, JSON.stringify(creds));
  return creds;
}

async function getCredentials() {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return initCredentials();
  return JSON.parse(raw);
}

async function saveCredentials(username, password) {
  const salt = randomSalt();
  const hash = await hashPassword(password, salt);
  localStorage.setItem(AUTH_KEY, JSON.stringify({
    username, salt, hash, updatedAt: Date.now(),
  }));
}

async function verifyLogin(username, password) {
  const creds = await getCredentials();
  if (username !== creds.username) return false;
  const hash = await hashPassword(password, creds.salt);
  return hash === creds.hash;
}

/* ---- Session ---- */

function createSession() {
  sessionStorage.setItem(SESSION, JSON.stringify({ t: Date.now() }));
}
function clearSession() {
  sessionStorage.removeItem(SESSION);
}
function hasSession() {
  const raw = sessionStorage.getItem(SESSION);
  if (!raw) return false;
  try {
    const s = JSON.parse(raw);
    if (!s.t) return false;
    return (Date.now() - s.t) < SESSION_TTL_MS;
  } catch { return false; }
}
function requireSession() {
  if (!hasSession()) location.replace("/admin/index.html");
}

/* ---- Password strength ---- */

function passwordStrength(pw) {
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length >= 16) score++;
  return Math.min(score, 5);
}

function passwordIssues(pw) {
  const issues = [];
  if (pw.length < 12) issues.push("לפחות 12 תווים");
  if (!/[a-z]/.test(pw)) issues.push("אות קטנה באנגלית");
  if (!/[A-Z]/.test(pw)) issues.push("אות גדולה באנגלית");
  if (!/\d/.test(pw)) issues.push("מספר");
  if (!/[^A-Za-z0-9]/.test(pw)) issues.push("תו מיוחד (!@#$% וכו')");
  return issues;
}

/* ---- Toast ---- */

function toast(msg, kind = "ok") {
  let stack = document.querySelector(".toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "toast-stack";
    document.body.appendChild(stack);
  }
  const el = document.createElement("div");
  el.className = "toast toast--" + (kind === "err" ? "err" : "ok");
  el.textContent = msg;
  stack.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transition = "opacity 300ms";
    setTimeout(() => el.remove(), 320);
  }, 3400);
}

/* ---- Escape HTML ---- */

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ---- Logout ---- */

function logout() {
  clearSession();
  location.replace("/admin/index.html");
}

window.ShibumiAdmin = {
  initCredentials, getCredentials, saveCredentials, verifyLogin,
  createSession, clearSession, hasSession, requireSession,
  passwordStrength, passwordIssues,
  hashPassword, randomSalt,
  toast, escapeHtml, logout,
  ADMIN_DEFAULTS,
};
