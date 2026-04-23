/**
 * SHIBUMI · Intake · Google Apps Script
 * =====================================
 * Paste this entire file into script.google.com → New Project → Code.gs
 * Then run the function "setupShibumiIntake" once.
 *
 * What it does:
 *   1. Creates a Drive folder: "SHIBUMI · Intake"
 *   2. Creates a Google Sheet inside with 66 active property rows pre-filled
 *      (title + what is missing today) for the owner to fill in.
 *   3. Creates a Google Form with business/brand questions, team,
 *      testimonials, social, and branching questions for property data
 *      and images (as you asked).
 *   4. Links form responses to a response sheet inside the same folder.
 *   5. Prints all URLs at the end of the run.
 *
 * Designed for: Shibumi Nadlan (Michael Israelstam, est. 1997).
 * Target owner language: Hebrew, RTL.
 */

// 66 active properties (auto-generated)
const PROPERTY_ROWS = [
  ["נחלה מרגשת למכירה בעמק יזרעאל- לגור בלב הטבע","28,000,000 ש\"ח","625 מ\"ר בנוי. 360מ\"ר בית עיקרי,133מ\"ר בית נוסף, 111מ\"ר מבנה אירוח ועוד שטחים נרחבים לאחסון","","",38,""],
  ["נחלה למכירה בכפר ויתקין בית מדהים מול נוף גבוה רואה ים","P.0.R","580 מ\"ר","","",24,""],
  ["נחלה למכירה במכמורת ליד הים","P.O.R","200 מ\"ר+יחידת אירוח","3,000 מ\"ר","",6,""],
  ["להשכרה לטווח ארוך בעמיקם בית נופש חלומי","35,000 ש\"ח","386 מ\"ר","","",14,""],
  ["למכירה משק עזר מול נוף פתוח בבני ציון","P.0.R","בית על חצי דונם כ200מ\"ר בית סבתא כ-120 מ\"ר +מחסן כ400 ש\"ר","","",15,""],
  ["למכירה בית מהמם בסביבת חוף בית ינאי","P.O.R","280 מ\"ר","","",12,"תיאור"],
  ["נחלה מדהימה למכירה/ השכרה במושב פסטורלי בשרון","P.O.R","2 בתים וחוות סוסים","7,833 מ\"ר","",13,""],
  ["דירה על הים למכירה בתל אביב","","","","",3,"מחיר, פרטי שטח"],
  ["וילה יוקרתית וייחודית למכירה קרוב לתל אביב מוקפת טבע מול נוף פתוח","P.O.R","מעל 500 מ\"ר","","",43,""],
  ["פנטהאוז עם נוף מלא לים להשכרה ביפו תל אביב","","","","",5,"מחיר, פרטי שטח"],
  ["פנטהאוז דופלקס מעוצב למכירה ביפו","","","","",2,"מחיר, פרטי שטח"],
  ["פנטהאוז יוקרתי למכירה בתל אביב","","","","",2,"מחיר, פרטי שטח"],
  ["דירת גן למכירה בלב תל אביב","","","","",2,"מחיר, פרטי שטח"],
  ["נחלה למכירה בשדה וורבורג","31,000,000 ש\"ח","","","",7,""],
  ["בית למכירה בחופית","P.O.R","","1,000 מ\"ר","",2,"תיאור"],
  ["נחלה למכירה במושב בני ציון","P.O.R","מ\"ר","15-17 דונם ברצף","",3,""],
  ["וילה למכירה בתל אביב","","","","",1,"מחיר, פרטי שטח"],
  ["למכירה בארסוף דופלקס מדהים ביותר קו ראשון לים","P.O.R","500 מ\"ר","","",10,""],
  ["למכירה וילה בבת חן","P.O.R","","","",3,"תיאור"],
  ["משק למכירה ברשפון","P.O.R","460 מ\"ר","","",10,""],
  ["דירות יוקרה למכירה קו ראשון לים בארסוף","P.O.R","מ\"ר","","",5,""],
  ["למכירה בחופית וילת יוקרה אדריכלית וייחודית מסוגה","P.O.R","כ-400 מ\"ר","","",55,""],
  ["מגדלי יוקרה בתל אביב למכירה","","","","",2,"מחיר, פרטי שטח"],
  ["וילה יוקרתית למכירה בתל אביב","","","","",1,"מחיר, תיאור, פרטי שטח"],
  ["דירה למכירה בלב תל אביב – בוטיק","","","","",1,"מחיר, תיאור, פרטי שטח"],
  ["פרויקט יוקרה למכירה בתל אביב","","","","",1,"מחיר, תיאור, פרטי שטח"],
  ["דירת יוקרה למכירה בתל אביב","","","","",2,"מחיר, פרטי שטח"],
  ["נכס יוקרתי למכירה בתל אביב","","","","",3,"מחיר, פרטי שטח"],
  ["דירת גן למכירה ביפו תל אביב","","","","",11,"מחיר, פרטי שטח"],
  ["וילה למכירה בחופית","P.O.R","180 מ\"ר","","5",2,"תיאור"],
  ["וילה למכירה בחופית","10,100,000 ש\"ח","250 מ\"ר","","6",2,""],
  ["בבית ינאי קו ראשון לים","P.O.R","","872 מ\"ר","",2,""],
  ["בית על הים להשכרה ביפו","","","","",7,"מחיר, תיאור, פרטי שטח"],
  ["למכירה בצוקי ים נוף פתוח לים","P.O.R","","670 מ\"ר","5",3,""],
  ["בקרוב יעלה נכס חדש למכירה בכפר ויתקין","P.O.R","","","",3,""],
  ["למכירה בית בצוקי ים עם נוף פתוח לים","P.O.R","215  מ\"ר","500 מ\"ר","6",4,""],
  ["בית למכירה במכמורת","POR","","750 מ\"ר","",2,""],
  ["משק עם זכויות מלאות למכירה בעמק חפר","P.O.R","150 מ\"ר","25,000 מ\"ר","",3,""],
  ["פנטהאוז למכירה בעין הים","4,500,000ש\"ח","180 מ\"ר","","",4,""],
  ["פנטהאוז בתל אביב עם נוף אורבני","","","","",2,"מחיר, תיאור, פרטי שטח"],
  ["וילה למכירה ברמות השבים","P.O.R","550  מ\"ר","3,000 מ\"ר","",1,""],
  ["וילה למכירה במושב בגליל העליון","P.O.R","","","9",8,""],
  ["משק למכירה בעמק חפר","השקעה מעולה!!","150 מ\"ר","","",2,""],
  ["למכירה בעמק חפר ובסביבת הים","P.O.R","300 מ\"ר","","",3,"תיאור"],
  ["דופלקס ליד הים בנתניה","5,500,000 ש\"ח","","","4.5",4,"תיאור"],
  ["וילה למכירה בבצרה","P.O.R","400 מ\"ר","","8",14,""],
  ["בית למכירה בחבצלת השרון","","270 מ\"ר","","",1,"מחיר, תיאור"],
  ["משק למכירה ברשפון","P.O.R ש\"ח","","","",0,""],
  ["משק למכירה בעמק חפר","6,200,000 ש\"ח","250 מ\"ר","","",1,"תיאור"],
  ["משק למכירה בעמק חפר","","","","",1,"מחיר, תיאור"],
  ["בית למכירה בחופית","","","1,000 מ\"ר","",2,"מחיר"],
  ["משק למכירה בעמק חפר","6,000,000 ש\"ח","","28,000 מ\"ר","",1,""],
  ["משק למכירה בעמק חפר","7,500,000 ש\"ח","220 מ\"ר","","",1,"תיאור"],
  ["משק למכירה במשמרת – בלב השרון","P.O.R","","","",2,"תיאור"],
  ["משק למכירה בעמק חפר","6,000,000 ש\"ח","","","",1,"תיאור"],
  ["משק למכירה בעמק חפר","P.O.R","410 מ\"ר","","",2,""],
  ["בית עם נוף לים בצוקי ים","7,500,000 ש\"ח","200 מ\"ר","500 מ\"ר","6",3,"תיאור"],
  ["למכירה וילה מושקעת במושב במרכז","P.O.R","","","",11,""],
  ["נחלה עם חווה למכירה בחוף השרון","","","","",1,"מחיר, תיאור, פרטי שטח"],
  ["נחלה מדהימה למכירה במכמורת- בבלעדיות","","","","",1,"מחיר, תיאור, פרטי שטח"],
  ["משק למכירה במושב בשרון","18,000,000 ש\"ח","250 מ\"ר","","",1,"תיאור"],
  ["משק למכירה בעמק חפר","10.000.000 ש\"ח","","14,000 מ\"ר","",1,"תיאור"],
  ["אחוזה מדהימה למכירה קרוב לתל אביב","P.O.R","","3,500 מ\"ר","10",6,""],
  ["להשכרה בארסוף דופלקס מדהים ביותר קו ראשון לים","P.O.R","500 מ\"ר","","",8,""],
  ["להשכרה בארסוף דופלקס יוקרתי קו ראשון לים","P.O.R","400 מ\"ר","","",7,""],
  ["להשכרה בארסוף קו ראשון לים","P.O.R","700 מ\"ר","","",4,""],
];

