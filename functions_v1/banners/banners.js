const Tools = require('../Tools');

const path = 'banners';
const field = 'title';

async function updateDocumentSearch(id) {
  const admin = Tools.getFBAdminInstance();
  const db = admin.firestore();
  try {
    const postData = await db.doc(`${path}/${id}`).get();
    const title = postData.get(field);
    const nameStr = Tools.stringSearch(title);
    await db.doc(`${path}/${id}`).update({ nameStr: nameStr });
    return;
  } catch (error) {
    console.error(error);
    return;
  }
}

exports.handlerOnWrite = async function(change, context) {
  //return true;
  try {
    const document = change.after.exists ? change.after.data() : null;
    const oldDocument = change.before.exists ? change.before.data() : null;

    if (!oldDocument) {
      // NEW DOCUMENT
      await updateDocumentSearch(change.after.id);
    } else if (oldDocument) {
      // UPDATED DOCUMENT
      if (!(oldDocument[field] === document[field])) {
        await updateDocumentSearch(change.after.id);
      }
    }
  } catch (error) {
    console.log(error);
    return error;
  }
  return true;
};
