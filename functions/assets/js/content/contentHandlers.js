const { HttpsError } = require('firebase-functions/v2/https');
const Tools = require('../Tools');
const moment = require('moment');

// POSTS SEARCH
async function updatePostsSearchCallable(request) {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated');
  }
  try {
    await updatePostMain();
    return { success: true };
  } catch (error) {
    console.error('Error in updatePostsSearchCallable:', error);
    throw new HttpsError('internal', error.message || 'Error updating posts search');
  }
}

async function onPostsTasksHandler(event) {
  const admin = Tools.getFBAdminInstance();
  const db = admin.firestore();

  try {
    const snapshot = event.data;
    if (!snapshot || !snapshot.after) return true;

    const data = snapshot.after.data();
    const setId = snapshot.after.id;

    if (data && data.status === 'pending') {
      await updatePostMain({ startAfter: data.pivot });
      await db.collection('posts-tasks').doc(setId).update({ status: 'complete' });
    }
    return true;
  } catch (error) {
    console.error('Error in onPostsTasksHandler:', error);
    return error;
  }
}

async function updatePostMain(params) {
  const admin = Tools.getFBAdminInstance();
  const db = admin.firestore();
  const limit = 50;

  let resp;
  if (params && params.startAfter) {
    const doc = await db.collection('posts').doc(params.startAfter).get();
    resp = await db.collection('posts').orderBy('date', 'asc').startAfter(doc).limit(limit).get();
  } else {
    resp = await db.collection('posts').orderBy('date', 'asc').limit(limit).get();
  }

  const docs = resp.docs;
  for (let item of docs) {
    await updatePostSearchDoc(db, item.id);
  }

  if (resp.size === limit) {
    const pivot = docs[resp.size - 1];
    const doc = await db.collection('posts-tasks').add({ pivot: pivot.id, date: moment().toDate(), status: 'complete' });
    await doc.update({ status: 'pending' });
  }

  return true;
}

async function updatePostSearchDoc(db, id) {
  try {
    const postData = await db.doc(`posts/${id}`).get();
    if (!postData.exists) return;
    const title = postData.get('title') || '';
    const search = Tools.arraySearch(title) || [];
    const slug = Tools.slugify(title);
    const nameStr = Tools.stringSearch(title);
    await db.doc(`posts/${id}`).update({ search: search, slug: slug, nameStr: nameStr, searchVersion: '2.0.0' });
  } catch (error) {
    console.error('Error in updatePostSearchDoc:', error);
  }
}

// PRODUCTS SEARCH
async function updateProductsSearchCallable(request) {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated');
  }
  try {
    await updateProductMain();
    return { success: true };
  } catch (error) {
    console.error('Error in updateProductsSearchCallable:', error);
    throw new HttpsError('internal', error.message || 'Error updating products search');
  }
}

async function onProductsTasksHandler(event) {
  const admin = Tools.getFBAdminInstance();
  const db = admin.firestore();

  try {
    const snapshot = event.data;
    if (!snapshot || !snapshot.after) return true;

    const data = snapshot.after.data();
    const setId = snapshot.after.id;

    if (data && data.status === 'pending') {
      await updateProductMain({ startAfter: data.pivot });
      await db.collection('products-tasks').doc(setId).update({ status: 'complete' });
    }
    return true;
  } catch (error) {
    console.error('Error in onProductsTasksHandler:', error);
    return error;
  }
}

async function updateProductMain(params) {
  const admin = Tools.getFBAdminInstance();
  const db = admin.firestore();
  const limit = 50;

  let resp;
  if (params && params.startAfter) {
    const doc = await db.collection('products').doc(params.startAfter).get();
    resp = await db.collection('products').orderBy('date', 'asc').startAfter(doc).limit(limit).get();
  } else {
    resp = await db.collection('products').orderBy('date', 'asc').limit(limit).get();
  }

  const docs = resp.docs;
  for (let item of docs) {
    await updateProductSearchDoc(db, item.id);
  }

  if (resp.size === limit) {
    const pivot = docs[resp.size - 1];
    const doc = await db.collection('products-tasks').add({ pivot: pivot.id, date: moment().toDate(), status: 'complete' });
    await doc.update({ status: 'pending' });
  }

  return true;
}

async function updateProductSearchDoc(db, id) {
  try {
    const prodData = await db.doc(`products/${id}`).get();
    if (!prodData.exists) return;
    const name = prodData.get('name') || '';
    const search = Tools.arraySearch(name) || [];
    const nameStr = Tools.stringSearch(name);
    await db.doc(`products/${id}`).update({ search: search, nameStr: nameStr });
  } catch (error) {
    console.error('Error in updateProductSearchDoc:', error);
  }
}

// GENERIC ONWRITE FOR ENTITIES
async function genericOnWriteHandler(event, fieldName) {
  const admin = Tools.getFBAdminInstance();
  const db = admin.firestore();

  try {
    const snapshot = event.data;
    if (!snapshot) return true;

    const document = snapshot.after && snapshot.after.exists ? snapshot.after.data() : null;
    const oldDocument = snapshot.before && snapshot.before.exists ? snapshot.before.data() : null;
    const docId = event.params.id || (snapshot.after ? snapshot.after.id : snapshot.before.id);
    const collectionName = event.params.id ? event.raw.document.split('/')[0] : 'items';

    if (!oldDocument && document) {
      const val = document[fieldName] || '';
      const search = Tools.arraySearch(val) || [];
      const nameStr = Tools.stringSearch(val);
      await snapshot.after.ref.update({ search: search, nameStr: nameStr });
    } else if (oldDocument && document) {
      if (oldDocument[fieldName] !== document[fieldName]) {
        const val = document[fieldName] || '';
        const search = Tools.arraySearch(val) || [];
        const nameStr = Tools.stringSearch(val);
        await snapshot.after.ref.update({ search: search, nameStr: nameStr });
      }
    }
  } catch (error) {
    console.error('Error in genericOnWriteHandler:', error);
  }
  return true;
}

async function onWriteBannersHandler(event) {
  return genericOnWriteHandler(event, 'title');
}

async function onWriteCategoriesHandler(event) {
  return genericOnWriteHandler(event, 'name');
}

async function onWriteCategoriesVideosHandler(event) {
  return genericOnWriteHandler(event, 'name');
}

async function onWriteForoHandler(event) {
  return genericOnWriteHandler(event, 'title');
}

async function onWriteProductsHandler(event) {
  return genericOnWriteHandler(event, 'name');
}

async function onWriteSpecialtiesHandler(event) {
  return genericOnWriteHandler(event, 'name');
}

async function onWriteTagsHandler(event) {
  return genericOnWriteHandler(event, 'name');
}

module.exports = {
  updatePostsSearchCallable,
  onPostsTasksHandler,
  updateProductsSearchCallable,
  onProductsTasksHandler,
  onWriteBannersHandler,
  onWriteCategoriesHandler,
  onWriteCategoriesVideosHandler,
  onWriteForoHandler,
  onWriteProductsHandler,
  onWriteSpecialtiesHandler,
  onWriteTagsHandler
};
