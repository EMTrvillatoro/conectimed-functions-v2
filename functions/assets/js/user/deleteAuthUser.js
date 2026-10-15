const { HttpsError } = require('firebase-functions/v2/https');
const Tools = require('../Tools');

async function deleteAuthUserCallable(request) {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated');
  }

  const data = request.data || {};
  if (!data.uid) {
    throw new HttpsError('missing-parameters', 'missing parameters (uid)');
  }

  const admin = Tools.getFBAdminInstance();
  const db = admin.firestore();

  try {
    try {
      await db.collection('users').doc(data.uid).delete();
    } catch (e) {
      console.error('Error deleting user doc:', e);
    }
    try {
      await db.collection('medico-meta').doc(data.uid).delete();
    } catch (e) {
      console.error('Error deleting medico-meta doc:', e);
    }
    try {
      await db.collection('representante-meta').doc(data.uid).delete();
    } catch (e) {
      console.error('Error deleting representante-meta doc:', e);
    }
    await admin.auth().deleteUser(data.uid);
    return { success: true };
  } catch (error) {
    console.error('Error in deleteAuthUserCallable:', error);
    throw new HttpsError('internal', error.message || 'Error deleting auth user');
  }
}

module.exports = {
  deleteAuthUserCallable
};
