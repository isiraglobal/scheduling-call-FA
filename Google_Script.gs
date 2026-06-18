/**
 * Google Apps Script – Call Scheduler Backend
 *
 * WHAT IT DOES:
 *   1. Receives form data from the React frontend (POST)
 *   2. Appends a row to your Google Sheet
 *   3. Creates a Google Calendar event for the scheduled call
 *
 * SETUP:
 *   - Paste this entire script into a new Google Apps Script project
 *     (extensions.google.com / Apps Script / New project)
 *   - Replace SPREADSHEET_ID with your actual Google Sheet ID
 *   - Optionally set CALENDAR_ID (leave empty to use primary calendar)
 *   - Deploy → New deployment → Web app
 *       - Execute as: Me
 *       - Who has access: Anyone
 *   - Copy the Web App URL it gives you and put it in index.tsx
 *     as the value of GAS_WEB_APP_URL
 */

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const SPREADSHEET_ID = '1qCD4AflzYGKyY-uxKs9U8L3MVts7bwQ5iTkxRyoQPTg';
const SHEET_NAME = 'Sheet1';

// Leave blank to use the script owner's primary calendar
// Or use an ID like 'your_calendar_id@group.calendar.google.com'
const CALENDAR_ID = 'primary';

// ─── DO POST (called when your React frontend sends data) ────────────────────
function doPost(e) {
    try {
        const data = JSON.parse(e.postData.contents);

        // 1. Write to Google Sheets (auto-creates missing columns)
        appendToSheet(data);

        // 2. Create Calendar Event
        const eventId = createCalendarEvent(data);

        return ContentService
            .createTextOutput(JSON.stringify({ success: true, eventId: eventId }))
            .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
        return ContentService
            .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

// ─── DO GET (optional – for testing) ─────────────────────────────────────────
function doGet() {
    return ContentService
        .createTextOutput(JSON.stringify({ status: 'Call Scheduler is running.' }))
        .setMimeType(ContentService.MimeType.JSON);
}

// ─── EXPECTED COLUMN HEADERS ──────────────────────────────────────────────────
const HEADERS = [
    'Timestamp', 'Name', 'First Meeting?', 'Reason', 'Note',
    'Day', 'Duration', 'Time', 'Time Range End', 'Client Timestamp'
];

// ─── GET OR CREATE SHEET WITH ALL COLUMNS ────────────────────────────────────
function getOrCreateSheet() {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
        sheet = ss.insertSheet(SHEET_NAME);
        sheet.appendRow(HEADERS);
        return sheet;
    }

    if (sheet.getLastRow() === 0) {
        sheet.appendRow(HEADERS);
        return sheet;
    }

    // Detect missing columns and append them
    const existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const existingLower = existingHeaders.map(h => String(h).toLowerCase().trim());

    const columnsToAdd = HEADERS.filter(h => !existingLower.includes(h.toLowerCase().trim()));

    if (columnsToAdd.length > 0) {
        const newHeaderRange = sheet.getRange(1, sheet.getLastColumn() + 1, 1, columnsToAdd.length);
        newHeaderRange.setValues([columnsToAdd]);
    }

    return sheet;
}

// ─── BUILD A SHEET ROW FROM FORM DATA (maps to current column order) ─────────
function buildRow(data, existingHeaders) {
    const now = new Date();

    const valueMap = {
        'timestamp': now.toISOString(),
        'name': data.name || '',
        'first meeting?': data.isFirstMeeting === true ? 'Yes' : 'No',
        'reason': data.reason || '',
        'note': data.note || '',
        'day': data.day || '',
        'duration': data.duration || '',
        'time': data.time || '',
        'time range end': data.timeRangeEnd || '',
        'client timestamp': data.submittedAt || ''
    };

    return existingHeaders.map(h => valueMap[String(h).toLowerCase().trim()] || '');
}

// ─── APPEND DATA TO GOOGLE SHEET (auto-maps to columns) ──────────────────────
function appendToSheet(data) {
    const sheet = getOrCreateSheet();
    const existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const row = buildRow(data, existingHeaders);
    sheet.appendRow(row);
}

// ─── CREATE GOOGLE CALENDAR EVENT ────────────────────────────────────────────
function createCalendarEvent(data) {
    const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
    if (!calendar) {
        throw new Error('Calendar not found. Check CALENDAR_ID.');
    }

    // Parse the day and time into a Date object
    const startDate = parseDateTime(data.day, data.time);
    if (!startDate) {
        throw new Error('Could not parse day/time from form data.');
    }

    // Determine duration in minutes based on the selected duration string
    const durationMinutes = parseDuration(data.duration);

    const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

    const eventTitle = data.name
        ? `Call with ${data.name}`
        : 'Scheduled Call';

    const description = [
        data.reason ? `Reason: ${data.reason}` : '',
        data.note ? `Note: ${data.note}` : '',
        data.isFirstMeeting !== null
            ? `First meeting: ${data.isFirstMeeting ? 'Yes' : 'No'}`
            : '',
        `Time range end: ${data.timeRangeEnd || 'N/A'}`
    ].filter(Boolean).join('\n');

    const event = calendar.createEvent(eventTitle, startDate, endDate, {
        description: description
    });

    return event.getId();
}

// ─── PARSE DAY + TIME STRINGS INTO A Date OBJECT ─────────────────────────────
function parseDateTime(dayStr, timeStr) {
    if (!dayStr || !timeStr) return null;

    // dayStr is like "Monday", "Tuesday", etc.
    // We need to find the next occurrence of that day
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetDayIndex = dayNames.indexOf(dayStr);
    if (targetDayIndex === -1) return null;

    const now = new Date();
    const currentDayIndex = now.getDay();

    // Days until next occurrence
    let daysUntil = targetDayIndex - currentDayIndex;
    if (daysUntil <= 0) daysUntil += 7; // If today or past, go to next week

    const eventDate = new Date(now);
    eventDate.setDate(now.getDate() + daysUntil);

    // Parse time string – handle both "10:00 AM" and "14:30" formats
    let hours, minutes;
    const amPmMatch = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    const militaryMatch = timeStr.match(/^(\d{2}):(\d{2})$/);

    if (amPmMatch) {
        hours = parseInt(amPmMatch[1]);
        minutes = parseInt(amPmMatch[2]);
        const modifier = amPmMatch[3].toUpperCase();
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
    } else if (militaryMatch) {
        hours = parseInt(militaryMatch[1]);
        minutes = parseInt(militaryMatch[2]);
    } else {
        return null;
    }

    eventDate.setHours(hours, minutes, 0, 0);
    return eventDate;
}

// ─── PARSE DURATION STRING INTO MINUTES ──────────────────────────────────────
function parseDuration(durationStr) {
    if (!durationStr) return 30; // default 30 mins

    const lower = durationStr.toLowerCase();

    if (lower.includes('20-30') || lower.includes('20 – 30')) return 30;
    if (lower.startsWith('1 hour') || lower === '1 hour') return 60;
    if (lower.includes('60') || lower.includes('2 hours')) return 120;
    if (lower.includes('2+') || lower.includes('2 +')) return 150;

    // Fallback: try to extract a number
    const match = lower.match(/(\d+)\s*(min|hour)/);
    if (match) {
        const val = parseInt(match[1]);
        if (match[2].includes('hour')) return val * 60;
        return val;
    }

    return 30;
}
