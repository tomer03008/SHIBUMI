/**
 * SHIBUMI · Runtime Config
 * ========================
 * הגדרות זמן-ריצה של האתר.
 * אם BACKEND_URL ריק — האתר עובד במצב לוקאלי (פניות נשמרות רק בדפדפן).
 * ברגע שמדביקים כאן URL של Google Apps Script Web App — הפניות הולכות
 * אוטומטית לגיליון + נשלחות אליך במייל, והאדמין רואה אותן מכל מכשיר.
 *
 * שלבי הקמה: ראו הוראות בראש SHIBUMI_backend.gs
 */
window.SHIBUMI_CONFIG = {
  // הדביקו כאן את ה-URL שנגמר ב-"/exec" שקיבלתם מ-Deploy של Apps Script.
  BACKEND_URL: "",

  // אותו Token בדיוק כמו CONFIG.ADMIN_TOKEN ב-SHIBUMI_backend.gs
  // (להחליף למחרוזת אקראית ארוכה של לפחות 24 תווים).
  ADMIN_TOKEN: "",

  // טלפון לתצוגה וליצירת קשר ישירה כ-fallback כשהשרת למטה
  PHONE: "050-733-0090",
};
