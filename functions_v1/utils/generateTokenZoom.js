const functions = require('firebase-functions');
const Tools = require('../Tools');

exports.handler = async (data, context) => {
  const jwt = require('jsonwebtoken');
  const moment = require('moment');

  if (context.auth && context.auth.uid) {
    const API_SECRET = functions.config().configzoom.secret;
    const API_KEY = functions.config().configzoom.apikey;
    const exp = moment().add(60, 'second');

    const payload = {
      iss: API_KEY,
      exp: moment(exp).valueOf()
    };

    const tokenNew = await jwt.sign(payload, API_SECRET);

    return {
      sucess: true,
      token: tokenNew
    };
  } else {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated');
  }
};
