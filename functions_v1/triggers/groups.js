/* eslint-disable no-case-declarations */
const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
  const settings = { timestampsInSnapshots: true };
  admin.firestore().settings(settings);
}

const db = admin.firestore();

const handler = async (data, uid, eventType) => {
  const document = data;

  const userInitiator = (await db.doc(`users/${document.uid}`).get()).data();

  const nameInitiator = `${userInitiator.name} ${userInitiator.lastName1} ${
    userInitiator.lastName2 ? userInitiator.lastName2 : ''
  }`;

  let message;
  switch (eventType) {
    case 'create':
      message = `${nameInitiator} ha creado un grupo llamado ${document.name}`;
      await saveActivity(uid, 'groups', document.uid, document.createdAt, message);
      break;
    case 'update':
      message = `${nameInitiator} ha editado el grupo '${document.name}'`;
      await saveActivity(uid, 'groups', document.uid, document.createdAt, message);
      break;
  }

  return true;
};

const saveActivity = async (object_id, type, user_id, date, title) => {
  let activity = {
    date: date,
    user_id,
    viewed: false,
    object_id,
    type,
    title
  };

  return db
    .collection('activity')
    .doc()
    .set(activity);
};

exports.onCreate = (change, context) => {
  return handler(change.data(), context.params.uid, 'create');
};
