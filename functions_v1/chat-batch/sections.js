const admin = require('firebase-admin');
const chatBatch = require('./chat-batch');

if (!admin.apps.length) {
  admin.initializeApp();
  const settings = { timestampsInSnapshots: true };
  admin.firestore().settings(settings);
}

const db = admin.firestore();

exports.handler = async function(change, context) {
  if (change && change.after && change.after.get('status') === 'in_progress') {
    const message_request = (await db.doc('chats-batch/' + context.params.id_batch).get()) || {};
    const message = message_request.data();
    const repid = message.repid;
    const messages = message.messages;
    const _array = Array.from(change.after.get('data')) || [];
    const next_page = change.after.get('next_page') || null;

    for (let user_id of _array) {
      try {
        await chatBatch.createChatHandler(user_id, messages, repid);
      } catch (error) {
        console.log(JSON.stringify(error));
      }
    }

    try {
      await change.after.ref.update({ status: 'complete' });
    } catch (error) {
      console.log(JSON.stringify(error));
    }

    if (next_page && next_page !== null) {
      try {
        await db
          .doc('chats-batch/' + context.params.id_batch + '/sections/' + next_page)
          .update({ status: 'in_progress' });
      } catch (error) {
        console.log(JSON.stringify(error));
      }
    } else {
      try {
        await db.doc('chats-batch/' + context.params.id_batch).update({ status: 'complete' });
      } catch (error) {
        console.log(JSON.stringify(error));
      }
    }
    console.log('====== CHAT BATCH PAGE: ' + change.after.id + ' ======');
    return true;
  } else {
    return false;
  }
};
