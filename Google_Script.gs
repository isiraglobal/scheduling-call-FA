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
 *
 * TO VIEW LOGS:
 *   In the Apps Script editor, go to View → Logs (or Executions in the sidebar)
 *   to see every step logged below.
 */

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const SPREADSHEET_ID = '1qCD4AflzYGKyY-uxKs9U8L3MVts7bwQ5iTkxRyoQPTg';
const SHEET_NAME = 'Sheet1';
const CALENDAR_ID = 'primary';

const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1517986203222151289/-1Zsgi1Fcoo7SN5BTFLV3T92MKP8nBNeDi6h3b70O5BXDQYWHwZX2mzz4SYGGaZKOIyF';

// ─── DO POST ──────────────────────────────────────────────────────────────────
function doPost(e) {
    const log = [];
    const timestamp = new Date().toISOString();
    log.push('=== doPost fired at ' + timestamp + ' ===');

    try {
        // ── 1. Parse incoming data ──
        log.push('[1/5] Parsing POST body...');
        if (!e || !e.postData) {
            log.push('[FAIL] No postData received. e = ' + JSON.stringify(e));
            return errorResponse('No POST data received', log);
        }
        if (!e.postData.contents) {
            log.push('[FAIL] postData.contents is empty. postData = ' + JSON.stringify(e.postData));
            return errorResponse('Empty POST body', log);
        }

        const raw = e.postData.contents;
        log.push('Raw body length: ' + raw.length + ' chars');
        log.push('Raw body preview: ' + raw.substring(0, 200));

        let data;
        try {
            data = JSON.parse(raw);
            log.push('Parsed JSON successfully');
        } catch (parseErr) {
            log.push('[FAIL] JSON parse error: ' + parseErr.toString());
            return errorResponse('Invalid JSON: ' + parseErr.toString(), log);
        }

        log.push('Parsed data keys: ' + Object.keys(data).join(', '));
        log.push('name=' + data.name + ', reason=' + data.reason + ', day=' + data.day + ', time=' + data.time + ', duration=' + data.duration);
        log.push('isFirstMeeting=' + data.isFirstMeeting + ', note=' + (data.note || '(empty)') + ', timeRangeEnd=' + (data.timeRangeEnd || '(empty)'));

        const result = { success: true, steps: [], log: log };

        // ── 2. Write to Google Sheets ──
        log.push('[2/5] Writing to Google Sheets...');
        log.push('Spreadsheet ID: ' + SPREADSHEET_ID + ', Sheet: ' + SHEET_NAME);
        try {
            appendToSheet(data, log);
            result.steps.push('sheet');
            log.push('[OK] Sheet append completed');
        } catch (sheetErr) {
            log.push('[FAIL] Sheet error: ' + sheetErr.toString());
            log.push('Stack: ' + sheetErr.stack);
            result.steps.push('sheet_failed');
            result.sheetError = sheetErr.toString();
        }

        // ── 3. Create Calendar Event ──
        log.push('[3/5] Creating Calendar event...');
        log.push('Calendar ID: ' + CALENDAR_ID);
        try {
            const eventId = createCalendarEvent(data, log);
            result.eventId = eventId;
            result.steps.push('calendar');
            log.push('[OK] Calendar event created: ' + eventId);
        } catch (calErr) {
            log.push('[FAIL] Calendar error: ' + calErr.toString());
            log.push('Stack: ' + calErr.stack);
            result.steps.push('calendar_failed');
            result.calendarError = calErr.toString();
        }

        // ── 4. Send Discord notification ──
        log.push('[4/5] Sending Discord notification...');
        try {
            const discordResult = sendDiscordNotification(data, log);
            result.steps.push('discord');
            log.push('[OK] Discord notification sent. Response code: ' + discordResult);
        } catch (discordErr) {
            log.push('[FAIL] Discord error: ' + discordErr.toString());
            result.steps.push('discord_failed');
            result.discordError = discordErr.toString();
        }

        // ── 5. Return success ──
        log.push('[5/5] Returning success response');
        log.push('=== END ===');
        result.log = log;

        // Log everything to GAS logger
        log.forEach(function(msg) { Logger.log(msg); });

        return ContentService
            .createTextOutput(JSON.stringify(result))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
        log.push('[FATAL] Unhandled error: ' + err.toString());
        log.push('Stack: ' + err.stack);
        log.push('=== END (with error) ===');
        log.forEach(function(msg) { Logger.log(msg); });

        return ContentService
            .createTextOutput(JSON.stringify({ success: false, error: err.toString(), log: log }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function errorResponse(msg, log) {
    log.push('Returning error: ' + msg);
    log.forEach(function(m) { Logger.log(m); });
    return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: msg, log: log }))
        .setMimeType(ContentService.MimeType.JSON);
}

// ─── DO GET (health check) ────────────────────────────────────────────────────
function doGet() {
    Logger.log('Health check called');
    const info = {
        status: 'running',
        sheetId: SPREADSHEET_ID,
        sheetName: SHEET_NAME,
        calendarId: CALENDAR_ID,
        discordConfigured: DISCORD_WEBHOOK_URL.length > 20
    };
    Logger.log(JSON.stringify(info));
    return ContentService
        .createTextOutput(JSON.stringify(info))
        .setMimeType(ContentService.MimeType.JSON);
}

// ─── EXPECTED COLUMN HEADERS ──────────────────────────────────────────────────
var HEADERS = [
    'Timestamp', 'Name', 'First Meeting?', 'Reason', 'Note',
    'Day', 'Duration', 'Time', 'Time Range End', 'Client Timestamp'
];

// ─── GET OR CREATE SHEET WITH ALL COLUMNS ────────────────────────────────────
function getOrCreateSheet(log) {
    log.push('  Opening spreadsheet: ' + SPREADSHEET_ID);
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    log.push('  Spreadsheet name: ' + ss.getName());
    log.push('  Looking for sheet: ' + SHEET_NAME);

    var sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
        log.push('  Sheet not found – creating new sheet: ' + SHEET_NAME);
        sheet = ss.insertSheet(SHEET_NAME);
        sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
        sheet.setFrozenRows(1);
        log.push('  New sheet created with headers');
        return sheet;
    }

    log.push('  Sheet found. Last row: ' + sheet.getLastRow() + ', Last col: ' + sheet.getLastColumn());

    if (sheet.getLastRow() === 0) {
        log.push('  Sheet is empty – writing headers');
        sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
        sheet.setFrozenRows(1);
        return sheet;
    }

    // Read existing headers
    var existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    log.push('  Existing headers: [' + existingHeaders.join(' | ') + ']');

    var existingLower = existingHeaders.map(function(h) { return String(h).toLowerCase().trim(); });
    var columnsToAdd = HEADERS.filter(function(h) { return existingLower.indexOf(h.toLowerCase().trim()) === -1; });

    if (columnsToAdd.length > 0) {
        log.push('  Adding missing columns: [' + columnsToAdd.join(', ') + ']');
        var newCol = sheet.getLastColumn() + 1;
        sheet.getRange(1, newCol, 1, columnsToAdd.length).setValues([columnsToAdd]);
    } else {
        log.push('  All expected columns already exist');
    }

    return sheet;
}

