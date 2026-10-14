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
  // console.log(JSON.stringify(body));
  // Authentication / user information is automatically added to the request.
  if (!body.email) {
    throw new functions.https.HttpsError('invalid-argument', 'El valor email es requerido para la validación');
  }

  // search in users model
  let searchUser = await db
    .collection('users')
    .where('email', '==', body.email)
    .limit(1)
    .get();

  let isFullMigrated = false;

  if (searchUser.size >= 1) {
    for (const userInfo of searchUser.docs) {
      let usuario = userInfo.data();
      if (usuario.isFullMigrated && body.email === usuario.email) {
        isFullMigrated = true;
      } else if (usuario.wp_id === undefined && usuario.isFullMigrated === undefined) {
        isFullMigrated = true;
      }
    }
  } else {
    throw new functions.https.HttpsError('not-found', 'User not found');
  }

  return {
    sucess: true,
    isFullMigrated
  };
};
