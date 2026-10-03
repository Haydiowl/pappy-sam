const { availableSlots, enforceRateLimit, send } = require('./_calendar');

module.exports = async (request, response) => {
  if (request.method !== 'GET') return send(response, 405, { message: 'Method not allowed.' });
  try {
    enforceRateLimit(request);
    const { slots, timezone } = await availableSlots({ date: request.query.date, duration: request.query.duration });
    return send(response, 200, { slots, timezone });
  } catch (error) {
    return send(response, error.statusCode || 500, { message: error.message || 'Availability could not be loaded.' });
  }
};
