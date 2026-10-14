const admin = require('firebase-admin');
const Tools = require('../Tools');
const XLSX = require('xlsx');

if (!admin.apps.length) {
  admin.initializeApp();
  const settings = { timestampsInSnapshots: true };
  admin.firestore().settings(settings);
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

exports.handler = async function(change, context) {
  try {
    const main_id = change.id;
    const route_file = change.get('fullPath');

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
      uids = Array.from(jsonData[name]).map(item => {
        return item.uid;
      });
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

    await originalArray[0].ref.update({ status: 'in_progress' });

    return { success: true };
  } catch (e) {
    console.log('Error capturado', e);
    return { success: false };
  }
};
