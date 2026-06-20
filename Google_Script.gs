/**
 * Google Apps Script – Call Scheduler Backend
 *
 * 🔹 Receives form data from the React frontend (POST)
 * 🔹 Appends a row to your Google Sheet (auto-creates missing columns)
 * 🔹 Creates a Google Calendar event for the scheduled call
 * 🔹 Sends a notification to Discord via webhook
 *
 * SETUP:
 *   1. Paste this entire script into a new Google Apps Script project
 *      (script.google.com → New project)
 *   2. Deploy → New deployment → Web app
 *        - Execute as: Me
 *        - Who has access: Anyone
 *   3. Copy the Web App URL and put it in src/App.tsx as GAS_WEB_APP_URL
 *   4. After every code change: Deploy → Manage deployments → Edit → New version → Deploy
 *      (the URL stays the same)
 */

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const SPREADSHEET_ID = '1qCD4AflzYGKyY-uxKs9U8L3MVts7bwQ5iTkxRyoQPTg';
const SHEET_NAME = 'Sheet1';

// Leave blank to use the script owner's primary calendar
const CALENDAR_ID = 'primary';

// Discord webhook for booking notifications
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1517986203222151289/-1Zsgi1Fcoo7SN5BTFLV3T92MKP8nBNeDi6h3b70O5BXDQYWHwZX2mzz4SYGGaZKOIyF';

// ─── DO POST ──────────────────────────────────────────────────────────────────
function doPost(e) {
    try {
        const data = JSON.parse(e.postData.contents);
        Logger.log('Received data: ' + JSON.stringify(data));

        const result = { success: true, steps: [] };

        // 1. Write to Google Sheets
        appendToSheet(data);
        result.steps.push('sheet');

        // 2. Create Calendar Event
        const eventId = createCalendarEvent(data);
        result.eventId = eventId;
        result.steps.push('calendar');

        // 3. Send Discord notification (non-blocking – won't throw if it fails)
        try {
            sendDiscordNotification(data);
            result.steps.push('discord');
        } catch (discordErr) {
            Logger.log('Discord notify skipped: ' + discordErr.toString());
            result.discordNote = 'notification skipped';
        }

        return ContentService
            .createTextOutput(JSON.stringify(result))
            .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
        Logger.log('ERROR: ' + err.toString());
        return ContentService
            .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

// ─── DO GET (health check) ────────────────────────────────────────────────────
function doGet() {
    return ContentService
        .createTextOutput(JSON.stringify({ status: 'running', sheet: SPREADSHEET_ID }))
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
        sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
        sheet.setFrozenRows(1);
        return sheet;
    }

    if (sheet.getLastRow() === 0) {
        sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
        sheet.setFrozenRows(1);
        return sheet;
    }

    const existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const existingLower = existingHeaders.map(h => String(h).toLowerCase().trim());
    const columnsToAdd = HEADERS.filter(h => !existingLower.includes(h.toLowerCase().trim()));

    if (columnsToAdd.length > 0) {
        const newCol = sheet.getLastColumn() + 1;
        sheet.getRange(1, newCol, 1, columnsToAdd.length).setValues([columnsToAdd]);
    }

    return sheet;
}

// ─── BUILD A SHEET ROW FROM FORM DATA ────────────────────────────────────────
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

// ─── APPEND DATA TO GOOGLE SHEET ─────────────────────────────────────────────
function appendToSheet(data) {
    const sheet = getOrCreateSheet();
    const existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const row = buildRow(data, existingHeaders);
    sheet.appendRow(row);
}

// ─── CREATE GOOGLE CALENDAR EVENT ────────────────────────────────────────────
function createCalendarEvent(data) {
    const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
    if (!calendar) throw new Error('Calendar not found. Check CALENDAR_ID.');

    const startDate = parseDateTime(data.day, data.time);
    if (!startDate) throw new Error('Could not parse day/time from form data.');

    const durationMinutes = parseDuration(data.duration);
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

    const title = data.name ? `Call with ${data.name}` : 'Scheduled Call';
    const description = [
        data.reason ? 'Reason: ' + data.reason : '',
        data.note ? 'Note: ' + data.note : '',
        data.isFirstMeeting !== null ? 'First meeting: ' + (data.isFirstMeeting ? 'Yes' : 'No') : '',
        'Time range end: ' + (data.timeRangeEnd || 'N/A')
    ].filter(Boolean).join('\n');

    const event = calendar.createEvent(title, startDate, endDate, { description: description });
    return event.getId();
}

// ─── SEND DISCORD NOTIFICATION ────────────────────────────────────────────────
function sendDiscordNotification(data) {
    const timeStr = data.time + (data.timeRangeEnd ? ' - ' + data.timeRangeEnd : '');
    const meetingStr = data.isFirstMeeting === true ? 'First meeting' : data.isFirstMeeting === false ? 'Follow-up' : 'Not specified';

    const embed = {
        title: '📅 New Call Scheduled',
        color: 0xB8AB38,
        fields: [
            { name: 'Name', value: data.name || 'Not provided', inline: true },
            { name: 'Meeting', value: meetingStr, inline: true },
            { name: 'Reason', value: data.reason || 'Not specified', inline: true },
            { name: 'Day', value: data.day || 'Not set', inline: true },
            { name: 'Time (EST)', value: timeStr || 'Not set', inline: true },
            { name: 'Duration', value: data.duration || 'Not set', inline: true },
            { name: 'Note', value: data.note || '—' }
        ],
        timestamp: new Date().toISOString(),
        footer: { text: 'Call Scheduler' }
    };

    const payload = { embeds: [embed] };

    const options = {
        method: 'post',
        headers: { 'Content-Type': 'application/json' },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
    };

    UrlFetchApp.fetch(DISCORD_WEBHOOK_URL, options);
}

// ─── PARSE DAY + TIME INTO A DATE ────────────────────────────────────────────
function parseDateTime(dayStr, timeStr) {
    if (!dayStr || !timeStr) return null;

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetDayIndex = dayNames.indexOf(dayStr);
    if (targetDayIndex === -1) return null;

    const now = new Date();
    let daysUntil = targetDayIndex - now.getDay();
    if (daysUntil <= 0) daysUntil += 7;

    const eventDate = new Date(now);
    eventDate.setDate(now.getDate() + daysUntil);

    const amPmMatch = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    const militaryMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);

    let hours, minutes;
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
    if (!durationStr) return 30;
    const lower = durationStr.toLowerCase();

    if (lower.includes('20-30') || lower.includes('20 – 30')) return 30;
    if (lower.startsWith('1 hour') || lower === '1 hour') return 60;
    if (lower.includes('60') || lower.includes('2 hours')) return 120;
    if (lower.includes('2+') || lower.includes('2 +')) return 150;

    const match = lower.match(/(\d+)\s*(min|hour)/);
    if (match) {
        const val = parseInt(match[1]);
        if (match[2].includes('hour')) return val * 60;
        return val;
    }

    return 30;
}
