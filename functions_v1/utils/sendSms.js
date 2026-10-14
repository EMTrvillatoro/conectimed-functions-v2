const functions = require('firebase-functions');
const { isNumber } = require('lodash');
const Tools = require('../Tools');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
  const settings = { timestampsInSnapshots: true };
  admin.firestore().settings(settings);
}

const db = admin.firestore();

exports.handler = async (data, context) => {
  // sender, recipient, content, tag, webUrl
  /*'Pam',
  recipient: '525522706978',
  content: 'Hola',
  tag: 'welcome',
  webUrl: 'https://app.conectimed.site/'*/
  const body = data;
  // console.log(JSON.stringify(body));
  // Authentication / user information is automatically added to the request.

  if (context.auth && context.auth.uid) {
    if (!body.content) {
      throw new functions.https.HttpsError('invalid-argument', 'El valor content es requerido para el envío de SMS');
    }
    if (!body.recipient) {
      throw new functions.https.HttpsError('invalid-argument', 'El valor recipient es requerido para el envío de SMS');
    }
    if (body.recipient.length !== 12 || isNumber(body.recipient)) {
      throw new functions.https.HttpsError('invalid-argument', 'Recipient is not valid');
    }

    // is SMS function enable?
    let smsEnable = false;
    let constanstData = await db
      .collection('constants')
      .doc('constants')
      .get();

    if (constanstData.exists && constanstData.data().smsEnable) {
      smsEnable = constanstData.data().smsEnable;
    }
    // if enable
    if (smsEnable) {
      await Tools.sendSMS(body);
      return {
        sucess: true,
        message: `SMS successfully sent to ${body.recipient}`
      };
    } else {
      return {
        sucess: true,
        message: `SMS sending function disabled`
      };
    }
  } else {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated');
  }
};
