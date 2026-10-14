const Tools = require('../Tools');
const functions = require('firebase-functions');
const moment = require('moment');
const path = 'products';
const field = 'marca';

async function updateProduct(params) {
  const admin = Tools.getFBAdminInstance();
  const db = admin.firestore();
  const limit = 10;
  let resp = undefined;

  if (params && params.startAfter) {
    const doc = await db
      .collection(path)
      .doc(params.startAfter)
      .get();
    resp = await db
      .collection(path)
      .orderBy('nameStr', 'asc')
      .startAfter(doc)
      .limit(limit)
      .get();
  } else {
    resp = await db
      .collection(path)
      .orderBy('nameStr', 'asc')
      .limit(limit)
      .get();
  }

  const docs = resp.docs;

  for (let item of docs) {
    await updateProductSearch(item.id);
  }

  if (resp.size === limit) {
    const pivot = docs[resp.size - 1];
    const doc = await db
      .collection(`${path}-tasks`)
      .add({ pivot: pivot.id, date: moment().toDate(), status: 'complete' });
    await doc.update({ status: 'pending' });
  }

  return true;
}

async function updateProductSearch(id) {
  const admin = Tools.getFBAdminInstance();
  const db = admin.firestore();
  try {
    const postData = await db.doc(`${path}/${id}`).get();
    const data = postData.data();
    const title = data[field];

    let search = [];
    let search1 = [];
    let search2 = [];
    let search3 = [];
    let search4 = [];
    let search5 = [];
    let search6 = [];
    let search7 = [];

    if (data.producto_sustancia_activa_1) {
      search1 = Tools.arraySearch(data.producto_sustancia_activa_1) || [];
    }
    if (data.producto_sustancia_activa_2) {
      search2 = Tools.arraySearch(data.producto_sustancia_activa_2) || [];
    }
    if (data.linea_terapeutica_1) {
      search3 = Tools.arraySearch(data.linea_terapeutica_1) || [];
    }
    if (data.linea_terapeutica_2) {
      search4 = Tools.arraySearch(data.linea_terapeutica_2) || [];
    }
    if (data.presentacion_1) {
      search5 = Tools.arraySearch(data.presentacion_1) || [];
    }
    if (data.presentacion_2) {
      search6 = Tools.arraySearch(data.presentacion_2) || [];
    }
    search7 = Tools.arraySearch(title) || [];
    search = search.concat(search1, search2, search3, search4, search5, search6, search7);
    search = search.filter(Tools.unique);

    const nameStr = Tools.stringSearch(title);
    await db
      .doc(`${path}/${id}`)
      .update({ search: search, nameStr: nameStr, title: title, 'version-search': 'v2.0.3' });
    return;
  } catch (error) {
    console.error(error);
    return;
  }
}

exports.handlerCallable = async (data, context) => {
  if (context.auth && context.auth.uid) {
    try {
      await updateProduct();
    } catch (error) {
      throw new functions.https.HttpsError(
        'unexpected error',
        'The function was called and an unexpected error occurred'
      );
    }
    return { success: true };
  } else {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated');
  }
};

exports.handlerOnUpdate = async (change, context) => {
  const admin = Tools.getFBAdminInstance();
  const db = admin.firestore();
  try {
    const data = change.after.data();
    const setId = change.after.id;

    if (data && data.status && data.status === 'pending') {
      await updateProduct({ startAfter: data.pivot });

      await db
        .collection(`${path}-tasks`)
        .doc(setId)
        .update({ status: 'complete' });
    }
    return true;
  } catch (error) {
    console.error('### ' + context.eventType + ' ###', error);
    return error;
  }
};

exports.handlerOnWrite = async function(change, context) {
  //return true;
  try {
    const document = change.after.exists ? change.after.data() : null;
    const oldDocument = change.before.exists ? change.before.data() : null;

    if (!oldDocument) {
      // NEW DOCUMENT
      await updateProductSearch(change.after.id);
    } else if (oldDocument) {
      // UPDATED DOCUMENT
      if (
        !(oldDocument[field] === document[field]) ||
        !(oldDocument['producto_sustancia_activa_1'] === document['producto_sustancia_activa_1']) ||
        !(oldDocument['producto_sustancia_activa_2'] === document['producto_sustancia_activa_2']) ||
        !(oldDocument['linea_terapeutica_1'] === document['linea_terapeutica_1']) ||
        !(oldDocument['linea_terapeutica_2'] === document['linea_terapeutica_2']) ||
        !(oldDocument['presentacion_1'] === document['presentacion_1']) ||
        !(oldDocument['presentacion_2'] === document['presentacion_2'])
      ) {
        await updateProductSearch(change.after.id);
      }
    }
  } catch (error) {
    console.log(error);
    return error;
  }
  return true;
};
