const functions = require('firebase-functions');
const Tools = require('../Tools');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
  const settings = { timestampsInSnapshots: true };
  admin.firestore().settings(settings);
}

exports.handler = async (data, context) => {
  if (context.auth && context.auth.uid) {
    // check token in WP
    const headers = {
      'Content-Type': 'application/json'
    };
    try {
      const respuesta = await Tools.sendRequest(functions.config().configwp.generate_token_url, headers, 'POST', {
        username: functions.config().configwp.generate_token_email,
        password: functions.config().configwp.generate_token_p
      });

      if (respuesta.status === 200) {
        // send token
        return {
          sucess: true,
          token: respuesta.data.token
        };
      } else {
        throw new functions.https.HttpsError('unauthenticated', respuesta.data.message);
      }
    } catch (error) {
      console.log(error);
      throw new functions.https.HttpsError('unauthenticated', error.message);
    }
  } else {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated');
  }
};
