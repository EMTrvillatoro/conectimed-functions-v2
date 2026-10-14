const Tools = require('../Tools');

exports.handlerCreate = async function(change, context) {
  try {
    const admin = Tools.getFBAdminInstance();
    const db = admin.firestore();
    const INCREMENT = admin.firestore.FieldValue.increment(1);
    return await db
      .doc(String('advertising/' + context.params.advertisingId + '/clicks/' + context.params.dateId))
      .set({ count: INCREMENT }, { merge: true });
  } catch (error) {
    console.error('### ' + context.eventType + ' ###', error);
    return error;
  }
};

exports.handlerDelete = async function(change, context) {
  try {
    const admin = Tools.getFBAdminInstance();
    const db = admin.firestore();
    const INCREMENT = admin.firestore.FieldValue.increment(-1);
    return await db
      .doc(String('advertising/' + context.params.advertisingId + '/clicks/' + context.params.dateId))
      .set({ count: INCREMENT }, { merge: true });
  } catch (error) {
    console.error('### ' + context.eventType + ' ###', error);
    return error;
  }
};
