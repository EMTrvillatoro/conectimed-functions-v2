const { HttpsError } = require('firebase-functions/v2/https');
const Tools = require('../Tools');
const moment = require('moment');

async function getAllUsersAuthUserHandler(req, res) {
  res.set('Content-Type', 'application/json');
  res.set('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method === 'POST') {
    try {
      const admin = Tools.getFBAdminInstance();
      const allUsers = [];
      let pageToken = undefined;

      do {
        const result = await admin.auth().listUsers(1000, pageToken);

        const nonAnonymous = result.users.filter(user =>
          user.providerData.length > 0 && !user.providerData.some(p => p.providerId === 'anonymous')
        );

        const _users = nonAnonymous.map(user => {
          return {
            uid: user.uid,
            email: user.email || null,
            disabled: user.disabled || false,
            creationTime: user.metadata.creationTime
              ? moment(user.metadata.creationTime).format('YYYY-MM-DD HH:mm:ss')
              : null,
            lastSignInTime: user.metadata.lastSignInTime
              ? moment(user.metadata.lastSignInTime).format('YYYY-MM-DD HH:mm:ss')
              : null
          };
        });

        allUsers.push(..._users);
        pageToken = result.pageToken;
      } while (pageToken);

      return res.status(200).json(allUsers);
    } catch (e) {
      console.error('Error in getAllUsersAuthUserHandler:', e);
      return res.status(204).json(e);
    }
  } else {
    return res.status(405).json({ code: 405, message: `${req.method} Method Not Allowed` });
  }
}

async function getAuthUserCallable(request) {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError(
      'unauthenticated',
      'The function must be called while authenticated'
    );
  }

  const data = request.data || {};

  if (!data.uid || typeof data.uid !== 'string') {
    return null;
  }

  const admin = Tools.getFBAdminInstance();

  try {
    return await admin.auth().getUser(data.uid.trim());
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      return null;
    }

    console.error('Error in getAuthUserCallable:', error);

    throw new HttpsError(
      'internal',
      'Error getting Firebase Auth user'
    );
  }
}

async function getAuthUserByEmailCallable(request) {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError(
      'unauthenticated',
      'The function must be called while authenticated'
    );
  }

  const data = request.data || {};

  if (!data.email || typeof data.email !== 'string') {
    return null;
  }

  const admin = Tools.getFBAdminInstance();
  const db = admin.firestore();

  try {
    const userAuth = await admin.auth().getUserByEmail(data.email.trim());

    if (userAuth && userAuth.uid && data.info === true) {
      const resp = await db.doc(`users/${userAuth.uid}`).get();

      let information = {};

      if (resp.exists) {
        information = resp.data() || {};
      }

      return {
        authInformation: userAuth,
        userInformation: information
      };
    }

    return userAuth;
  } catch (error) {
    if (
      error.code === 'auth/user-not-found' ||
      error.code === 'auth/invalid-email'
    ) {
      return null;
    }

    console.error('Error in getAuthUserByEmailCallable:', error);

    throw new HttpsError(
      'internal',
      'Error getting user by email'
    );
  }
}

async function resetPasswordAuthUserCallable(request) {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated');
  }

  const data = request.data || {};
  if (!data.email) {
    throw new HttpsError('invalid-argument', 'missing parameters (email)');
  }

  const admin = Tools.getFBAdminInstance();
  try {
    return await admin.auth().generatePasswordResetLink(data.email);
  } catch (error) {
    console.error('Error in resetPasswordAuthUserCallable:', error);
    throw new HttpsError('internal', error.message || 'Error generating password reset link');
  }
}

async function updateAuthUserCallable(request) {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated');
  }

  const data = request.data || {};
  if (!data.uid) {
    throw new HttpsError('invalid-argument', 'missing parameters (uid)');
  }

  const admin = Tools.getFBAdminInstance();
  const db = admin.firestore();

  try {
    const properties = data.data || {};
    if (properties && properties.email) {
      const email = String(properties.email).toLowerCase().trim();
      await db.collection('users').doc(data.uid).update({ email: email });
    }
    if (properties && (properties.disabled === false || properties.disabled === true)) {
      await db.collection('users').doc(data.uid).update({
        status: properties.disabled === true ? 'inactive' : 'active'
      });
    }
    return await admin.auth().updateUser(data.uid, properties);
  } catch (error) {
    console.error('Error in updateAuthUserCallable:', error);
    throw new HttpsError('internal', error.message || 'Error updating auth user');
  }
}

module.exports = {
  getAllUsersAuthUserHandler,
  getAuthUserCallable,
  getAuthUserByEmailCallable,
  resetPasswordAuthUserCallable,
  updateAuthUserCallable
};
