// Merrash Google Calendar webhook (version activa abril 2026)
const DEFAULT_TIMEZONE = 'America/Mexico_City';
const DEFAULT_DURATION_MINUTES = 60;

function parseDateAndTime(preferredDate, preferredTime) {
  const now = new Date();
  const dateText = String(preferredDate || '').trim().toLowerCase();
  const timeText = String(preferredTime || '').trim().toLowerCase();

  let year = now.getFullYear();
  let month = now.getMonth();
  let day = now.getDate();

  if (dateText === 'hoy') {
    // today
  } else if (dateText === 'mañana' || dateText === 'manana') {
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    year = tomorrow.getFullYear();
    month = tomorrow.getMonth();
    day = tomorrow.getDate();
  } else {
    const yyyyMmDd = dateText.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
    if (yyyyMmDd) {
      year = Number(yyyyMmDd[1]);
      month = Number(yyyyMmDd[2]) - 1;
      day = Number(yyyyMmDd[3]);
    } else {
      const ddMmYyyy = dateText.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
      if (ddMmYyyy) {
        day = Number(ddMmYyyy[1]);
        month = Number(ddMmYyyy[2]) - 1;
        const y = Number(ddMmYyyy[3]);
        year = y < 100 ? 2000 + y : y;
      } else {
        const weekdays = {
          domingo: 0,
          lunes: 1,
          martes: 2,
          miercoles: 3,
          miércoles: 3,
          jueves: 4,
          viernes: 5,
          sabado: 6,
          sábado: 6,
        };

        if (weekdays[dateText] !== undefined) {
          const target = weekdays[dateText];
          const delta = (target - now.getDay() + 7) % 7 || 7;
          const nextWeekday = new Date(now);
          nextWeekday.setDate(now.getDate() + delta);
          year = nextWeekday.getFullYear();
          month = nextWeekday.getMonth();
          day = nextWeekday.getDate();
        }
      }
    }
  }

  let hours = 10;
  let minutes = 0;

  const hhMm = timeText.match(/^(\d{1,2}):(\d{2})$/);
  if (hhMm) {
    hours = Number(hhMm[1]);
    minutes = Number(hhMm[2]);
  } else {
    const hAmPm = timeText.match(/^(\d{1,2})\s*(am|pm)$/i);
    if (hAmPm) {
      hours = Number(hAmPm[1]);
      const meridiem = hAmPm[2].toLowerCase();
      if (meridiem === 'pm' && hours < 12) hours += 12;
      if (meridiem === 'am' && hours === 12) hours = 0;
    }
  }

  const start = new Date(year, month, day, hours, minutes, 0, 0);
  const end = new Date(start.getTime() + DEFAULT_DURATION_MINUTES * 60 * 1000);
  return { start, end };
}

