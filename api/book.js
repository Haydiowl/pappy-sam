const { createBooking, enforceRateLimit, send } = require('./_calendar');

module.exports = async (request, response) => {
  if (request.method !== 'POST') return send(response, 405, { message: 'Method not allowed.' });
  try {
    enforceRateLimit(request);
    const booking = await createBooking(request.body || {});
    return send(response, 201, booking);
  } catch (error) {
    return send(response, error.statusCode || 500, { message: error.message || 'Your booking could not be created.' });
  }
};
