const Tools = require('../Tools');

async function onAddCreateHandler(event) {
  try {
    const admin = Tools.getFBAdminInstance();
    const db = admin.firestore();
    const snapshot = event.data;
    if (!snapshot) return true;

    const id = event.params.id || snapshot.id;
    const INCREMENT = admin.firestore.FieldValue.increment(1);

    await db.doc('information/advertising').set({ count: INCREMENT }, { merge: true });
    const data = await db.doc('information/advertising').get();
    const count = data.get('count');

    await db
      .collection('advertising')
      .doc(id)
      .update('order', Number(count));
  } catch (e) {
    console.error('Error in onAddCreateHandler:', e);
  }
  return true;
}

module.exports = {
  onAddCreateHandler
};