function buildEventDescription(payload) {
  return [
    `Cliente: ${payload.name || 'N/A'}`,
    `Email: ${payload.email || 'N/A'}`,
    `Teléfono: ${payload.phone || 'N/A'}`,
    `Servicio: ${payload.service || 'N/A'}`,
    `Fecha solicitada: ${payload.preferredDate || 'N/A'}`,
    `Hora solicitada: ${payload.preferredTime || 'N/A'}`,
    `Origen: ${payload.source || 'chatbot-web'}`,
    '',
    `Notas: ${payload.notes || 'Sin notas'}`
  ].join('\n');
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function formatPreferredDate(date, timezone) {
  return Utilities.formatDate(date, timezone || DEFAULT_TIMEZONE, 'yyyy-MM-dd');
}

function formatPreferredTime(date, timezone) {
  return Utilities.formatDate(date, timezone || DEFAULT_TIMEZONE, 'HH:mm');
}

function listCalendarEvents(calendar, payload) {
  const timezone = Session.getScriptTimeZone() || DEFAULT_TIMEZONE;
  const timeMin = payload.timeMin ? new Date(payload.timeMin) : new Date();
  const timeMax = payload.timeMax ? new Date(payload.timeMax) : new Date(new Date().getTime() + 365 * 24 * 60 * 60 * 1000);
  const includeDeleted = Boolean(payload.includeDeleted);

  const events = calendar.getEvents(timeMin, timeMax).map(function(event) {
    const attendees = event.getGuestList().map(function(guest) {
      return guest.getEmail();
    }).filter(Boolean);

    return {
      eventId: event.getId(),
      title: event.getTitle(),
      description: event.getDescription() || '',
      startIso: event.getStartTime().toISOString(),
      endIso: event.getEndTime().toISOString(),
      preferredDate: formatPreferredDate(event.getStartTime(), timezone),
      preferredTime: formatPreferredTime(event.getStartTime(), timezone),
      attendeeEmails: attendees,
      status: event.isAllDayEvent() ? 'confirmed' : 'confirmed'
    };
  });

  return jsonResponse({
    ok: true,
    action: 'list',
    calendarName: calendar.getName(),
    scriptTimeZone: timezone,
    includeDeleted: includeDeleted,
    total: events.length,
    events: events
  });
}

function getCalendar(payload) {
  const calendarId = String(payload.calendarId || '').trim();
  if (calendarId) {
    const c = CalendarApp.getCalendarById(calendarId);
    if (c) return c;
  }
  return CalendarApp.getDefaultCalendar();
}

function getEventByIdSafe(calendar, eventId) {
  if (!eventId) return null;

  const raw = String(eventId).trim();
  if (!raw) return null;

  let event = calendar.getEventById(raw);
  if (event) return event;

  if (raw.indexOf('@') === -1) {
    event = calendar.getEventById(raw + '@google.com');
    if (event) return event;
  }

  return null;
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ ok: false, error: 'Empty body' });
    }

    const payload = JSON.parse(e.postData.contents);
    const action = String(payload.action || 'create').toLowerCase().trim();

    if (!['create', 'update', 'delete', 'list'].includes(action)) {
      return jsonResponse({ ok: false, error: 'Invalid action. Use create, update, delete or list.' });
    }

    const calendar = getCalendar(payload);
    const scriptTz = Session.getScriptTimeZone();

    if (action === 'list') {
      return listCalendarEvents(calendar, payload);
    }

    if (action === 'delete') {
      if (!payload.eventId) {
        return jsonResponse({ ok: false, error: 'Missing eventId for delete' });
      }

      const existing = getEventByIdSafe(calendar, payload.eventId);
      if (!existing) {
        return jsonResponse({ ok: false, error: 'Event not found for delete', eventId: payload.eventId });
      }

      existing.deleteEvent();
      return jsonResponse({
        ok: true,
        action: 'delete',
        deleted: true,
        eventId: payload.eventId
      });
    }

    if (!payload.email || !payload.preferredDate || !payload.preferredTime) {
      return jsonResponse({ ok: false, error: 'Missing required fields: email, preferredDate, preferredTime' });
    }

    const parsed = parseDateAndTime(payload.preferredDate, payload.preferredTime);
    const title = `Cita Merrash - ${payload.service || 'Servicio'}`;
    const description = buildEventDescription(payload);

    if (action === 'update') {
      if (!payload.eventId) {
        return jsonResponse({ ok: false, error: 'Missing eventId for update' });
      }

      const existing = getEventByIdSafe(calendar, payload.eventId);
      if (!existing) {
        return jsonResponse({ ok: false, error: 'Event not found for update', eventId: payload.eventId });
      }

      existing.setTitle(title);
      existing.setDescription(description);
      existing.setTime(parsed.start, parsed.end);

      return jsonResponse({
        ok: true,
        action: 'update',
        eventId: existing.getId(),
        startIso: parsed.start.toISOString(),
        endIso: parsed.end.toISOString(),
        scriptTimeZone: scriptTz
      });
    }

    const created = calendar.createEvent(title, parsed.start, parsed.end, {
      description,
      guests: payload.email,
      sendInvites: true
    });

    return jsonResponse({
      ok: true,
      action: 'create',
      eventId: created.getId(),
      startIso: parsed.start.toISOString(),
      endIso: parsed.end.toISOString(),
      scriptTimeZone: scriptTz
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: String(error && error.message ? error.message : error)
    });
  }
}