const FOLDER_NAME = 'SHIBUMI · Intake';
const FORM_NAME   = 'SHIBUMI · טופס איסוף מידע לאתר';
const SHEET_NAME  = 'SHIBUMI · גיליון נכסים למילוי';


/* ======================================================================
   MAIN ENTRY
   ====================================================================== */
function setupShibumiIntake() {
  const folder = getOrCreateFolder_(FOLDER_NAME);
  const imagesFolder = getOrCreateSubfolder_(folder, 'תמונות וסרטונים — העלאה');

  const sheetFile = createPropertySheet_(folder);
  const form      = createIntakeForm_(folder, sheetFile, imagesFolder);

  const responsesSheet = linkFormToSheet_(form, folder);

  const report =
    '=== SHIBUMI · Intake — מוכן ===\n\n' +
    '📁 Drive Folder:      ' + folder.getUrl() + '\n' +
    '📝 Google Form:       ' + form.getPublishedUrl() + '\n' +
    '   (edit:             ' + form.getEditUrl() + ')\n' +
    '📊 Properties Sheet:  ' + sheetFile.getUrl() + '\n' +
    '📷 Images Folder:     ' + imagesFolder.getUrl() + '\n' +
    '📥 Responses Sheet:   ' + responsesSheet.getUrl() + '\n\n' +
    'שתף את הטופס ואת תיקיית התמונות עם הבעלים (Michael Israelstam).\n';

  Logger.log(report);
  try {
    MailApp.sendEmail({
      to: Session.getActiveUser().getEmail(),
      subject: 'SHIBUMI Intake — מוכן',
      body: report,
    });
  } catch (e) { /* mail quota edge-case; URLs still in logs */ }

  return report;
}


