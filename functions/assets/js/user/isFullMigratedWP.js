const { HttpsError } = require('firebase-functions/v2/https');
const { getFBAdminInstance } = require('../Tools');

async function isFullMigratedWPHandler(request) {
  const body = request.data || {};

  if (!body.email) {
    throw new HttpsError('invalid-argument', 'El valor email es requerido para la validación');
  }

  const admin = getFBAdminInstance();
  const db = admin.firestore();

  const searchUser = await db
    .collection('users')
    .where('email', '==', body.email)
    .limit(1)
    .get();

  let isFullMigrated = false;

  if (searchUser.size >= 1) {
    for (const userInfo of searchUser.docs) {
      const usuario = userInfo.data();
      if (usuario.isFullMigrated && body.email === usuario.email) {
        isFullMigrated = true;
      } else if (usuario.wp_id === undefined && usuario.isFullMigrated === undefined) {
        isFullMigrated = true;
      }
    }
  } else {
    throw new HttpsError('not-found', 'User not found');
  }

  return {
    sucess: true,
    isFullMigrated
  };
}

module.exports = {
  isFullMigratedWPHandler
};
