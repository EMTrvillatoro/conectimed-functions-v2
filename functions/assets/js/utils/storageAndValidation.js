const { HttpsError } = require('firebase-functions/v2/https');
const Tools = require('../Tools');
const moment = require('moment');

async function getTokenCallable(request) {
  try {
    return await Tools.getAccessToken();
  } catch (error) {
    console.error('Error in getTokenCallable:', error);
    throw new HttpsError('internal', error.message || 'Error getting access token');
  }
}

async function fire_onRun_usersInValidation() {
  const admin = Tools.getFBAdminInstance();
  const db = admin.firestore();

  try {
    const now = moment().subtract(10, 'minutes').toDate();
    console.log('=== NOW (usersInValidation) ===', now);
    const resp = await db
      .collection('users-in-validation')
      .where('date', '<=', now)
      .orderBy('date', 'desc')
      .get();

    for (let user of resp.docs) {
      await user.ref.delete();
    }
    return true;
  } catch (e) {
    console.error('Error in fire_onRun_usersInValidation:', e);
    return e;
  }
}

async function uploadFilesToFstorageHandler(req, res) {
  res.set('Content-Type', 'application/json');
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ code: 405, message: `${req.method} Method Not Allowed` });
  }

  const admin = Tools.getFBAdminInstance();
  const db = admin.firestore();
  const fStorage = admin.storage();
  const bucket = fStorage.bucket();
  const limit = 100;

  try {
    let dBresp;
    if (req.query && req.query.startAfter) {
      const doc = await db.collection('posts').doc(req.query.startAfter).get();
      dBresp = await db.collection('posts').orderBy('date', 'asc').startAfter(doc).limit(limit).get();
    } else {
      dBresp = await db.collection('posts').orderBy('date', 'asc').limit(limit).get();
    }

    let respArray = [];
    let count = 1;
    for (const doc of dBresp.docs) {
      const img_url = doc.get('image');
      if (img_url && img_url !== '' && img_url !== null && img_url !== undefined) {
        if (String(img_url).includes('https://panel.conectimed.com') || String(img_url).includes('https://panel.conectimed.site')) {
          const ref = doc.ref;
          let image_path = String(img_url).replace('https://panel.conectimed.com/', '');
          image_path = String(image_path).replace('https://panel.conectimed.site/', '');
          try {
            const clean = String(image_path).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const resp = await bucket.upload(`./${clean}`, { destination: `images/${image_path}`, resumable: true });
            await resp[0].makePublic();
            const publicUrl = resp[0].publicUrl();
            await ref.update({ image: publicUrl });
            respArray.push({ action: 'update', success: true, url: publicUrl, postId: doc.id, count: count });
          } catch (error) {
            respArray.push({ action: 'update', success: false, path: image_path, postId: doc.id, count: count });
          }
        } else {
          respArray.push({ action: 'no-action', success: true, url: img_url, postId: doc.id, count: count });
        }
      } else {
        respArray.push({ action: 'no-action', success: true, url: '', postId: doc.id, count: count });
      }
      count++;
    }

    let ret = {};
    if (!dBresp.empty) {
      const pivot = dBresp.docs[dBresp.size - 1].id;
      ret = { startAfter: pivot, next: `http://localhost:5000/conectimed-production/us-central1/test?startAfter=${pivot}`, response: respArray };
      await db.collection('posts-img-update').doc('status').set({ ...ret, index: admin.firestore.FieldValue.increment(1) }, { merge: true });
    } else {
      ret = { message: 'finished tasks' };
    }

    return res.status(200).json(ret);
  } catch (error) {
    console.error('Error in uploadFilesToFstorageHandler:', error);
    return res.status(500).json({ error: error.message || error });
  }
}

module.exports = {
  getTokenCallable,
  fire_onRun_usersInValidation,
  uploadFilesToFstorageHandler
};
