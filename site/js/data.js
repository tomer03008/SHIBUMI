/* Shibumi — data layer
 * Loads properties.json, classifies, caches, serves to pages.
 *
 * The scraper produced one list where titles include status words:
 *   "נמכר!", "הושכר", "לא אקטואלי"
 * We only keep truly active listings for the public site, and
 * use them for admin stats.
 */

const PROPERTIES_JSON = "shibumi_properties/properties.json";

/** נתיב ל־JSON ולתמונות: מתוך site/ זה ../ ; מתוך site/admin/ זה ../../ */
function assetBase() {
  if (typeof window.SHIBUMI_ASSET_BASE === "string" && window.SHIBUMI_ASSET_BASE)
    return window.SHIBUMI_ASSET_BASE;
  try {
    const path = (window.location && window.location.pathname) ? window.location.pathname : "";
    if (/\/admin\//i.test(path) || /\\admin\\/i.test(path)) return "../../";
  } catch (_) {}
  return "../";
}

const STATUS_KEYWORDS = {
  sold:     ["נמכר", "נמכר!"],
  rented:   ["הושכר"],
  inactive: ["לא אקטואלי", "לא רלוונטי", "לא רלווינטי"],
};

const REGIONS = [
  { key: "north",        label: "צפון · עמק יזרעאל",  test: /עמק יזרעאל|יזרעאל|גליל|כרמל|צפון/ },
  { key: "coast",        label: "חוף הים",             test: /בית ינאי|מכמורת|חופית|ויתקין|ביתן אהרון|עמיקם|צוקי ים|עין הים|נתניה|ארסוף|יפו|חוף|על הים|קו ראשון|ליד הים|סביבת הים/ },
  { key: "sharon-hefer", label: "השרון · עמק חפר",    test: /עמק חפר|רשפון|נווה ירק|בני ציון|פסטורלי|שדה ו?ורבורג|רמות השבים|בצרה|בת חן|שרון|מושב|במרכז/ },
  { key: "herzliya-ta",  label: "הרצליה · תל אביב",   test: /הרצליה|תל אביב/ },
  { key: "other",        label: "נכסים נוספים",        test: /./ },
];

const TYPES = [
  { key: "nachala",  label: "נחלות · משקים",   test: /נחלה|משק/ },
  { key: "apartment",label: "דירות · פנטהאוז", test: /דירה|דירות|דירת|פנטהאוז|דופלקס|מגדל/ },
  { key: "villa",    label: "וילות · בתים",    test: /וילה|וילת|וילות|אחוזה|בית/ },
  { key: "other",    label: "נכסי יוקרה",       test: /./ },
];

/* Back-compat for old URLs / saved links */
const REGION_ALIASES = {
  "emek": "north",
  "sharon-coast": "coast",
};

function classifyStatus(title) {
  const t = title || "";
  for (const [status, kws] of Object.entries(STATUS_KEYWORDS)) {
    if (kws.some(k => t.includes(k))) return status;
  }
  return "active";
}

function classifyRegion(title) {
  const t = title || "";
  for (const r of REGIONS) {
    if (r.test.test(t)) return r;
  }
  return REGIONS[REGIONS.length - 1];
}

function classifyType(title) {
  const t = title || "";
  for (const ty of TYPES) {
    if (ty.test.test(t)) return ty;
  }
  return TYPES[TYPES.length - 1];
}

/* Clean the title for display — drop trailing dash-status markers */
function cleanTitle(title) {
  return (title || "")
    .replace(/\s*[-–]\s*(נמכר!?|הושכר|לא אקטואלי|לא רלוונטי|לא רלווינטי)\s*$/u, "")
    .replace(/\s*(נמכר!?|הושכר)\s*$/u, "")
    .trim();
}

function slugify(title) {
  return (title || "")
    .replace(/[\\/?"#:*<>|]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 80);
}

/** מקטעי נתיב עם תווים לא־ASCII (למשל שמות תיקיות בעברית) — ללא קידוד של . ו־.. */
function encodeRelativePathSegments(rel) {
  return String(rel)
    .replace(/\\/g, "/")
    .split("/")
    .map(seg => {
      if (!seg || seg === "." || seg === "..") return seg;
      try {
        return encodeURIComponent(seg);
      } catch (_) {
        return seg;
      }
    })
    .join("/");
}

/**
 * תמונות לתצוגה: קודם image_urls (HTTPS — עובד גם בלי תיקיית images מקומית),
 * אחרת קבצים תחת shibumi_properties עם קידוד נתיב.
 */
function resolvedGalleryUrls(prop) {
  const remotes = prop.image_urls;
  if (Array.isArray(remotes) && remotes.length) {
    const out = remotes.map(u => String(u).trim()).filter(Boolean);
    if (out.length) return out;
  }
  const locals = prop.local_images || [];
  if (locals.length) {
    return locals.map(p => assetBase() + encodeRelativePathSegments(p));
  }
  return [];
}

function firstImage(prop) {
  const imgs = resolvedGalleryUrls(prop);
  return imgs[0] || null;
}

function allImages(prop) {
  return resolvedGalleryUrls(prop);
}

function priceDisplay(raw) {
  if (!raw) return "מחיר בפנייה";
  const s = raw.trim();
  if (/p\.?0\.?r/i.test(s) || /p\.o\.r/i.test(s)) return "מחיר בפנייה";
  return s;
}

/** מחיר בשקלים למיון וסינון; null כשאין מספר אמין (P.O.R, ריק, טקסט חופשי) */
function parsePriceNisRaw(raw) {
  if (raw == null) return null;
  const s0 = String(raw).trim();
  if (!s0) return null;
  const por = s0.replace(/[\s.\u2019\u0027]/g, "").toLowerCase();
  if (/^p\.?o\.?r$|^por$|^p0r$/.test(por)) return null;
  if (/מחיר\s*בפנייה|^בפנייה$/i.test(s0)) return null;
  const s = s0.replace(/\u00A0|\u202F/g, " ").replace(/ש["״']?ח|nis|₪/gi, "").trim();
  const m = s.match(/(\d{1,3}(?:,\d{3})+|\d{1,3}(?:\.\d{3})+|\d{4,})/);
  if (m) {
    let numStr = m[1];
    if (numStr.includes(",")) numStr = numStr.replace(/,/g, "");
    else if (/\.\d{3}/.test(numStr)) numStr = numStr.replace(/\./g, "");
    const n = parseInt(numStr, 10);
    return Number.isFinite(n) && n >= 10_000 ? n : null;
  }
  const digits = s.replace(/[^\d]/g, "");
  if (digits.length >= 5) {
    const n = parseInt(digits, 10);
    return Number.isFinite(n) && n >= 10_000 ? n : null;
  }
  return null;
}

const STATUS_SET = new Set(["active", "sold", "rented", "inactive"]);
const CUSTOM_KEY = "shibumi:admin:customProperties";

function getCustomRawList() {
  try {
    const t = localStorage.getItem(CUSTOM_KEY);
    const a = t ? JSON.parse(t) : [];
    return Array.isArray(a) ? a : [];
  } catch (_) {
    return [];
  }
}

function setCustomRawList(arr) {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(arr));
  invalidatePropertiesCache();
}

function isAdminCreatedId(id) {
  return typeof id === "string" && id.startsWith("admin-");
}

/** מיזוג שדות עריכה (כולל אזור/סוג לפי מפתחות) — לשימוש באדמין וב־applyAdminOverrides */
function mergeListingFields(p, o) {
  if (!o) return p;
  const m = { ...p, ...o };
  if (o.regionKey) {
    const r = REGIONS.find(x => x.key === o.regionKey);
    if (r) m.region = r;
  }
  if (o.typeKey) {
    const ty = TYPES.find(x => x.key === o.typeKey);
    if (ty) m.type = ty;
  }
  /* מערך ריק = לא לדרוס גלריה מהקטלוג (שומר על image_urls / local) */
  if (Array.isArray(o.galleryUrls) && o.galleryUrls.length) {
    const urls = o.galleryUrls.map(u => String(u).trim()).filter(Boolean);
    if (urls.length) {
      m.images = urls.slice();
      m.cover = urls[0] || null;
      m.imageCount = urls.length;
    }
  }
  if (Object.prototype.hasOwnProperty.call(o, "price")) {
    const raw = String(o.price ?? "").trim();
    m.priceRaw = raw;
    m.price = priceDisplay(raw);
    m.priceNis = parsePriceNisRaw(raw);
  }
  return m;
}

function enrich(prop, index) {
  const status = (prop.status && STATUS_SET.has(prop.status))
    ? prop.status
    : classifyStatus(prop.title || "");
  let region = classifyRegion(prop.title || "");
  if (prop.regionKey) {
    const r = REGIONS.find(x => x.key === prop.regionKey);
    if (r) region = r;
  }
  let type = classifyType(prop.title || "");
  if (prop.typeKey) {
    const ty = TYPES.find(x => x.key === prop.typeKey);
    if (ty) type = ty;
  }

  let images = allImages(prop);
  let cover = firstImage(prop);
  let imageCount = images.length;
  /* גלריה מותאמת — רק כשיש כתובות; [] לא מוחק תמונות מהקטלוג */
  if (Array.isArray(prop.galleryUrls) && prop.galleryUrls.length) {
    const urls = prop.galleryUrls.map(u => String(u).trim()).filter(Boolean);
    if (urls.length) {
      images = urls;
      cover = urls[0] || null;
      imageCount = urls.length;
    }
  }

  return {
    id: prop.id || slugify(prop.title) || "prop-" + index,
    originalTitle: prop.title,
    title: cleanTitle(prop.title),
    url: prop.url,
    status,
    region,
    type,
    price: priceDisplay(prop.price),
    priceRaw: prop.price || "",
    priceNis: parsePriceNisRaw(prop.price || ""),
    details: prop.details || {},
    features: prop.features || [],
    description: prop.description || "",
    images,
    cover,
    imageCount,
    sourceIndex: index,
  };
}

let _cache = null;

function invalidatePropertiesCache() {
  _cache = null;
}

async function loadProperties() {
  if (_cache) return _cache;

  /* Preferred: embedded data (works under file:// too).
     Fallback: fetch JSON (for when the scraper refreshes data in-place). */
  let raw = [];
  if (Array.isArray(window.SHIBUMI_DATA)) {
    raw = window.SHIBUMI_DATA;
  } else {
    try {
      const res = await fetch(assetBase() + PROPERTIES_JSON, { cache: "no-store" });
      if (!res.ok) throw new Error("status " + res.status);
      raw = await res.json();
    } catch (e) {
      console.warn("[Shibumi] properties fetch failed:", e);
      raw = [];
    }
  }

  const custom = getCustomRawList();
  const combined = raw.concat(custom);

  _cache = combined.map(enrich);
  return _cache;
}

/* Merge in admin overrides from localStorage — lets admin hide/edit/add listings
 * without a backend. Overrides are keyed by id. */
function applyAdminOverrides(list) {
  try {
    const raw = localStorage.getItem("shibumi:overrides");
    if (!raw) return list;
    const overrides = JSON.parse(raw);
    return list
      .map(p => {
        const o = overrides[p.id];
        if (!o) return p;
        if (o._deleted) return null;
        return mergeListingFields(p, o);
      })
      .filter(Boolean);
  } catch (e) {
    return list;
  }
}

async function loadPublicProperties() {
  const all = await loadProperties();
  return applyAdminOverrides(all).filter(p => p.status === "active");
}

async function loadAllProperties() {
  const all = await loadProperties();
  return applyAdminOverrides(all);
}

/* ---- view tracking (localStorage) ---- */

function recordView(id) {
  try {
    const key = "shibumi:views";
    const v = JSON.parse(localStorage.getItem(key) || "{}");
    v[id] = (v[id] || 0) + 1;
    localStorage.setItem(key, JSON.stringify(v));

    const tkey = "shibumi:views:timeline";
    const t = JSON.parse(localStorage.getItem(tkey) || "[]");
    t.push({ id, ts: Date.now() });
    /* cap at last 400 events */
    if (t.length > 400) t.splice(0, t.length - 400);
    localStorage.setItem(tkey, JSON.stringify(t));
  } catch (e) { /* ignore */ }
}

function getViews() {
  try { return JSON.parse(localStorage.getItem("shibumi:views") || "{}"); }
  catch { return {}; }
}
function getViewsTimeline() {
  try { return JSON.parse(localStorage.getItem("shibumi:views:timeline") || "[]"); }
  catch { return []; }
}

/* ---- leads (contact form submissions) ----
 *
 * Dual-layer storage:
 *   1. Backend (Google Apps Script Web App) — when configured, this is the
 *      source of truth. Leads show up in a Google Sheet + arrive by email.
 *   2. localStorage — mirror for offline/fallback; keeps the site usable
 *      even before the backend is wired up.
 *
 * All three functions are async. Pages that call them must `await`.
 */

function _cfg() { return window.SHIBUMI_CONFIG || {}; }
function _newId() {
  try { if (crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (_) {}
  return "L" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

async function recordLead(lead) {
  const entry = { ...lead, id: _newId(), ts: Date.now() };

  /* always write locally first so UI + admin fallback stay responsive */
  try {
    const key = "shibumi:leads";
    const list = JSON.parse(localStorage.getItem(key) || "[]");
    list.unshift(entry);
    localStorage.setItem(key, JSON.stringify(list.slice(0, 200)));
  } catch (_) {}

  /* if backend configured, ship to server */
  const cfg = _cfg();
  if (cfg.BACKEND_URL) {
    try {
      const res = await fetch(cfg.BACKEND_URL, {
        method: "POST",
        /* text/plain avoids a CORS preflight on Apps Script */
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "lead",
          name:     entry.name     || "",
          phone:    entry.phone    || "",
          email:    entry.email    || "",
          interest: entry.interest || "",
          message:  entry.message  || "",
          _ua: navigator.userAgent,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data && data.ok) return { ok: true, online: true, id: data.id };
      return { ok: true, online: false, error: data && data.error };
    } catch (e) {
      return { ok: true, online: false, error: String(e) };
    }
  }
  return { ok: true, online: false };
}

async function getLeads() {
  const cfg = _cfg();
  if (cfg.BACKEND_URL && cfg.ADMIN_TOKEN) {
    try {
      const url = cfg.BACKEND_URL + "?action=leads&token=" + encodeURIComponent(cfg.ADMIN_TOKEN);
      const res = await fetch(url, { method: "GET" });
      const data = await res.json();
      if (data && data.ok && Array.isArray(data.leads)) return data.leads;
    } catch (_) { /* fall through to local */ }
  }
  try { return JSON.parse(localStorage.getItem("shibumi:leads") || "[]"); }
  catch { return []; }
}

async function deleteLead(idOrTs) {
  const cfg = _cfg();
  if (cfg.BACKEND_URL && cfg.ADMIN_TOKEN) {
    try {
      await fetch(cfg.BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "lead-delete",
          token: cfg.ADMIN_TOKEN,
          id: idOrTs,
        }),
      });
    } catch (_) {}
  }
  try {
    const list = JSON.parse(localStorage.getItem("shibumi:leads") || "[]")
      .filter(l => l.id !== idOrTs && l.ts !== idOrTs);
    localStorage.setItem("shibumi:leads", JSON.stringify(list));
  } catch (_) {}
}

/* ---- exports ---- */

window.Shibumi = {
  loadPublicProperties,
  loadAllProperties,
  loadProperties,
  invalidatePropertiesCache,
  classifyStatus, cleanTitle, slugify,
  mergeListingFields,
  getCustomRawList,
  setCustomRawList,
  isAdminCreatedId,
  recordView, getViews, getViewsTimeline,
  recordLead, getLeads, deleteLead,
  REGIONS, TYPES, REGION_ALIASES,
};
