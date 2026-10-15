const Tools = require('../Tools');

async function onGroupsCreateHandler(event) {
  try {
    const admin = Tools.getFBAdminInstance();
    const db = admin.firestore();
    const snapshot = event.data;
    if (!snapshot) return true;

    const document = snapshot.data();
    const uid = event.params.uid || snapshot.id;

    if (!document || !document.uid) return true;

    const userInitiatorDoc = await db.doc(`users/${document.uid}`).get();
    if (!userInitiatorDoc.exists) return true;

    const userInitiator = userInitiatorDoc.data();
    const nameInitiator = `${userInitiator.name} ${userInitiator.lastName1} ${
      userInitiator.lastName2 ? userInitiator.lastName2 : ''
    }`;

    const message = `${nameInitiator} ha creado un grupo llamado ${document.name}`;
    await db.collection('activity').add({
      date: document.createdAt,
      user_id: document.uid,
      viewed: false,
      object_id: uid,
      type: 'groups',
      title: message
    });
  } catch (error) {
    console.error('Error in onGroupsCreateHandler:', error);
  }
  return true;
}

module.exports = {
  onGroupsCreateHandler
};
