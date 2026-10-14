const { HttpsError } = require('firebase-functions/v2/https');
const Tools = require('../Tools');

async function setPointsHandler(request) {
  const body = request.data || {};

  if (!body.points) {
    throw new HttpsError('invalid-argument', 'El valor points es requerido');
  }

  if (!body.note) {
    throw new HttpsError('invalid-argument', 'El valor note es requerido');
  }

  if (!body.user_id) {
    throw new HttpsError('invalid-argument', 'El valor user_id es requerido');
  }

  if (request.auth && request.auth.uid) {
    const admin = Tools.getFBAdminInstance();
    const db = admin.firestore();

    const userRef = db.collection('users').doc(body.user_id);
    let user = {};
    let newCount = 0;

    try {
      await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) {
          throw new HttpsError('not-found', 'User not found');
        }
        user = userDoc.data();
        newCount = (Number(user.points) || 0) + Number(body.points);
        transaction.update(userRef, { points: newCount });
      });

      const transactionData = {
        date: new Date(),
        event: body.note,
        points: body.points,
        uuid: body.user_id,
        type: body.points < 0 ? 'out' : 'in'
      };

      await db.collection('transactions').add(transactionData);

      return {
        success: true,
        message: `Added ${body.points} to ${user.email}, total ${newCount}`
      };
    } catch (error) {
      console.error('Transaction failed in setPointsHandler:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', error.message || 'Transaction failed');
    }
  } else {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated');
  }
}

module.exports = {
  setPointsHandler
};
