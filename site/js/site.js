/* Shibumi · site.js · v9
 * Everything connects here:
 *   - Nav, hero, reveal, featured grid, counters, region counts, hero search
 *   - Accessibility: font-size, contrast, grayscale, underline, cursor, motion, reset
 *       (Israel Standard 5568 / WCAG 2.0 AA)
 *   - Comfort: favorites (♥), share, back-to-top, scroll progress, recently-viewed
 */
(function () {
  "use strict";

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
  const pad = (n) => String(n).padStart(2, "0");

  /** Split "28,000,000 ש״ח" into amount (LTR) + currency for stable card layout */
  function formatPropertyPriceHtml(raw) {
    const s = String(raw ?? "").trim();
    if (!s) {
      return `<span class="property-price__plain">${esc("מחיר בפנייה")}</span>`;
    }
    const compact = s.replace(/\s+/g, " ").trim();
    const porKey = compact.replace(/[^a-z0-9]/gi, "").toLowerCase();
    if (porKey === "por" || porKey === "p0r") {
      return `<span class="property-price__plain">${esc(s)}</span>`;
    }
    const m = compact.match(/^([\d,.\s\u00A0\u202F]+)\s+(ש[^\s]*ח|NIS|₪)\s*$/i);
    if (m) {
      const amount = m[1].trim();
      const cur = m[2].trim();
      return (
        `<span class="property-price__amount" dir="ltr" lang="en">${esc(amount)}</span>` +
        `<span class="property-price__currency">${esc(cur)}</span>`
      );
    }
    return `<span class="property-price__plain">${esc(s)}</span>`;
  }

  /* =====================================================
     STORAGE HELPERS
     ===================================================== */
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); }
      catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
    },
  };

  /* =====================================================
     FAVORITES
     ===================================================== */
  const FAV_KEY = "shibumi:favorites";
  const Favorites = {
    all() { return store.get(FAV_KEY, []); },
    has(id) { return this.all().includes(id); },
    toggle(id) {
      const list = this.all();
      const i = list.indexOf(id);
      if (i === -1) list.push(id); else list.splice(i, 1);
      store.set(FAV_KEY, list);
      return i === -1;
    },
    count() { return this.all().length; },
  };

  /* =====================================================
     RECENTLY VIEWED
     ===================================================== */
  const RECENT_KEY = "shibumi:recent";
  const Recent = {
    all() { return store.get(RECENT_KEY, []); },
    push(id) {
      const list = this.all().filter(x => x !== id);
      list.unshift(id);
      store.set(RECENT_KEY, list.slice(0, 8));
    },
  };

  /* =====================================================
     NAV
     ===================================================== */
  function initNav() {
    const navbar = document.querySelector(".navbar");
    const toggle = document.querySelector(".mobile-toggle");
    const links  = document.querySelector(".nav-links");
    const backdrop = document.querySelector(".nav-backdrop");

    if (navbar && !navbar.classList.contains("scrolled")) {
      const onScroll = () => navbar.classList.toggle("scrolled", window.scrollY > 30);
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    if (toggle && links) {
      const open  = () => { links.classList.add("active"); backdrop?.classList.add("active"); toggle.setAttribute("aria-expanded","true"); document.body.style.overflow="hidden"; };
      const close = () => { links.classList.remove("active"); backdrop?.classList.remove("active"); toggle.setAttribute("aria-expanded","false"); document.body.style.overflow=""; };
      toggle.addEventListener("click", () => links.classList.contains("active") ? close() : open());
      backdrop?.addEventListener("click", close);
      links.querySelectorAll("a").forEach(a => a.addEventListener("click", close));
      window.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
    }
  }

  /* =====================================================
     REVEAL
     ===================================================== */
  function initReveal() {
    const els = Array.from(document.querySelectorAll("[data-reveal]:not(.is-in)"));
    if (!els.length) return;
    if (!("IntersectionObserver" in window)) {
      els.forEach(el => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px 0px 0px", threshold: 0.02 });
    els.forEach(el => io.observe(el));

    // Anything currently inside the viewport — reveal immediately (no wait)
    requestAnimationFrame(() => {
      els.forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) el.classList.add("is-in");
      });
    });
  }

  /* =====================================================
     STATS COUNTER
     ===================================================== */
  function initCounters() {
    const nodes = document.querySelectorAll("[data-count]");
    if (!nodes.length) return;
    const run = (el) => {
      const target = parseFloat(el.getAttribute("data-count"));
      if (!Number.isFinite(target)) return;
      const suffix = el.getAttribute("data-count-suffix") || "";
      const decimals = (el.getAttribute("data-count").split(".")[1] || "").length;
      const dur = 1400;
      const start = performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = (target * eased).toFixed(decimals) + suffix;
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if (!("IntersectionObserver" in window)) { nodes.forEach(run); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.4 });
    nodes.forEach(n => io.observe(n));
  }

  /* =====================================================
     HERO SEARCH
     ===================================================== */
  function initHeroSearch() {
    const form = document.getElementById("heroSearch");
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const region = form.querySelector('[name="region"]')?.value || "all";
      const type   = form.querySelector('[name="type"]')?.value   || "all";
      const qs = new URLSearchParams();
      if (region !== "all") qs.set("region", region);
      if (type   !== "all") qs.set("type",   type);
      location.href = "./properties.html" + (qs.toString() ? "?" + qs.toString() : "");
    });
  }

  /* =====================================================
     PROPERTY CARD (with favorite heart)
     ===================================================== */
  function renderCard(p, delay = 0) {
    const a = document.createElement("a");
    a.className = "property-card";
    a.href = `./property.html?id=${encodeURIComponent(p.id)}`;
    a.setAttribute("aria-label", p.title);
    a.setAttribute("data-reveal", "");
    a.style.setProperty("--delay", String(delay));

    const tagText =
      p.status === "sold"   ? "נמכר"   :
      p.status === "rented" ? "הושכר"  :
      (p.type?.label || "נכס");
    const tagClass =
      p.status === "sold"   ? " property-tag--sold"   :
      p.status === "rented" ? " property-tag--rented" : "";

    const cover = p.cover || "";
    const isFav = Favorites.has(p.id);

    a.innerHTML = `
      <div class="property-img-wrapper">
        <span class="property-tag${tagClass}">${esc(tagText)}</span>
        <button type="button" class="fav-btn${isFav ? " is-active" : ""}"
                data-fav-id="${esc(p.id)}"
                aria-label="${isFav ? "הסר ממועדפים" : "הוסף למועדפים"}"
                aria-pressed="${isFav}">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
        ${cover
          ? `<img class="property-img" src="${esc(cover)}" alt="${esc(p.title)}" loading="lazy" decoding="async" width="640" height="440">`
          : `<div class="property-img" style="display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:.9rem">אין תמונה</div>`}
        <div class="property-overlay">
          <span class="view-btn">צפייה בנכס <span aria-hidden="true">←</span></span>
        </div>
      </div>
      <div class="property-info">
        <div class="property-price">${formatPropertyPriceHtml(p.price)}</div>
        <h3 class="property-title">${esc(p.title)}</h3>
        <div class="property-location">${esc(p.region?.label || "")}</div>
        <div class="property-specs">
          <span class="spec">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 10l9-7 9 7v11a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z"/></svg>
            ${esc(p.type?.label || "נכס")}
          </span>
          <span class="spec">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="1"/><path d="M3 12h18"/></svg>
            ${p.imageCount || 0} תמונות
          </span>
        </div>
      </div>
    `;

    // Fav button stops link
    const fav = a.querySelector(".fav-btn");
    fav?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const nowActive = Favorites.toggle(p.id);
      fav.classList.toggle("is-active", nowActive);
      fav.setAttribute("aria-pressed", String(nowActive));
      fav.setAttribute("aria-label", nowActive ? "הסר ממועדפים" : "הוסף למועדפים");
      fav.classList.remove("is-pulse"); void fav.offsetWidth; fav.classList.add("is-pulse");
      showToast(nowActive ? "נוסף למועדפים ♥" : "הוסר מהמועדפים");
      updateFavCount();
    });

    return a;
  }

  /* =====================================================
     FEATURED GRID — small curated selection on the homepage.
     Standard property cards; full filtering lives on /properties.
     ===================================================== */
  async function renderFeatured() {
    const grid = document.getElementById("featuredGrid");
    if (!grid) return;
    try {
      const all = await Shibumi.loadPublicProperties();
      const picks = all.filter(p => !!p.cover).slice(0, 6);
      grid.innerHTML = "";
      if (!picks.length) {
        grid.innerHTML = `<p style="text-align:center;padding:40px 0;color:var(--text-secondary)">אין נכסים להצגה כעת.</p>`;
        return;
      }
      picks.forEach((p, i) => grid.appendChild(renderCard(p, i)));
      initReveal();
    } catch (e) {
      grid.innerHTML = `<p style="text-align:center;padding:40px 0;color:var(--text-muted)">שגיאה בטעינת נכסים.</p>`;
    }
  }


  /* =====================================================
     HERO COVER FALLBACK
     ===================================================== */
  async function setHeroCover() {
    const img = document.querySelector("[data-hero-cover]");
    if (!img || img.getAttribute("src")) return;
    try {
      const all = await Shibumi.loadPublicProperties();
      const pick = all.find(p => p.cover);
      if (pick?.cover) img.setAttribute("src", pick.cover);
    } catch {}
  }

  /* =====================================================
     REGIONS SUMMARY — dynamic hint shown next to "לכל הנכסים".
     Counts distinct regions that have at least one listing and
     lists their labels inline, e.g. "אוסף פעיל ב-4 אזורים · חוף הים · השרון · ..."
     ===================================================== */
  async function paintRegionsSummary() {
    const el = document.querySelector("[data-regions-summary]");
    if (!el) return;

    let all = [];
    try { all = await Shibumi.loadPublicProperties(); } catch { return; }
    if (!all.length) { el.textContent = ""; return; }

    const order = Array.isArray(window.Shibumi?.REGIONS) ? window.Shibumi.REGIONS : [];
    const seen  = new Map();
    all.forEach(p => {
      const k = p.region?.key, l = p.region?.label;
      if (!k || !l) return;
      if (!seen.has(k)) seen.set(k, l);
    });
    if (!seen.size) { el.textContent = ""; return; }

    const labels = (order.length
      ? order.filter(r => seen.has(r.key)).map(r => seen.get(r.key))
      : Array.from(seen.values())
    );

    const count = labels.length;
    const list  = labels.join(" · ");
    el.innerHTML = `אוסף פעיל ב־${count} אזורים <span class="section-cta__sep" aria-hidden="true">·</span> ${list}`;
  }

  /* =====================================================
     RECENTLY VIEWED STRIP (properties.html)
     ===================================================== */
  async function renderRecentStrip() {
    const holder = document.getElementById("recentStrip");
    if (!holder) return;
    const ids = Recent.all();
    if (!ids.length) { holder.hidden = true; return; }
    try {
      const all = await Shibumi.loadAllProperties();
      const items = ids.map(id => all.find(p => p.id === id)).filter(Boolean).slice(0, 6);
      if (!items.length) { holder.hidden = true; return; }
      const row = holder.querySelector(".recent-strip__row");
      row.innerHTML = "";
      items.forEach(p => {
        const a = document.createElement("a");
        a.className = "recent-item";
        a.href = `./property.html?id=${encodeURIComponent(p.id)}`;
        a.setAttribute("aria-label", p.title);
        const src = p.cover || "";
        a.innerHTML = `
          ${src ? `<img src="${esc(src)}" alt="${esc(p.title)}" loading="lazy" />`
                : `<div style="background:var(--bg-elevated);width:100%;height:100%"></div>`}
          <div class="recent-item__label">${esc(p.title)}</div>
        `;
        row.appendChild(a);
      });
      holder.hidden = false;
    } catch {}
  }

  /* =====================================================
     TOAST
     ===================================================== */
  let _toastEl = null;
  let _toastTimer = null;
  function showToast(msg) {
    if (!_toastEl) {
      _toastEl = document.createElement("div");
      _toastEl.className = "toast toast--success";
      _toastEl.setAttribute("role", "status");
      _toastEl.setAttribute("aria-live", "polite");
      document.body.appendChild(_toastEl);
    }
    _toastEl.textContent = msg;
    _toastEl.classList.add("is-visible");
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => _toastEl.classList.remove("is-visible"), 2600);
  }

  /* =====================================================
     BACK-TO-TOP
     ===================================================== */
  function initBackToTop() {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "back-to-top";
    btn.setAttribute("aria-label", "חזרה לראש העמוד");
    btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>`;
    document.body.appendChild(btn);

    const onScroll = () => {
      btn.classList.toggle("is-visible", window.scrollY > 400);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    btn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* =====================================================
     SCROLL PROGRESS BAR
     ===================================================== */
  function initScrollProgress() {
    const bar = document.createElement("div");
    bar.className = "scroll-progress";
    bar.setAttribute("aria-hidden", "true");
    const fill = document.createElement("div");
    fill.className = "scroll-progress__fill";
    bar.appendChild(fill);
    document.body.prepend(bar);

    const update = () => {
      const h = document.documentElement;
      const scrollable = h.scrollHeight - h.clientHeight;
      const pct = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
      fill.style.width = pct + "%";
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
  }

  /* =====================================================
     FAV COUNT BADGE (in nav)
     ===================================================== */
  function updateFavCount() {
    document.querySelectorAll("[data-fav-count]").forEach(el => {
      const n = Favorites.count();
      el.textContent = n > 0 ? String(n) : "";
      el.hidden = n === 0;
    });
  }

  /* =====================================================
     ACCESSIBILITY TOOLBAR (Israel Std 5568 / WCAG 2.0 AA)
     ===================================================== */
  const A11Y_KEY = "shibumi:a11y";
  const A11Y_DEFAULTS = {
    fontSize: "normal",  // normal | lg | xl | xxl
    mode: "default",     // default | contrast | light
    grayscale: false,
    underline: false,
    bigCursor: false,
    noMotion: false,
    readable: false,
  };

  function loadA11y() { return { ...A11Y_DEFAULTS, ...store.get(A11Y_KEY, {}) }; }
  function saveA11y(state) { store.set(A11Y_KEY, state); }

  function applyA11y(state) {
    const html = document.documentElement;
    const body = document.body;

    // font size
    if (state.fontSize === "normal") html.removeAttribute("data-font-size");
    else html.setAttribute("data-font-size", state.fontSize);

    // mode
    body.classList.toggle("a11y-contrast", state.mode === "contrast");
    body.classList.toggle("a11y-light",    state.mode === "light");

    // toggles
    body.classList.toggle("a11y-grayscale",  !!state.grayscale);
    body.classList.toggle("a11y-underline",  !!state.underline);
    body.classList.toggle("a11y-big-cursor", !!state.bigCursor);
    body.classList.toggle("a11y-no-motion",  !!state.noMotion);
    body.classList.toggle("a11y-readable",   !!state.readable);
  }

  function initA11y() {
    // Build the FAB
    const fab = document.createElement("button");
    fab.type = "button";
    fab.className = "a11y-fab";
    fab.setAttribute("aria-label", "פתיחת תפריט נגישות");
    fab.setAttribute("aria-expanded", "false");
    fab.setAttribute("aria-controls", "a11yPanel");
    fab.innerHTML = `
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="12" cy="4" r="2"/>
        <path d="M4.5 8.5h15M9 8.5v12M15 8.5v12M9 14h6"/>
        <path stroke="currentColor" stroke-width="1.8" fill="none" d="M4.5 8.5h15M9 8.5v12M15 8.5v12M9 14h6"/>
      </svg>
    `;

    // Build the Panel
    const panel = document.createElement("div");
    panel.className = "a11y-panel";
    panel.id = "a11yPanel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "תפריט נגישות");
    panel.setAttribute("aria-modal", "false");
    panel.innerHTML = `
      <div class="a11y-panel__header">
        <h2 class="a11y-panel__title">נגישות</h2>
        <button type="button" class="a11y-panel__close" aria-label="סגירת תפריט">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M6 18L18 6"/></svg>
        </button>
      </div>
      <div class="a11y-panel__body">
        <section>
          <div class="a11y-section__label">גודל טקסט</div>
          <div class="a11y-row" role="group" aria-label="שליטה בגודל טקסט">
            <button type="button" class="a11y-btn" data-a11y-action="font-dec" aria-label="הקטן גודל טקסט">א−</button>
            <span class="a11y-value" data-a11y-font-label aria-live="polite">רגיל</span>
            <button type="button" class="a11y-btn" data-a11y-action="font-inc" aria-label="הגדל גודל טקסט">א+</button>
          </div>
        </section>

        <section>
          <div class="a11y-section__label">ניגודיות</div>
          <button type="button" class="a11y-toggle" data-a11y-toggle="mode-contrast">
            <span class="a11y-toggle__check" aria-hidden="true"></span>
            <span>ניגודיות גבוהה (שחור-צהוב)</span>
          </button>
          <button type="button" class="a11y-toggle u-mt-2" data-a11y-toggle="mode-light">
            <span class="a11y-toggle__check" aria-hidden="true"></span>
            <span>מצב בהיר (שחור על לבן)</span>
          </button>
          <button type="button" class="a11y-toggle u-mt-2" data-a11y-toggle="grayscale">
            <span class="a11y-toggle__check" aria-hidden="true"></span>
            <span>גווני אפור</span>
          </button>
        </section>

        <section>
          <div class="a11y-section__label">התאמות נוספות</div>
          <button type="button" class="a11y-toggle" data-a11y-toggle="underline">
            <span class="a11y-toggle__check" aria-hidden="true"></span>
            <span>הדגשת קישורים</span>
          </button>
          <button type="button" class="a11y-toggle u-mt-2" data-a11y-toggle="bigCursor">
            <span class="a11y-toggle__check" aria-hidden="true"></span>
            <span>סמן עכבר גדול</span>
          </button>
          <button type="button" class="a11y-toggle u-mt-2" data-a11y-toggle="noMotion">
            <span class="a11y-toggle__check" aria-hidden="true"></span>
            <span>עצירת אנימציות</span>
          </button>
          <button type="button" class="a11y-toggle u-mt-2" data-a11y-toggle="readable">
            <span class="a11y-toggle__check" aria-hidden="true"></span>
            <span>פונט קריא (דיסלקציה)</span>
          </button>
        </section>

        <section>
          <button type="button" class="a11y-btn" data-a11y-action="reset" style="width:100%">
            איפוס לברירת מחדל
          </button>
        </section>
      </div>
      <div class="a11y-panel__footer">
        <a href="./accessibility.html">הצהרת נגישות</a>
        <span style="color:var(--text-secondary)">תקן ישראלי 5568</span>
      </div>
    `;

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    let state = loadA11y();
    applyA11y(state);
    syncUI();

    const fontLabels = { normal: "רגיל", lg: "גדול", xl: "גדול מאוד", xxl: "ענקי" };
    const fontOrder  = ["normal", "lg", "xl", "xxl"];

    function syncUI() {
      panel.querySelectorAll("[data-a11y-toggle]").forEach(btn => {
        const key = btn.getAttribute("data-a11y-toggle");
        let active = false;
        if (key === "mode-contrast") active = state.mode === "contrast";
        else if (key === "mode-light") active = state.mode === "light";
        else active = !!state[key];
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-pressed", String(active));
      });
      const lbl = panel.querySelector("[data-a11y-font-label]");
      if (lbl) lbl.textContent = fontLabels[state.fontSize] || "רגיל";
      const decBtn = panel.querySelector('[data-a11y-action="font-dec"]');
      const incBtn = panel.querySelector('[data-a11y-action="font-inc"]');
      if (decBtn) decBtn.disabled = fontOrder.indexOf(state.fontSize) === 0;
      if (incBtn) incBtn.disabled = fontOrder.indexOf(state.fontSize) === fontOrder.length - 1;
    }

    function commit() {
      applyA11y(state);
      saveA11y(state);
      syncUI();
    }

    function open() {
      panel.classList.add("is-open");
      fab.setAttribute("aria-expanded", "true");
      const firstFocus = panel.querySelector(".a11y-panel__close");
      setTimeout(() => firstFocus?.focus(), 50);
    }
    function close() {
      panel.classList.remove("is-open");
      fab.setAttribute("aria-expanded", "false");
      fab.focus();
    }

    fab.addEventListener("click", () => panel.classList.contains("is-open") ? close() : open());
    panel.querySelector(".a11y-panel__close").addEventListener("click", close);

    // ESC closes
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && panel.classList.contains("is-open")) close();
    });

    // Actions
    panel.querySelectorAll("[data-a11y-action]").forEach(btn => {
      btn.addEventListener("click", () => {
        const action = btn.getAttribute("data-a11y-action");
        const idx = fontOrder.indexOf(state.fontSize);
        if (action === "font-inc" && idx < fontOrder.length - 1) state.fontSize = fontOrder[idx + 1];
        if (action === "font-dec" && idx > 0)                     state.fontSize = fontOrder[idx - 1];
        if (action === "reset") state = { ...A11Y_DEFAULTS };
        commit();
      });
    });

    // Toggles
    panel.querySelectorAll("[data-a11y-toggle]").forEach(btn => {
      btn.addEventListener("click", () => {
        const key = btn.getAttribute("data-a11y-toggle");
        if (key === "mode-contrast") state.mode = state.mode === "contrast" ? "default" : "contrast";
        else if (key === "mode-light") state.mode = state.mode === "light" ? "default" : "light";
        else state[key] = !state[key];
        commit();
      });
    });

    // Keyboard shortcut: Ctrl+F10 opens panel (per Israel standard convention)
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && (e.key === "F10" || e.code === "F10")) {
        e.preventDefault();
        open();
      }
    });
  }

  /* =====================================================
     SHARE / COPY LINK (for property detail page)
     ===================================================== */
  async function shareLink(title, url) {
    url = url || location.href;
    title = title || document.title;
    if (navigator.share) {
      try { await navigator.share({ title, url }); return true; }
      catch (e) { if (e.name === "AbortError") return false; }
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast("הקישור הועתק");
      return true;
    } catch {
      prompt("העתיקו את הקישור:", url);
      return true;
    }
  }

  /* =====================================================
     PROPERTY DETAIL HOOK — record recent view
     ===================================================== */
  function initPropertyDetail() {
    const path = location.pathname.split("/").pop();
    if (path !== "property.html") return;
    const id = new URLSearchParams(location.search).get("id");
    if (id) Recent.push(id);
  }

  /* =====================================================
     BOOT — every step is isolated so one failure can't blank the page
     ===================================================== */
  function safely(fn, label) {
    try { return fn(); }
    catch (e) { console.warn("[Shibumi] " + label + " failed:", e); }
  }

  function boot() {
    // Tell CSS: JS is running. Only now may [data-reveal] be hidden.
    document.documentElement.classList.add("js-ready");

    // Safety: if something stalls, reveal everything after 3.5s.
    setTimeout(() => document.documentElement.classList.add("reveal-fallback"), 3500);

    safely(initA11y,          "initA11y");
    safely(initScrollProgress,"initScrollProgress");
    safely(initBackToTop,     "initBackToTop");

    safely(initNav,           "initNav");
    safely(initReveal,        "initReveal");
    safely(initCounters,      "initCounters");
    safely(initHeroSearch,    "initHeroSearch");
    safely(setHeroCover,      "setHeroCover");
    safely(renderFeatured,    "renderFeatured");
    safely(paintRegionsSummary, "paintRegionsSummary");
    safely(renderRecentStrip, "renderRecentStrip");
    safely(updateFavCount,    "updateFavCount");
    safely(initPropertyDetail,"initPropertyDetail");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.shibumiUI = {
    renderCard, initReveal, esc, pad, formatPropertyPriceHtml,
    Favorites, Recent, showToast, shareLink, updateFavCount,
  };
})();
