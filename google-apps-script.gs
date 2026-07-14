const SPREADSHEET_ID = '1LtQC2c3QxX5NLxXOc-4UpAweNOTqlkKGGZ9ZFFmqIJc';
const SHEET_NAME = 'บันทึกข้อมูล';

function doPost(e) {
  const record = JSON.parse(e.postData.contents || '{}');
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  const values = [[
    record.date || new Date(),
    Number(record.old || 0),
    Number(record.newProspect || 0),
    Number(record.waiting || 0),
    Number(record.closed || 0),
    Number(record.notClosed || 0),
    Number(record.planTarget || 0),
    Number(record.planAchieved || 0)
  ]];
  const savedDates = sheet.getLastRow() > 1
    ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat()
    : [];
  const offset = savedDates.findIndex(date =>
    Utilities.formatDate(new Date(date), Session.getScriptTimeZone(), 'yyyy-MM-dd') === record.date
  );
  if (offset >= 0) sheet.getRange(offset + 2, 1, 1, values[0].length).setValues(values);
  else sheet.appendRow(values[0]);
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