/* ======================================================================
   DRIVE HELPERS
   ====================================================================== */
function getOrCreateFolder_(name) {
  const it = DriveApp.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return DriveApp.createFolder(name);
}

function getOrCreateSubfolder_(parent, name) {
  const it = parent.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return parent.createFolder(name);
}

function moveToFolder_(file, folder) {
  const parents = file.getParents();
  while (parents.hasNext()) {
    const p = parents.next();
    if (p.getId() !== folder.getId()) p.removeFile(file);
  }
  try { folder.addFile(file); } catch (e) {}
}


/* ======================================================================
   GOOGLE SHEET — properties to fill in
   ====================================================================== */
function createPropertySheet_(folder) {
  const ss = SpreadsheetApp.create(SHEET_NAME);
  const file = DriveApp.getFileById(ss.getId());
  moveToFolder_(file, folder);

  const sheet = ss.getActiveSheet();
  sheet.setName('נכסים');
  sheet.setRightToLeft(true);

  const headers = [
    '#',
    'כותרת הנכס',
    'סטטוס (פעיל / למכירה / להשכרה / נמכר / הושכר / מוקפא)',
    'מחיר (או "מחיר בפנייה")',
    'תיאור מלא (לפחות 2 פסקאות)',
    'שטח בנוי (מ"ר)',
    'שטח מגרש / נחלה (מ"ר / דונם)',
    'חדרים (סה"כ)',
    'חדרי שינה',
    'חדרי שירותים',
    'קומה (אם דירה)',
    'שנת בנייה',
    'שיפוץ אחרון (שנה)',
    'חניות',
    'מרפסת (מ"ר)',
    'מאפיינים (בריכה, גינה, ממ"ד, מעלית, מחסן, מזגן מרכזי, נוף ים, פרטיות — מופרד בפסיקים)',
    'כיווני אוויר',
    'שכונה / יישוב מדויק (פרטי — רק לאדמין)',
    'קישור לסרטון יוטיוב',
    'קישור לסיור וירטואלי (Matterport / 3D)',
    'איש קשר לנכס (אם שונה)',
    'הערות פנימיות',
    '--- נתונים קיימים (לעיון) ---',
    'מחיר באתר היום',
    'שטח בנוי באתר היום',
    'שטח מגרש באתר היום',
    'חדרים באתר היום',
    'מספר תמונות קיימות',
    'שדות חסרים',
    'URL בקוד שקרה',
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
       .setFontWeight('bold').setBackground('#17140F').setFontColor('#F3EEDF')
       .setWrap(true).setVerticalAlignment('middle');
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(2);

  const data = [];
  PROPERTY_ROWS.forEach(function (r, i) {
    const title = r[0], priceNow = r[1], builtNow = r[2], lotNow = r[3], roomsNow = r[4], imgCount = r[5], missing = r[6];
    data.push([
      i + 1, title,
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      '',  /* divider */
      priceNow, builtNow, lotNow, roomsNow, imgCount, missing,
      '', /* URL filled below from PROPERTY_ROWS if you want, or leave blank */
    ]);
  });

  if (data.length) {
    sheet.getRange(2, 1, data.length, headers.length).setValues(data);
  }

  // Column widths
  const widths = [40, 380, 180, 160, 420, 120, 140, 90, 90, 90, 80, 100, 100, 80, 100, 420, 120, 220, 240, 240, 180, 240, 60, 180, 140, 140, 100, 120, 220, 220];
  widths.forEach(function (w, idx) { sheet.setColumnWidth(idx + 1, w); });

  // Wrap long columns
  sheet.getRange(2, 1, data.length, headers.length).setVerticalAlignment('top').setWrap(true);

  // Status validation
  const statusRange = sheet.getRange(2, 3, data.length, 1);
  const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['פעיל · למכירה', 'פעיל · להשכרה', 'בבלעדיות', 'מוקפא — לא להעלות לאתר', 'נמכר', 'הושכר'], true)
      .setAllowInvalid(true).build();
  statusRange.setDataValidation(rule);

  // Divider column styling
  sheet.getRange(1, 23, data.length + 1, 1).setBackground('#27211A').setFontColor('#8F8372');

  // Visual hint row
  const hint = 'מלאו את העמודות הריקות בצד ימין. העמודות מימין לקו "--- נתונים קיימים ---" הן מה שכבר קיים באתר (לעיון בלבד). ' +
               'כל שורה = נכס אחד. אין חובה למלא הכל — אבל "מחיר" ו"תיאור" חיוניים לפחות.';
  sheet.getRange(data.length + 3, 2).setValue(hint)
       .setFontStyle('italic').setFontColor('#6E5C2F').setWrap(true);
  sheet.getRange(data.length + 3, 2, 1, 8).merge();

  return file;
}


