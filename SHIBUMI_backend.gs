/**
 * SHIBUMI · Backend · Google Apps Script Web App
 * ================================================
 * זה ה-backend החי של האתר. להדביק פעם אחת, לפרסם, ולסיים.
 *
 * מה זה עושה:
 *   1. מקבל פניות מטופס "יצירת קשר" באתר.
 *   2. שומר כל פנייה ב-Google Sheet ("SHIBUMI · Leads").
 *   3. שולח אליך מייל מיידי עם פרטי הפנייה.
 *   4. מאפשר למערכת הניהול (admin) לצפות ולמחוק פניות.
 *
 * =========  הוראות הקמה (5 דקות)  =========
 *   1.  script.google.com  →  "New Project"
 *   2.  מוחקים את כל מה שיש ב-Code.gs ומדביקים את כל הקובץ הזה.
 *   3.  שומרים (Ctrl+S), קוראים לפרויקט "SHIBUMI Backend".
 *   4.  בתפריט למעלה בוחרים את הפונקציה "setupShibumiBackend" ולוחצים Run.
 *         בפעם הראשונה יבקש הרשאות → Review → Advanced → Go to... → Allow.
 *   5.  Deploy → New deployment → ⚙ → סוג "Web app".
 *         Execute as:         Me
 *         Who has access:     Anyone
 *         Deploy → מעתיקים את ה-URL שנגמר ב-"/exec".
 *   6.  פותחים את site/js/config.js בעורך הקוד ומדביקים:
 *         BACKEND_URL: ה-URL מהשלב הקודם.
 *         ADMIN_TOKEN: אותה מחרוזת אקראית כמו ב-CONFIG.ADMIN_TOKEN למטה.
 *   7.  רענון לאתר. בודקים שזה עובד ע"י מילוי טופס "יצירת קשר" באתר —
 *       תקבל מייל בתוך שניות + תראה את השורה בגיליון.
 *
 *   (אם תרצה לשנות סיסמה/טוקן אחרי הפריסה — שנה ב-CONFIG למטה, שמור,
 *    Deploy → Manage deployments → ✏ → Version: New version → Deploy.)
 */

/* =========  הגדרות לעריכה ידנית  ========= */
const CONFIG = {
  // המייל שלך — לשם מגיעות ההתראות על פניות חדשות
  BROKER_EMAIL: 'michael@shibumi-nadlan.co.il',

  // מחרוזת אקראית ארוכה. חייבת להיות זהה ל-ADMIN_TOKEN ב-site/js/config.js.
  // אפשר להחליף לכל מחרוזת שמכילה מינימום 24 תווים רנדומליים.
  ADMIN_TOKEN: 'shibumi-REPLACE-ME-with-a-long-random-string-8u2h3f98h23f',

  // שם הגיליון. לא מומלץ לשנות אחרי הפריסה.
  SHEET_NAME: 'SHIBUMI · Leads',

  // שם האתר במיילים
  SITE_NAME: 'Shibumi · נדל"ן יוקרה',

  // Rate-limit: מקסימום פניות לדקה מאותה פנייה (anti-spam)
  MAX_PER_MINUTE: 6,
};


/* =========  Setup  ========= */
function setupShibumiBackend() {
  const ss = findOrCreateSpreadsheet_(CONFIG.SHEET_NAME);
  ensureLeadsSheet_(ss);
  Logger.log('✅ הוכן בהצלחה.');
  Logger.log('📊 גיליון פניות: ' + ss.getUrl());
  Logger.log('➡ הצעד הבא: Deploy → New deployment → Web app → Anyone, Execute as Me.');
  Logger.log('   לאחר הפריסה — להעתיק את ה-URL ל-site/js/config.js.');
}


/* =========  Router  ========= */
function doGet(e)  { return route_(e, 'GET'); }
function doPost(e) { return route_(e, 'POST'); }

