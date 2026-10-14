const { HttpsError } = require('firebase-functions/v2/https');
const jwt = require('jsonwebtoken');
const moment = require('moment');

async function generateTokenZoomHandler(request) {
  if (request.auth && request.auth.uid) {
    const API_SECRET = process.env.CONFIGZOOM_SECRET || '';
    const API_KEY = process.env.CONFIGZOOM_APIKEY || '';
    const exp = moment().add(60, 'second');

    const payload = {
      iss: API_KEY,
      exp: moment(exp).unix()
    };

    const tokenNew = await jwt.sign(payload, API_SECRET);

    return {
      sucess: true,
      token: tokenNew
    };
  } else {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated');
  }
}

module.exports = {
  generateTokenZoomHandler
};
