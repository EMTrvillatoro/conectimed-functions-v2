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

  if (!body.points) {
    throw new functions.https.HttpsError('invalid-argument', 'El valor points es requerido');
  }

  if (!body.note) {
    throw new functions.https.HttpsError('invalid-argument', 'El valor note es requerido');
  }

  if (!body.user_id) {
    throw new functions.https.HttpsError('invalid-argument', 'El valor user_id es requerido');
  }

  if (context.auth && context.auth.uid) {
    const userRef = db.collection('users').doc(body.user_id);
    let user = {};
    let newCount = 0;

    return db
      .runTransaction(transaction => {
        // This code may get re-run multiple times if there are conflicts.
        return transaction.get(userRef).then(userDoc => {
          if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User not found');
          }
          user = userDoc.data();
          newCount = (Number(user.points) || 0) + Number(body.points);
          return transaction.update(userRef, { points: newCount });
        });
      })
      .then(async () => {
        // save transaction
        let transaction = {
          date: new Date(),
          event: body.note,
          points: body.points,
          uuid: body.user_id,
          type: 'in'
        };

        if (body.points < 0) {
          transaction.type = 'out';
        }

        await db.collection('transactions').add(transaction);
        return {
          success: true,
          message: `Added ${body.points} to ${user.email}, total ${newCount}`
        };
      })
      .catch(error => {
        console.log('Transaction failed: ', error);
        throw new functions.https.HttpsError('internal', 'Transaction failed');
      });
  } else {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated');
  }
};
