const Tools = require('../Tools');

async function onClickBannerCreateHandler(event) {
  try {
    const admin = Tools.getFBAdminInstance();
    const db = admin.firestore();
    const INCREMENT = admin.firestore.FieldValue.increment(1);
    const { advertisingId, dateId } = event.params;

    return await db
      .doc(`advertising/${advertisingId}/clicks/${dateId}`)
      .set({ count: INCREMENT }, { merge: true });
  } catch (error) {
    console.error('Error in onClickBannerCreateHandler:', error);
    return error;
  }
}

async function onClickBannerDeleteHandler(event) {
  try {
    const admin = Tools.getFBAdminInstance();
    const db = admin.firestore();
    const DECREMENT = admin.firestore.FieldValue.increment(-1);
    const { advertisingId, dateId } = event.params;

    return await db
      .doc(`advertising/${advertisingId}/clicks/${dateId}`)
      .set({ count: DECREMENT }, { merge: true });
  } catch (error) {
    console.error('Error in onClickBannerDeleteHandler:', error);
    return error;
  }
}

module.exports = {
  onClickBannerCreateHandler,
  onClickBannerDeleteHandler
};
