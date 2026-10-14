const Tools = require('../Tools');

exports.handler = async function(change, context) {
  try {
    const admin = Tools.getFBAdminInstance();
    const db = admin.firestore();
    const INCREMENT = admin.firestore.FieldValue.increment(1);
    await db.doc('information/advertising').set({ count: INCREMENT }, { merge: true });
    const data = await db.doc('information/advertising').get();
    const count = data.get('count');
    await db
      .collection('advertising')
      .doc(change.id)
      .update('order', Number(count));
  } catch (e) {
    console.error(e);
  }
  return true;
};