/* ======================================================================
   GOOGLE FORM
   ====================================================================== */
function createIntakeForm_(folder, sheetFile, imagesFolder) {
  const form = FormApp.create(FORM_NAME)
    .setTitle(FORM_NAME)
    .setDescription(
      'שלום Michael,\n\n' +
      'רוב המידע על שיבומי כבר אצלנו — אודות, נכסים, טלפון, אזורים.\n' +
      'נשאר רק מה שבאמת חסר. 5 דקות, וסיימנו.\n\n' +
      '📊 גיליון הנכסים (אם תבחר למלא): ' + sheetFile.getUrl() + '\n' +
      '📷 תיקיית תמונות (להעלאה): ' + imagesFolder.getUrl() + '\n\n' +
      'שאלות? 050-733-0090.')
    .setCollectEmail(true)
    .setAllowResponseEdits(true)
    .setProgressBar(true)
    .setShowLinkToRespondAgain(false);

  moveToFolder_(DriveApp.getFileById(form.getId()), folder);

  /* ---------------- 1 · Properties — missing data ---------------- */
  form.addPageBreakItem()
      .setTitle('1 · נכסים — פרטים חסרים')
      .setHelpText('~30% מהנכסים באתר ללא מחיר, ~34% ללא תיאור, 17 ללא פרטי שטח. זה הכי חשוב לאתר יוקרה.');

  const q = form.addMultipleChoiceItem()
      .setTitle('יש לך קובץ מסודר עם פרטי הנכסים (מחיר, שטח, חדרים, תיאור)?')
      .setRequired(true);

  const yesPage = form.addPageBreakItem().setTitle('1א · שתף את הקובץ');
  form.addParagraphTextItem()
      .setTitle('לינק לקובץ / תיקייה (Drive, Dropbox, או העלאה ל-' + imagesFolder.getUrl() + ')')
      .setRequired(true);

  const noPage = form.addPageBreakItem()
      .setTitle('1ב · מילוי בגיליון')
      .setHelpText('פתחנו גיליון עם 66 הנכסים. כל שורה = נכס. ממלאים רק את החסרים — עמודות "מחיר", "תיאור", "שטח", "חדרים".');
  form.addParagraphTextItem()
      .setTitle('הגיליון')
      .setHelpText('🔗 ' + sheetFile.getUrl());

  q.setChoices([
    q.createChoice('כן — יש קובץ', yesPage),
    q.createChoice('לא — אמלא בגיליון', noPage),
  ]);

  /* ---------------- 2 · Images ---------------- */
  form.addPageBreakItem()
      .setTitle('2 · תמונות טובות יותר')
      .setHelpText('לחלק מהנכסים יש כיום רק 1-3 תמונות. לאתר יוקרה רצוי 8+.');

  const hasImgs = form.addMultipleChoiceItem()
      .setTitle('יש לך תמונות איכותיות נוספות?')
      .setRequired(true);

  const imgYes = form.addPageBreakItem().setTitle('2א · איך לשלוח');
  form.addMultipleChoiceItem()
      .setTitle('פורמט')
      .setChoiceValues([
        'תיקייה ב-Google Drive',
        'קובץ ZIP',
        'תיקייה ב-Dropbox',
        'WhatsApp · 050-733-0090',
      ])
      .setRequired(true);
  form.addParagraphTextItem()
      .setTitle('לינק / הוראות')
      .setHelpText(
        'להעלאה ישירה: ' + imagesFolder.getUrl() + '\n' +
        'תיקיית משנה לכל נכס, שמות קבצים 01.jpg, 02.jpg... (הראשונה = cover). JPG/PNG, מינ׳ 1920×1080.');

  hasImgs.setChoices([
    hasImgs.createChoice('כן', imgYes),
    hasImgs.createChoice('לא — נשאר עם מה שבאתר', FormApp.PageNavigationType.CONTINUE),
  ]);

  /* ---------------- 3 · Testimonials + social ---------------- */
  form.addPageBreakItem()
      .setTitle('3 · המלצות ורשתות')
      .setHelpText('זה מה שלא מצאנו אונליין. הכל אופציונלי.');

  for (let i = 1; i <= 3; i++) {
    form.addParagraphTextItem()
        .setTitle('המלצה ' + i)
        .setHelpText('שם לקוח + יישוב + ציטוט (רק אם יש אישור מהלקוח).');
  }

  form.addTextItem().setTitle('לינק ל-Google Reviews שלכם');
  form.addTextItem().setTitle('אינסטגרם / פייסבוק / יוטיוב — לינקים (אם יש)');

  /* ---------------- 4 · Lead routing + legal ---------------- */
  form.addPageBreakItem().setTitle('4 · טכני');

  form.addTextItem()
      .setTitle('לאיזה אימייל לשלוח התראות על לידים מהאתר?')
      .setHelpText('כשגולש ממלא "צור קשר" — לשם זה יגיע. לא יוצג באתר.')
      .setRequired(true);

  form.addTextItem().setTitle('מספר רישיון תיווך (אופציונלי — מופיע בפוטר)');
  form.addTextItem().setTitle('שם חוקי של העסק לפוטר (אופציונלי)');

  /* ---------------- 5 · Done ---------------- */
  form.addPageBreakItem().setTitle('5 · לסיום');

  form.addParagraphTextItem()
      .setTitle('משהו נוסף שחשוב שיופיע באתר?')
      .setHelpText('אופציונלי.');

  form.addCheckboxItem()
      .setTitle('אישור')
      .setChoiceValues(['המידע נכון, אני מאשר/ת שימוש בו לאתר'])
      .setRequired(true);

  return form;
}


/* ======================================================================
   LINK FORM TO A RESPONSES SHEET (inside folder)
   ====================================================================== */
function linkFormToSheet_(form, folder) {
  const ss = SpreadsheetApp.create('SHIBUMI · תגובות לטופס');
  const file = DriveApp.getFileById(ss.getId());
  moveToFolder_(file, folder);
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  return file;
}
