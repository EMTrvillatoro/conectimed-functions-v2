const functions = require('firebase-functions');
const Tools = require('../Tools');

/**
 * Request Admin Messaging
 * @param {functions.https.Request} request - Https Request.
 * @param {functions.Response<any>} response - Response Any.
 * @returns {Promise<functions.Response<any>>}  Any
 */

exports.handler_onRequest = async function (request, response) {
  response.header('Content-Type', 'application/json');
  response.header('Access-Control-Allow-Origin', '*');
  response.header('Access-Control-Allow-Headers', 'Content-Type');
  if (request.method === 'OPTIONS') {
    return response.send('');
  }
  if (request && request.method === 'POST') {
    try {
      const URL = functions.config().cloud_messaging.url;
      const accessToken = (await Tools.getAccessToken()).token;
      const body = request.body;
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      };
      if (body && body.message) {
        const resp = await Tools.sendRequest(URL, headers, 'POST', body);
        return response.send(resp.data);
      } else {
        return response.send({ message: `Body is needed!.` });
      }
    } catch (e) {
      console.error(e);
      return response.send(e);
    }
  } else {
    return response.send({ message: `${request.method} Method Not Allowed` });
  }
};

/**
 * Request Admin Messaging
 * @param {any} data - any data.
 * @param {functions.https.CallableContext} context - Response Any.
 * @returns {Promise<functions.Response<any>>}  Any
 */

exports.handler_onCall = async (data, context) => {
  if (context.auth && context.auth.uid) {
    try {
      const URL = functions.config().cloud_messaging.url;
      const accessToken = (await Tools.getAccessToken()).token;
      const body = data;
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      };
      if (body && body.message) {
        const resp = await Tools.sendRequest(URL, headers, 'POST', body);
        return resp.data;
      } else {
        throw new functions.https.HttpsError(
          'parameters are missing',
          'The function was called but parameters are missing'
        );
      }

    } catch (error) {
      throw new functions.https.HttpsError(
        'unexpected error',
        'The function was called and an unexpected error occurred'
      );
    }
  } else {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated');
  }
};