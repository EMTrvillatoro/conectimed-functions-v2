const functions = require('firebase-functions');
const Tools = require('../Tools');

exports.handler = async (data, context) => {
  // name, text!, subject!, recipient!, bcc, cc, attach, sender

  const body = data;
  // console.log(JSON.stringify(body));
  // Authentication / user information is automatically added to the request.

  if (context.auth && context.auth.uid) {
    if (!body.recipient) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'El valor recipient es requerido para el envío de correos'
      );
    }

    await Tools.sendEmail(body);

    return {
      sucess: true,
      message: `Email successfully sent to ${body.recipient} ${body.bcc ? body.bcc : ''} ${body.cc ? body.cc : ''}`
    };
  } else {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated');
  }
};

exports.handlerNoAuth = async (data, context) => {
  const body = data;

  if (!body.recipient) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'El valor recipient es requerido para el envío de correos'
    );
  }

  await Tools.sendEmail(body);

  return {
    sucess: true,
    message: `Email successfully sent to ${body.recipient} ${body.bcc ? body.bcc : ''} ${body.cc ? body.cc : ''}`
  };
};
