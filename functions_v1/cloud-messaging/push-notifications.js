const functions = require('firebase-functions');
const Tools = require('../Tools');
const admin = Tools.getFBAdminInstance();
const messaging = admin.messaging();
const db = admin.firestore();

/**
 * Request Admin Messaging
 * @param {functions.https.Request} request - Https Request.
 * @param {functions.Response<any>} response - Response Any.
 * @returns {Promise<functions.Response<any>>}  Any
 */

exports.admin_messaging_onRequest = async function(request, response) {
  response.header('Content-Type', 'application/json');
  response.header('Access-Control-Allow-Origin', '*');
  response.header('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return response.status(204).send('');
  }

  if (request && request.method === 'GET') {
    const page = request && request.query && request.query.page ? Number(request.query.page) : 1;
    const id = request && request.query && request.query.id ? request.query.id : undefined;
    try {
      if (page && id) {
        const messages = await sendMessages(id, page);
        return response.status(200).send({ response: messages });
      } else {
        return response.status(500).send({ msg: 'Faltan parámetros' });
      }
    } catch (error) {
      return response.status(500).send({ error: error });
    }
  } else {
    return response.status(405).send({ code: 405, message: `${request.method} Method Not Allowed` });
  }
};

/**
 * Request Admin Messaging
 * @param {functions.https.Request} request - Https Request.
 * @param {functions.Response<any>} response - Response Any.
 * @returns {Promise<functions.Response<any>>}  Any
 */

exports.admin_messaging_movil_onRequest = async function(request, response) {
  response.header('Content-Type', 'application/json');
  response.header('Access-Control-Allow-Origin', '*');
  response.header('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return response.status(204).send('');
  }

  if (request && request.method === 'POST') {
    console.log(request.body);
    if (request && request.body && request.body.settings) {
      const resp = await createPagintationForMovil(request.body.settings);
      return response.status(200).send({ response: resp });
    } else {
      return response.status(401).send({ message: 'missing parameters' });
    }
  } else {
    return response.status(405).send({ code: 405, message: `${request.method} Method Not Allowed` });
  }
};

async function sendMessages(id_batch, _page) {
  try {
    const docBatch = db.doc(`notifications-batch/${id_batch}`);
    const docPage = docBatch.collection('pages').doc(`${_page}`);

    const respBatch = (await docBatch.get()) || {};
    const respPage = (await docPage.get()) || {};

    const batch = respBatch.data();
    const page = respPage.data();

    let settings = batch && batch.settings ? batch.settings : {};
    const tokens = page && page.tokens ? Array.from(page.tokens) : [];

    let messages = [];

    for (let token of tokens) {
      settings.token = token;
      const _message = getMessage(settings);
      messages.push(_message.message);
    }

    const sendResponse = await messaging.sendAll(messages, false);

    await docPage.update({ status: 'complete' });

    const current_page = page && page.page ? Number(page.page) : undefined;
    const total_page = page && page.total_page ? Number(page.total_page) : undefined;

    console.log(`=== Page ${current_page} completed ===`);

    if (current_page === total_page) {
      await docBatch.update({ status: 'complete' });
      console.log(`=== Batch ${id_batch} completed ===`);
    }

    if (current_page < total_page) {
      docBatch
        .collection('pages')
        .doc(`${current_page + 1}`)
        .update({ status: 'in_progress' });
      console.log(`=== Next page ${current_page + 1} updated ===`);
    }

    console.log(`=== Page ${current_page} of ${total_page} ===`);

    return sendResponse;
  } catch (error) {
    console.error(error);
    return error;
  }
}

/**
 * Admin Messaging
 * @param {functions.Change<functions.firestore.QueryDocumentSnapshot>} change - QueryDocumentSnapshot.
 * @param {functions.EventContext} context - EventContext.
 * @returns {Promise<void>} Promise void
 */

exports.admin_messaging_onUpdate = async function(change, context) {
  if (change && change.after && change.after.get('status') === 'in_progress') {
    await sendMessages(context.params.id_batch, context.params.page);
    return true;
  } else {
    return false;
  }
};

function getMessage(settings) {
  let link_web = '';
  if (settings && settings.analytics_label) {
    link_web = `${settings.refLink}?analytics_label=${settings.analytics_label}`;
  } else {
    link_web = settings.refLink;
  }
  let pushNotification = {
    message: {
      token: settings.token,
      notification: {
        title: settings.title,
        body: settings.body,
        image: settings.image_url
      },
      android: {
        notification: {
          title: settings.title,
          body: settings.body
        },
        data: {
          type: 'segmented-notification',
          data: settings.link
        },
        fcm_options: {
          analytics_label: settings.analytics_label
        }
      },
      webpush: {
        notification: {
          title: settings.title,
          body: settings.body,
          click_action: link_web
        },
        fcm_options: {
          link: link_web,
          analytics_label: settings.analytics_label
        }
      },
      apns: {
        fcm_options: {
          image: settings.image_url,
          analytics_label: settings.analytics_label
        }
      },
      fcm_options: {
        analytics_label: settings.analytics_label
      },
      data: {
        type: 'segmented-notification',
        data: settings.link
      }
    }
  };
  return removeEmpty(pushNotification);
}

function removeEmpty(obj) {
  Object.keys(obj).forEach(key => {
    (obj[key] && typeof obj[key] === 'object' && removeEmpty(obj[key])) ||
      ((obj[key] === '' || obj[key] === null || obj[key] === undefined) && delete obj[key]);
  });
  return obj;
}

/**
 * Get Tokens
 * @param {any} settings - Settings data
 * @returns {Promise<void>} Promise void
 */

async function createPagintationForMovil(settings) {
  try {
    const batch = db.batch();
    const respBatch = await db
      .collection('notifications-batch')
      .add({ status: 'pending', date: new Date(), settings: settings });
    const id = respBatch.id;
    const resp = await db
      .collection('users')
      .where('deviceMobileToken', '!=', null)
      .get();
    const arrayTokens = resp.docs.map(e => e.get('deviceMobileToken'));
    const LENGTH = 300;
    let finalArray = [];
    const doc = db.collection('notifications-batch').doc(id);

    for (let i = 0; i < arrayTokens.length; i += LENGTH) {
      let slice = arrayTokens.slice(i, i + LENGTH);
      finalArray.push(slice);
    }

    let index = 0;

    for (let tokens of finalArray) {
      const data = {
        tokens: tokens,
        page: index + 1,
        date: new Date(),
        status: 'pending',
        total_page: finalArray.length
      };
      batch.set(doc.collection('pages').doc(`${index + 1}`), data);
      index++;
    }

    await batch.commit();
    await doc.update({ status: 'in_progress' });
    await doc
      .collection('pages')
      .doc('1')
      .update({ status: 'in_progress' });

    return id;
  } catch (error) {
    console.error(error);
    return false;
  }
}
