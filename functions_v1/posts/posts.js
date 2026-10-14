const Tools = require('../Tools');
const functions = require('firebase-functions');
const moment = require('moment');

async function updatePost(params) {
  const admin = Tools.getFBAdminInstance();
  const db = admin.firestore();
  const limit = 50;
  let resp = undefined;

  if (params && params.startAfter) {
    const doc = await db
      .collection('posts')
      .doc(params.startAfter)
      .get();
    resp = await db
      .collection('posts')
      .orderBy('date', 'asc')
      .startAfter(doc)
      .limit(limit)
      .get();
  } else {
    resp = await db
      .collection('posts')
      .orderBy('date', 'asc')
      .limit(limit)
      .get();
  }

  const docs = resp.docs;

  for (let item of docs) {
    await updatePostSearch(item.id);
  }

  if (resp.size === limit) {
    const pivot = docs[resp.size - 1];
    const doc = await db
      .collection('posts-tasks')
      .add({ pivot: pivot.id, date: moment().toDate(), status: 'complete' });

    await doc.update({ status: 'pending' });
  }

  return true;
}

async function updatePostSearch(id) {
  const admin = Tools.getFBAdminInstance();
  const db = admin.firestore();
  try {
    const postData = await db.doc(`posts/${id}`).get();
    const title = postData.get('title');
    const search = Tools.arraySearch(title) || [];
    const slug = Tools.slugify(title);
    const nameStr = Tools.stringSearch(title);
    await db.doc(`posts/${id}`).update({ search: search, slug: slug, nameStr: nameStr, searchVersion: '2.0.0' });
    return;
  } catch (error) {
    console.error(error);
    return;
  }
}

async function updateExcerpt(id) {
  const admin = Tools.getFBAdminInstance();
  const db = admin.firestore();
  try {
    const postData = await db.doc(`posts/${id}`).get();
    const content = postData.get('content');
    const excerpt = Tools.excerpt(String(content));
    await db.doc(`posts/${id}`).update({ excerpt: excerpt });
    return;
  } catch (error) {
    console.error(error);
    return;
  }
}

exports.handlerCallable = async (data, context) => {
  if (context.auth && context.auth.uid) {
    try {
      await updatePost();
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
      await updatePost({ startAfter: data.pivot });

      await db
        .collection('posts-tasks')
        .doc(setId)
        .update({ status: 'complete' });
    }
    return true;
  } catch (error) {
    console.error('### ' + context.eventType + ' ###', error);
    return error;
  }
};

exports.handlerOnWritePost = async function(change, context) {
  //return true;
  try {
    const document = change.after.exists ? change.after.data() : null;
    const oldDocument = change.before.exists ? change.before.data() : null;

    if (!oldDocument) {
      // NEW DOCUMENT
      await updatePostSearch(change.after.id);
      await updateExcerpt(change.after.id);
    } else if (oldDocument) {
      // UPDATED DOCUMENT
      if (!(oldDocument.title === document.title)) {
        await updatePostSearch(change.after.id);
      }
      if (!(oldDocument.content === document.content)) {
        await updateExcerpt(change.after.id);
      }
    }
  } catch (error) {
    console.log(error);
    return error;
  }
  return true;
};