function route_(e, method) {
  try {
    const params = (e && e.parameter) || {};
    let body = {};
    if (method === 'POST' && e && e.postData && e.postData.contents) {
      try { body = JSON.parse(e.postData.contents); } catch (_) { body = {}; }
    }
    const action = (params.action || body.action || '').toString();

    switch (action) {
      case 'health':      return json_({ ok: true, version: '1.0', ts: Date.now() });
      case 'lead':        return submitLead_(body, params);
      case 'leads':       return listLeads_(params);
      case 'lead-delete': return deleteLead_(body, params);
      default:            return json_({ ok: false, error: 'unknown action' });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

function json_(o) {
  return ContentService
    .createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}


/* =========  Sheet helpers  ========= */
function findOrCreateSpreadsheet_(name) {
  const it = DriveApp.getFilesByName(name);
  if (it.hasNext()) return SpreadsheetApp.open(it.next());
  const ss = SpreadsheetApp.create(name);
  return ss;
}

function ensureLeadsSheet_(ss) {
  let sh = ss.getSheetByName('Leads');
  if (!sh) sh = ss.insertSheet('Leads');
  // remove the default blank sheet if we just created "Leads"
  try {
    const def = ss.getSheetByName('Sheet1');
    if (def && def.getName() !== 'Leads') ss.deleteSheet(def);
  } catch (_) {}
  if (sh.getLastRow() === 0) {
    const headers = ['id','ts','תאריך','שם','טלפון','אימייל','עניין','הודעה','סטטוס','user_agent'];
    sh.appendRow(headers);
    sh.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold').setBackground('#17140F').setFontColor('#F3EEDF')
      .setVerticalAlignment('middle');
    sh.setFrozenRows(1);
    sh.setRightToLeft(true);
    const widths = [260, 140, 150, 160, 130, 220, 170, 420, 100, 260];
    widths.forEach((w, i) => sh.setColumnWidth(i + 1, w));
    sh.getRange(1, 1, 1, headers.length).setHorizontalAlignment('right');
  }
  return sh;
}

function leadsSheet_() {
  const ss = findOrCreateSpreadsheet_(CONFIG.SHEET_NAME);
  return ensureLeadsSheet_(ss);
}


/* =========  Actions  ========= */

function submitLead_(body, params) {
  const src = Object.keys(body).length ? body : params;

  // honeypot — if bot filled the hidden field, accept silently and drop
  if (src._hp) return json_({ ok: true });

  const name    = sanitize_(src.name, 200);
  const phone   = sanitize_(src.phone, 50);
  const email   = sanitize_(src.email, 200);
  const interest= sanitize_(src.interest, 200);
  const message = sanitize_(src.message, 4000);
  const ua      = sanitize_(src._ua, 300);

  if (!name || !phone) {
    return json_({ ok: false, error: 'missing required fields' });
  }

  // naive rate-limit using CacheService
  if (!checkRateLimit_(phone)) {
    return json_({ ok: false, error: 'rate limited' });
  }

  const id     = Utilities.getUuid();
  const ts     = Date.now();
  const dateIl = Utilities.formatDate(new Date(ts), 'Asia/Jerusalem', 'dd/MM/yyyy HH:mm');

  leadsSheet_().appendRow([id, ts, dateIl, name, phone, email, interest, message, 'new', ua]);

  try { mailBroker_({ id, dateIl, name, phone, email, interest, message }); } catch (_) {}

  return json_({ ok: true, id: id, ts: ts });
}

function listLeads_(params) {
  if (params.token !== CONFIG.ADMIN_TOKEN) {
    return json_({ ok: false, error: 'unauthorized' });
  }
  const sh = leadsSheet_();
  const last = sh.getLastRow();
  if (last < 2) return json_({ ok: true, leads: [] });
  const rows = sh.getRange(2, 1, last - 1, 10).getValues();
  const leads = rows
    .map(r => ({
      id: r[0], ts: Number(r[1]) || 0, dateIl: r[2],
      name: r[3], phone: r[4], email: r[5],
      interest: r[6], message: r[7],
      status: r[8] || 'new',
    }))
    .filter(l => l.status !== 'deleted')
    .reverse();
  return json_({ ok: true, leads: leads });
}

function deleteLead_(body, params) {
  const token = body.token || params.token;
  if (token !== CONFIG.ADMIN_TOKEN) return json_({ ok: false, error: 'unauthorized' });
  const id = body.id || params.id;
  if (!id) return json_({ ok: false, error: 'missing id' });

  const sh = leadsSheet_();
  const last = sh.getLastRow();
  if (last < 2) return json_({ ok: true });
  const ids = sh.getRange(2, 1, last - 1, 1).getValues().map(r => r[0]);
  const idx = ids.indexOf(id);
  if (idx < 0) return json_({ ok: false, error: 'not found' });
  sh.getRange(idx + 2, 9).setValue('deleted');
  return json_({ ok: true });
}


/* =========  Email  ========= */
function mailBroker_(l) {
  const to = CONFIG.BROKER_EMAIL;
  if (!to) return;

  const subject = 'פנייה חדשה באתר · ' + l.name;
  const lines = [
    'התקבלה פנייה חדשה באתר ' + CONFIG.SITE_NAME + '.',
    '',
    'שם:     ' + l.name,
    'טלפון:  ' + l.phone,
    (l.email    ? 'אימייל: ' + l.email    : ''),
    (l.interest ? 'עניין:  ' + l.interest : ''),
    '',
    (l.message  ? 'הודעה:\n' + l.message + '\n' : ''),
    'זמן: ' + l.dateIl,
    '—',
    'מזהה: ' + l.id,
  ].filter(Boolean).join('\n');

  // simple HTML version so Gmail formats it nicely on mobile
  const html = [
    '<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.6;color:#1a1a1a">',
    '<h2 style="margin:0 0 12px">פנייה חדשה באתר</h2>',
    '<table cellspacing="0" cellpadding="6" style="border-collapse:collapse">',
      '<tr><td style="color:#666">שם</td><td><b>' + escape_(l.name) + '</b></td></tr>',
      '<tr><td style="color:#666">טלפון</td><td><a href="tel:' + escape_(l.phone) + '">' + escape_(l.phone) + '</a></td></tr>',
      (l.email ? '<tr><td style="color:#666">אימייל</td><td><a href="mailto:' + escape_(l.email) + '">' + escape_(l.email) + '</a></td></tr>' : ''),
      (l.interest ? '<tr><td style="color:#666">עניין</td><td>' + escape_(l.interest) + '</td></tr>' : ''),
      (l.message ? '<tr><td style="color:#666;vertical-align:top">הודעה</td><td style="white-space:pre-wrap">' + escape_(l.message) + '</td></tr>' : ''),
    '</table>',
    '<p style="color:#999;font-size:12px;margin-top:20px">זמן: ' + escape_(l.dateIl) + ' · מזהה: ' + escape_(l.id) + '</p>',
    '</div>',
  ].join('');

  MailApp.sendEmail({
    to: to,
    subject: subject,
    body: lines,
    htmlBody: html,
    replyTo: l.email || undefined,
    name: CONFIG.SITE_NAME,
  });
}


/* =========  Utils  ========= */
function sanitize_(s, max) {
  s = String(s == null ? '' : s).trim();
  if (s.length > max) s = s.slice(0, max);
  return s;
}

function escape_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function checkRateLimit_(phone) {
  try {
    const cache = CacheService.getScriptCache();
    const key = 'rl:' + phone;
    const n = Number(cache.get(key) || 0);
    if (n >= CONFIG.MAX_PER_MINUTE) return false;
    cache.put(key, String(n + 1), 60);
    return true;
  } catch (_) { return true; }
}
