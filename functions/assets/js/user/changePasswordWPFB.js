const { HttpsError } = require('firebase-functions/v2/https');
const Tools = require('../Tools');

async function changePasswordWPFBHandler(request) {
  const body = request.data || {};

  if (!body.email) {
    throw new HttpsError('invalid-argument', 'El valor email es requerido para la validación');
  }

  if (!body.password) {
    throw new HttpsError('invalid-argument', 'El valor password es requerido para la validación');
  }

  if (!body.token) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated');
  }

  const admin = Tools.getFBAdminInstance();
  const db = admin.firestore();

  let passChanged = false;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${body.token}`
  };

  try {
    const validateUrl = process.env.CONFIGWP_VALIDATE_TOKEN_URL || '';
    const respuesta = await Tools.sendRequest(validateUrl, headers, 'POST');

    if (respuesta.data && respuesta.data.data && respuesta.data.data.status === 200) {
      const searchUser = await db
        .collection('users')
        .where('email', '==', body.email)
        .limit(1)
        .get();

      for (const userInfo of searchUser.docs) {
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
    console.error('Error in changePasswordWPFBHandler:', error);
    const msg = (error.response && error.response.data && error.response.data.message) ? error.response.data.message : error.message;
    throw new HttpsError('unauthenticated', msg || 'Error changing password');
  }
}

module.exports = {
  changePasswordWPFBHandler
};
