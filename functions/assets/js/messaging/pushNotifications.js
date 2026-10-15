const Tools = require('../Tools');

async function admin_messaging_onRequest(req, res) {
  res.set('Content-Type', 'application/json');
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method === 'GET') {
    const page = req.query && req.query.page ? Number(req.query.page) : 1;
    const id = req.query && req.query.id ? req.query.id : undefined;
    try {
      if (page && id) {
        const messages = await sendMessages(id, page);
        return res.status(200).json({ response: messages });
      } else {
        return res.status(500).json({ msg: 'Faltan parámetros' });
      }
    } catch (error) {
      return res.status(500).json({ error: error.message || error });
    }
  } else {
    return res.status(405).json({ code: 405, message: `${req.method} Method Not Allowed` });
  }
}

async function admin_messaging_movil_onRequest(req, res) {
  res.set('Content-Type', 'application/json');
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method === 'POST') {
    if (req.body && req.body.settings) {
      const resp = await createPagintationForMovil(req.body.settings);
      return res.status(200).json({ response: resp });
    } else {
      return res.status(401).json({ message: 'missing parameters' });
    }
  } else {
    return res.status(405).json({ code: 405, message: `${req.method} Method Not Allowed` });
  }
}

async function admin_messaging_onUpdate(event) {
  const change = event.data;
  if (change && change.after && change.after.get('status') === 'in_progress') {
    const id_batch = event.params.id_batch;
    const page = event.params.page;
    await sendMessages(id_batch, page);
    return true;
  } else {
    return false;
  }
}

async function sendMessages(id_batch, _page) {
  const admin = Tools.getFBAdminInstance();
  const db = admin.firestore();
  const messaging = admin.messaging();

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

async function createPagintationForMovil(settings) {
  const admin = Tools.getFBAdminInstance();
  const db = admin.firestore();

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

module.exports = {
  admin_messaging_onRequest,
  admin_messaging_movil_onRequest,
  admin_messaging_onUpdate
};
