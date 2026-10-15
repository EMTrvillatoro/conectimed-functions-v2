const { HttpsError } = require('firebase-functions/v2/https');
const Tools = require('../Tools');

async function emailVerificationAuthUserCallable(request) {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated');
  }

  const data = request.data || {};
  if (!data.email) {
    throw new HttpsError('missing-parameters', 'missing parameters (email)');
  }

  const admin = Tools.getFBAdminInstance();
  try {
    const link = await admin.auth().generateEmailVerificationLink(data.email);
    return link;
  } catch (error) {
    console.error('Error in emailVerificationAuthUserCallable:', error);
    throw new HttpsError('internal', error.message || 'Error generating email verification link');
  }
}

module.exports = {
  emailVerificationAuthUserCallable
};
