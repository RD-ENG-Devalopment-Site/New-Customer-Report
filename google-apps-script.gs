const SPREADSHEET_ID = '1LtQC2c3QxX5NLxXOc-4UpAweNOTqlkKGGZ9ZFFmqIJc';
const SHEET_NAME = 'บันทึกข้อมูล';
const HEADERS = ['วันที่บันทึก', 'ผู้มุ่งหวังเดิม', 'ผู้มุ่งหวังใหม่', 'รอติดตาม', 'ปิดการติดตาม', 'ยังไม่ปิด', 'แพลนเป้าหมาย'];

function getSheet_() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('ไม่พบชีต: ' + SHEET_NAME);
  return sheet;
}
function number_(value) { return Math.max(0, Number(value) || 0); }
function dateKey_(value) {
  const date = value instanceof Date ? value : new Date(String(value) + 'T00:00:00');
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}
function getRecords_() {
  const sheet = getSheet_();
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getDisplayValues()
    .filter(row => row[0]).map(row => ({ date: String(row[0]).trim(), old: number_(row[1]), newProspect: number_(row[2]), waiting: number_(row[3]), closed: number_(row[4]), notClosed: number_(row[5]), planTarget: number_(row[6]) }));
}
function doGet(e) {
  const json = JSON.stringify({ ok: true, records: getRecords_() });
  const callback = e && e.parameter && e.parameter.callback;
  return ContentService.createTextOutput(callback ? callback + '(' + json + ')' : json).setMimeType(callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
}
function doPost(e) {
  const record = JSON.parse((e.postData && e.postData.contents) || '{}');
  const sheet = getSheet_(), date = dateKey_(record.date || new Date());
  const values = [[date, number_(record.old), number_(record.newProspect), number_(record.waiting), number_(record.closed), number_(record.notClosed), number_(record.planTarget)]];
  const dates = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getDisplayValues().flat() : [];
  const row = dates.findIndex(value => String(value).trim() === date) + 2;
  if (row > 1) sheet.getRange(row, 1, 1, HEADERS.length).setValues(values); else sheet.appendRow(values[0]);
  return ContentService.createTextOutput(JSON.stringify({ ok: true, date })).setMimeType(ContentService.MimeType.JSON);
}
