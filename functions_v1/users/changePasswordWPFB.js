const functions = require('firebase-functions');
const Tools = require('../Tools');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
  const settings = { timestampsInSnapshots: true };
  admin.firestore().settings(settings);
}

const db = admin.firestore();

exports.handler = async (data, context) => {
  const body = data;

  if (!body.email) {
    throw new functions.https.HttpsError('invalid-argument', 'El valor email es requerido para la validación');
  }

  if (!body.password) {
    throw new functions.https.HttpsError('invalid-argument', 'El valor password es requerido para la validación');
  }

  if (!body.token) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated');
  }

  // check token in WP
  let passChanged = false;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${body.token}`
  };
  try {
    const respuesta = await Tools.sendRequest(functions.config().configwp.validate_token_url, headers, 'POST');
    if (respuesta.data.data.status === 200) {
      // search in users model
      let searchUser = await db
        .collection('users')
        .where('email', '==', body.email)
        .limit(1)
        .get();

      for (userInfo of searchUser.docs) {
        if (!userInfo.data().isFullMigrated) {
          console.log('no full migrated, changing password');
          await admin.auth().updateUser(userInfo.id, { password: body.password });
          passChanged = true;
        } else {
          console.log('full migrated, NO changing password');
        }
      }
    }

    return {
      sucess: true,
      passChanged
    };
  } catch (error) {
    console.log(error);
    throw new functions.https.HttpsError('unauthenticated', error.response.data.message);
  }
};
