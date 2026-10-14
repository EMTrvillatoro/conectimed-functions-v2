const functions = require('firebase-functions');
const admin = require('firebase-admin');
const tools = require('../Tools');

const moment = require('moment');

if (!admin.apps.length) {
  admin.initializeApp();
  const settings = { timestampsInSnapshots: true };
  admin.firestore().settings(settings);
}

const db = admin.firestore();

exports.handler = async function(change, context) {
  try {
    const document = change.after.exists ? change.after.data() : null;
    const oldDocument = change.before.exists ? change.before.data() : null;

    if (!oldDocument) {
      console.log('new chat');
      // await createActivity(document, change.after.id);
    } else if (!document) {
      console.log('chat deleted');
    } else if (oldDocument) {
      if (
        document.last_message &&
        oldDocument.last_message &&
        !moment(document.last_message.date.toDate()).isSame(oldDocument.last_message.date.toDate())
      ) {
        console.log('chat new message');
        await createActivity(document, change.after.id);
      }
    }
  } catch (error) {
    console.log(error);
  }
};

async function createActivity(document, object_id) {
  // console.log(JSON.stringify(document));
  // get users involve
  const thisUser = (
    await db
      .collection('users')
      .doc(document.last_message.user)
      .get()
  ).data();

  if (document.participants) {
    const array = document.participants.filter((item, index) => {
      if (item !== document.last_message.user) {
        return item[index];
      }
      return null;
    });

    const otherUserId = array[0];

    const otherUser = (
      await db
        .collection('users')
        .doc(otherUserId)
        .get()
    ).data();

    // create activity for thisUser
    const actividad = {
      date: document.last_message.date,
      title: `Usted le ha enviado un mensaje a ${otherUser.name} ${otherUser.lastName1 ? otherUser.lastName1 : ''}${
        otherUser.lastName2 ? ' ' + otherUser.lastName2 : ''
      }`,
      user_id: document.last_message.user,
      other_id: otherUserId,
      viewed: false,
      type: 'chat',
      object_id
    };

    await db.collection('activity').add(actividad);

    const message = `${thisUser.name} ${thisUser.lastName1 ? thisUser.lastName1 : ''}${
      thisUser.lastName2 ? ' ' + thisUser.lastName2 : ''
    } le ha enviado un mensaje`;

    // create activity for otherUser
    const actividad2 = {
      date: document.last_message.date,
      title: message,
      user_id: otherUserId,
      other_id: document.last_message.user,
      viewed: false,
      type: 'chat',
      object_id
    };

    await db.collection('activity').add(actividad2);

    // send notification to otherUser
    if (otherUser.deviceMobileToken) {
      await tools.sendNotificationHandler(
        otherUser.deviceMobileToken,
        'Nuevo mensaje',
        message,
        'normal',
        'chat',
        object_id,
        'movile',
        otherUserId
      );
    }

    if (otherUser.deviceWebToken) {
      await tools.sendNotificationHandler(
        otherUser.deviceWebToken,
        'Nuevo mensaje',
        message,
        'normal',
        'chat',
        object_id,
        'web',
        otherUserId
      );
    }

    if (otherUserId) {
      await tools.notificationList(message, 'chat', object_id, otherUserId);
    }
  }
}