// ─── BUILD A SHEET ROW FROM FORM DATA ────────────────────────────────────────
function buildRow(data, existingHeaders, log) {
    var now = new Date();
    var valueMap = {
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

    var row = existingHeaders.map(function(h) { return valueMap[String(h).toLowerCase().trim()] || ''; });
    log.push('  Built row: [' + row.join(' | ') + ']');
    return row;
}

// ─── APPEND DATA TO GOOGLE SHEET ─────────────────────────────────────────────
function appendToSheet(data, log) {
    log.push('  getOrCreateSheet...');
    var sheet = getOrCreateSheet(log);
    log.push('  Reading existing headers for column mapping...');
    var existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    log.push('  Headers read: ' + existingHeaders.length + ' columns');
    var row = buildRow(data, existingHeaders, log);
    log.push('  Appending row...');
    sheet.appendRow(row);
    log.push('  Row appended. New last row: ' + sheet.getLastRow());
}

// ─── CREATE GOOGLE CALENDAR EVENT ────────────────────────────────────────────
function createCalendarEvent(data, log) {
    log.push('  Getting calendar: ' + CALENDAR_ID);
    var calendar = CalendarApp.getCalendarById(CALENDAR_ID);
    if (!calendar) {
        log.push('[FAIL] Calendar not found for ID: ' + CALENDAR_ID);
        throw new Error('Calendar not found. Check CALENDAR_ID.');
    }
    log.push('  Calendar found: ' + calendar.getName());

    log.push('  Parsing date/time: day=' + data.day + ', time=' + data.time);
    var startDate = parseDateTime(data.day, data.time, log);
    if (!startDate) {
        log.push('[FAIL] Could not parse date/time. day="' + data.day + '", time="' + data.time + '"');
        throw new Error('Could not parse day/time from form data. day="' + data.day + '", time="' + data.time + '"');
    }
    log.push('  Parsed start date: ' + startDate.toString());

    var durationMinutes = parseDuration(data.duration, log);
    log.push('  Duration parsed: ' + durationMinutes + ' minutes');
    var endDate = new Date(startDate.getTime() + durationMinutes * 60000);
    log.push('  End date: ' + endDate.toString());

    var eventTitle = data.name ? 'Call with ' + data.name : 'Scheduled Call';
    log.push('  Event title: ' + eventTitle);

    var descriptionLines = [];
    if (data.reason) descriptionLines.push('Reason: ' + data.reason);
    if (data.note) descriptionLines.push('Note: ' + data.note);
    if (data.isFirstMeeting !== null) descriptionLines.push('First meeting: ' + (data.isFirstMeeting ? 'Yes' : 'No'));
    descriptionLines.push('Time range end: ' + (data.timeRangeEnd || 'N/A'));
    var description = descriptionLines.join('\n');

    log.push('  Creating calendar event...');
    var event = calendar.createEvent(eventTitle, startDate, endDate, { description: description });
    log.push('  Event created: ' + event.getId() + ' — ' + event.getTitle());
    return event.getId();
}

// ─── SEND DISCORD NOTIFICATION ────────────────────────────────────────────────
function sendDiscordNotification(data, log) {
    var timeStr = data.time + (data.timeRangeEnd ? ' - ' + data.timeRangeEnd : '');
    var meetingStr = data.isFirstMeeting === true ? 'First meeting' : data.isFirstMeeting === false ? 'Follow-up' : 'Not specified';

    log.push('  Building Discord embed...');
    var embed = {
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

    var payload = { embeds: [embed] };

    log.push('  POSTing to Discord webhook...');
    var options = {
        method: 'post',
        headers: { 'Content-Type': 'application/json' },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
    };

    var response = UrlFetchApp.fetch(DISCORD_WEBHOOK_URL, options);
    var responseCode = response.getResponseCode();
    log.push('  Discord response code: ' + responseCode);

    if (responseCode < 200 || responseCode >= 300) {
        log.push('  Discord response body: ' + response.getContentText());
    }

    return responseCode;
}

// ─── PARSE DAY + TIME INTO A DATE ────────────────────────────────────────────
function parseDateTime(dayStr, timeStr, log) {
    if (!dayStr) { log.push('  [parseDateTime] dayStr is empty'); return null; }
    if (!timeStr) { log.push('  [parseDateTime] timeStr is empty'); return null; }

    log.push('  [parseDateTime] Input: day="' + dayStr + '", time="' + timeStr + '"');

    var dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var targetDayIndex = dayNames.indexOf(dayStr);
    if (targetDayIndex === -1) {
        log.push('  [parseDateTime] Unknown day name: ' + dayStr);
        return null;
    }
    log.push('  [parseDateTime] Target day index: ' + targetDayIndex);

    var now = new Date();
    log.push('  [parseDateTime] Current time: ' + now.toString() + ' (day index: ' + now.getDay() + ')');

    var daysUntil = targetDayIndex - now.getDay();
    if (daysUntil <= 0) daysUntil += 7;
    log.push('  [parseDateTime] Days until next ' + dayStr + ': ' + daysUntil);

    var eventDate = new Date(now);
    eventDate.setDate(now.getDate() + daysUntil);
    log.push('  [parseDateTime] Date before setting time: ' + eventDate.toString());

    // Parse time
    var amPmMatch = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    var militaryMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);

    var hours, minutes;

    if (amPmMatch) {
        hours = parseInt(amPmMatch[1]);
        minutes = parseInt(amPmMatch[2]);
        var modifier = amPmMatch[3].toUpperCase();
        log.push('  [parseDateTime] Matched 12h format: ' + hours + ':' + minutes + ' ' + modifier);
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
        log.push('  [parseDateTime] Converted to 24h: ' + hours + ':' + minutes);
    } else if (militaryMatch) {
        hours = parseInt(militaryMatch[1]);
        minutes = parseInt(militaryMatch[2]);
        log.push('  [parseDateTime] Matched 24h format: ' + hours + ':' + minutes);
    } else {
        log.push('  [parseDateTime] Could not parse time format. Expected "10:00 AM" or "14:30"');
        return null;
    }

    eventDate.setHours(hours, minutes, 0, 0);
    log.push('  [parseDateTime] Final event date: ' + eventDate.toString());
    log.push('  [parseDateTime] ISO: ' + eventDate.toISOString());
    return eventDate;
}

// ─── PARSE DURATION STRING INTO MINUTES ──────────────────────────────────────
function parseDuration(durationStr, log) {
    if (!durationStr) {
        log.push('  [parseDuration] No duration provided, defaulting to 30 min');
        return 30;
    }

    var lower = durationStr.toLowerCase();
    log.push('  [parseDuration] Parsing: "' + durationStr + '"');

    var result = 30; // default

    if (lower.indexOf('20-30') !== -1 || lower.indexOf('20 – 30') !== -1) {
        result = 30;
        log.push('  [parseDuration] Matched: 20-30 mins → 30');
    } else if (lower.indexOf('1 hour') === 0 || lower === '1 hour') {
        result = 60;
        log.push('  [parseDuration] Matched: 1 hour → 60');
    } else if (lower.indexOf('60') !== -1 || lower.indexOf('2 hours') !== -1) {
        result = 120;
        log.push('  [parseDuration] Matched: 60 mins - 2 hours → 120');
    } else if (lower.indexOf('2+') !== -1 || lower.indexOf('2 +') !== -1) {
        result = 150;
        log.push('  [parseDuration] Matched: 2 hours+ → 150');
    } else {
        var match = lower.match(/(\d+)\s*(min|hour)/);
        if (match) {
            var val = parseInt(match[1]);
            if (match[2].indexOf('hour') !== -1) {
                result = val * 60;
                log.push('  [parseDuration] Fallback matched: ' + val + ' hour(s) → ' + result);
            } else {
                result = val;
                log.push('  [parseDuration] Fallback matched: ' + val + ' min(s) → ' + result);
            }
        } else {
            log.push('  [parseDuration] No pattern matched, defaulting to 30');
        }
    }

    return result;
}
