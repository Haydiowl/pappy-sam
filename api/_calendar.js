const allowedDurations = new Set([30, 60, 90, 120, 180]);
const requestBuckets = new Map();

const getConfig = () => {
  const required = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN', 'GOOGLE_CALENDAR_ID'];
  const missing = required.filter(name => !process.env[name]);
  if (missing.length) {
    const error = new Error('Appointment booking is not configured yet. Please contact us directly.');
    error.statusCode = 503;
    throw error;
  }
  return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
    calendarId: process.env.GOOGLE_CALENDAR_ID,
    timezone: process.env.BOOKING_TIMEZONE || 'Africa/Lagos',
    start: process.env.BOOKING_WORKDAY_START || '09:00',
    end: process.env.BOOKING_WORKDAY_END || '17:00'
  };
};

const send = (response, statusCode, body) => response.status(statusCode).json(body);

const enforceRateLimit = request => {
  const client = request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const recent = (requestBuckets.get(client) || []).filter(time => now - time < 60_000);
  if (recent.length >= 12) {
    const error = new Error('Too many requests. Please wait a moment and try again.');
    error.statusCode = 429;
    throw error;
  }
  recent.push(now);
  requestBuckets.set(client, recent);
};

const getOffset = (date, timezone) => {
  const values = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  }).formatToParts(date).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  return Date.UTC(values.year, Number(values.month) - 1, values.day, values.hour, values.minute, values.second) - date.getTime();
};

const zonedDateTimeToUtc = (date, time, timezone) => {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  let result = new Date(guess - getOffset(new Date(guess), timezone));
  result = new Date(guess - getOffset(result, timezone));
  return result;
};

const getAccessToken = async config => {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: config.refreshToken,
    grant_type: 'refresh_token'
  });
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const data = await response.json();
  if (!response.ok || !data.access_token) {
    const error = new Error('The booking service is temporarily unavailable. Please try again later.');
    error.statusCode = 503;
    throw error;
  }
  return data.access_token;
};

const getBusyTimes = async (config, accessToken, start, end) => {
  const response = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ timeMin: start.toISOString(), timeMax: end.toISOString(), timeZone: config.timezone, items: [{ id: config.calendarId }] })
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error('The booking service is temporarily unavailable. Please try again later.');
    error.statusCode = 503;
    throw error;
  }
  return data.calendars?.[config.calendarId]?.busy || [];
};

const parseClock = value => {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
};

const formatSlot = (date, time, timezone) => new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: 'numeric', minute: '2-digit', hour12: true }).format(zonedDateTimeToUtc(date, time, timezone));

const availableSlots = async ({ date, duration }) => {
  const config = getConfig();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !allowedDurations.has(Number(duration))) {
    const error = new Error('Choose a valid date and appointment duration.');
    error.statusCode = 400;
    throw error;
  }
  const dayStart = zonedDateTimeToUtc(date, '00:00', config.timezone);
  const dayEnd = zonedDateTimeToUtc(date, '23:59', config.timezone);
  const accessToken = await getAccessToken(config);
  const busy = await getBusyTimes(config, accessToken, dayStart, dayEnd);
  const startMinutes = parseClock(config.start);
  const endMinutes = parseClock(config.end);
  const slots = [];
  for (let minutes = startMinutes; minutes + Number(duration) <= endMinutes; minutes += 15) {
    const time = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
    const startsAt = zonedDateTimeToUtc(date, time, config.timezone);
    const endsAt = new Date(startsAt.getTime() + Number(duration) * 60_000);
    const overlaps = busy.some(period => startsAt < new Date(period.end) && endsAt > new Date(period.start));
    if (!overlaps && startsAt > new Date()) slots.push({ value: time, label: formatSlot(date, time, config.timezone) });
  }
  return { slots, timezone: config.timezone };
};

const clean = (value, max = 500) => String(value || '').trim().replace(/[<>]/g, '').slice(0, max);

const validateBooking = booking => {
  const required = ['service', 'email', 'phone', 'supportType', 'date', 'time', 'duration', 'meetingFormat'];
  if (booking.service === 'agriculture') required.push('phone');
  const missing = required.some(key => !clean(booking[key]));
  if (missing || !['therapy', 'agriculture'].includes(booking.service) || !allowedDurations.has(Number(booking.duration)) || !/^\S+@\S+\.\S+$/.test(clean(booking.email))) {
    const error = new Error('Please complete all required fields with valid information.');
    error.statusCode = 400;
    throw error;
  }
};

const createBooking = async booking => {
  validateBooking(booking);
  const availability = await availableSlots(booking);
  if (!availability.slots.some(slot => slot.value === booking.time)) {
    const error = new Error('That time is no longer available. Please choose another available time.');
    error.statusCode = 409;
    throw error;
  }
  const config = getConfig();
  const accessToken = await getAccessToken(config);
  const start = zonedDateTimeToUtc(booking.date, booking.time, config.timezone);
  const end = new Date(start.getTime() + Number(booking.duration) * 60_000);
  const finalBusy = await getBusyTimes(config, accessToken, start, end);
  if (finalBusy.some(period => start < new Date(period.end) && end > new Date(period.start))) {
    const error = new Error('That time was just booked. Please choose another available time.');
    error.statusCode = 409;
    throw error;
  }
  const reference = `PS-${Date.now().toString(36).toUpperCase()}`;
  const appointmentName = booking.service === 'therapy' ? 'Therapy Session' : 'Agricultural Consultation';
  const details = [
    `Booking reference: ${reference}`,
    `Service: ${appointmentName}`,
    booking.fullName ? `Name: ${clean(booking.fullName, 120)}` : '',
    `Email: ${clean(booking.email, 160)}`,
    booking.phone ? `Phone: ${clean(booking.phone, 80)}` : '',
    booking.organisation ? `Organisation/Farm: ${clean(booking.organisation, 160)}` : '',
    booking.location ? `Location: ${clean(booking.location, 160)}` : '',
    `Type: ${clean(booking.supportType, 120)}`,
    `Format: ${clean(booking.meetingFormat, 60)}`,
    `Duration: ${booking.duration} minutes`,
    booking.message ? `Brief notes: ${clean(booking.message, 500)}` : ''
  ].filter(Boolean).join('\n');
  const event = {
    summary: `${appointmentName} | ${clean(booking.fullName || 'Website visitor', 80)}`,
    description: details,
    start: { dateTime: start.toISOString(), timeZone: config.timezone },
    end: { dateTime: end.toISOString(), timeZone: config.timezone },
    extendedProperties: { private: { bookingReference: reference, service: booking.service } },
    attendees: process.env.BOOKING_SEND_UPDATES === 'true' ? [{ email: clean(booking.email, 160) }] : undefined
  };
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(config.calendarId)}/events?sendUpdates=${process.env.BOOKING_SEND_UPDATES === 'true' ? 'all' : 'none'}`, {
    method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(event)
  });
  if (!response.ok) {
    const error = new Error('Your booking could not be created. Please try again or choose another time.');
    error.statusCode = 503;
    throw error;
  }
  return { reference, timezone: config.timezone };
};

module.exports = { allowedDurations, availableSlots, createBooking, enforceRateLimit, send };
