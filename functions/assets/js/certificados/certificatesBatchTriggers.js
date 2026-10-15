const Tools = require('../Tools');
const XLSX = require('xlsx');
const { createCertificates } = require('./certificadosBatch');

async function onCreateCertificatesBatchHandler(event) {
  const admin = Tools.getFBAdminInstance();
  const db = admin.firestore();
  const bucket = admin.storage().bucket();

  try {
    const snapshot = event.data;
    if (!snapshot) return { success: false };

    const main_id = event.params.id || snapshot.id;
    const route_file = snapshot.get('fullPath');

    const file = await bucket.file(route_file).get();
    const download = await file[0].download();

    const workBook = XLSX.read(download[0].buffer, { type: 'buffer' });

    const jsonData = workBook.SheetNames.reduce((initial, name) => {
      const sheet = workBook.Sheets[name];
      initial[name] = XLSX.utils.sheet_to_json(sheet);
      return initial;
    }, {});

    const name = Object.keys(jsonData)[0];
    let uids = [];

    if (name) {
      uids = Array.from(jsonData[name]).map(item => item.uid);
      uids = uids.filter(Tools.unique);
    }

    const size = 100;
    const pagination = Tools.arrayPaginator(uids, 1, size);
    let originalArray = [];

    for (let i = 1; i <= pagination.total_pages; i++) {
      const page = Tools.arrayPaginator(uids, i, size);
      originalArray.push({ ref: db.doc('certificates-batch/' + main_id + '/sections/' + page.page), data: page });
    }

    let newArray = [];
    const LONG_ARRAY = 500;
    for (let i = 0; i < originalArray.length; i += LONG_ARRAY) {
      let piece = originalArray.slice(i, i + LONG_ARRAY);
      newArray.push(piece);
    }

    for (const array of newArray) {
      const batch = db.batch();
      for (const element of array) {
        let data = element.data;
        data.status = 'pending';
        batch.set(element.ref, data, { merge: true });
      }
      await batch.commit();
    }

    if (originalArray.length > 0) {
      await originalArray[0].ref.update({ status: 'in_progress' });
    }

    return { success: true };
  } catch (e) {
    console.error('Error in onCreateCertificatesBatchHandler:', e);
    return { success: false };
  }
}

async function onUpdateCertificatesBatchItemHandler(event) {
  const snapshot = event.data;
  if (!snapshot || !snapshot.after) return false;

  const after = snapshot.after;
  if (after.get('status') === 'in_progress') {
    const admin = Tools.getFBAdminInstance();
    const db = admin.firestore();

    const id_batch = event.params.id_batch;
    const _request = (await db.doc('certificates-batch/' + id_batch).get()) || {};
    const certficate = _request.data();

    const _array = Array.from(after.get('data') || []);
    const next_page = after.get('next_page') || null;

    for (let user_id of _array) {
      try {
        await createCertificates(user_id, certficate);
      } catch (error) {
        console.error('Error creating certificate:', error);
      }
    }

    try {
      await after.ref.update({ status: 'complete' });
    } catch (error) {
      console.error(error);
    }

    if (next_page) {
      try {
        await db
          .doc('certificates-batch/' + id_batch + '/sections/' + next_page)
          .update({ status: 'in_progress' });
      } catch (error) {
        console.error(error);
      }
    } else {
      try {
        await db.doc('certificates-batch/' + id_batch).update({ status: 'complete' });
      } catch (error) {
        console.error(error);
      }
    }
    console.log('====== CERTIFICATES BATCH PAGE: ' + after.id + ' ======');
    return true;
  } else {
    return false;
  }
}

module.exports = {
  onCreateCertificatesBatchHandler,
  onUpdateCertificatesBatchItemHandler
};
