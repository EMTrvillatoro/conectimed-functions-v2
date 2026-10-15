const Tools = require('../Tools');
const moment = require('moment');

async function fire_onRun_scheduled_posts() {
  try {
    const admin = Tools.getFBAdminInstance();
    const db = admin.firestore();
    const resp = await db
      .collection('posts')
      .where('status', '==', 'pending')
      .where('publication_date', '<=', moment().toDate())
      .limit(50)
      .get();

    for (let doc of resp.docs) {
      await doc.ref.update({ status: 'active' });
    }
    return true;
  } catch (e) {
    console.error('Error in fire_onRun_scheduled_posts:', e);
    return e;
  }
}

async function fire_onRun_delete_curses_and_congresses() {
  try {
    const admin = Tools.getFBAdminInstance();
    const db = admin.firestore();
    let today = moment().toDate();

    const resp = await db
      .collection('posts')
      .where('status', '==', 'active')
      .where('type', '==', 'curso_o_congreso')
      .where('fecha_fin', '<=', today)
      .get();

    for (let doc of resp.docs) {
      try {
        await doc.ref.update({ status: 'inactive' });
      } catch (e) {
        console.error(e);
      }
    }
    return true;
  } catch (e) {
    console.error('Error in fire_onRun_delete_curses_and_congresses:', e);
    return e;
  }
}

async function fire_onRequest_scheduled_posts(req, res) {
  res.set('Content-Type', 'application/json');
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method === 'POST') {
    const resp = await fire_onRun_scheduled_posts();
    return res.status(200).json({ response: resp });
  } else {
    return res.status(405).json({ code: 405, message: `${req.method} Method Not Allowed` });
  }
}

module.exports = {
  fire_onRun_scheduled_posts,
  fire_onRun_delete_curses_and_congresses,
  fire_onRequest_scheduled_posts
};
