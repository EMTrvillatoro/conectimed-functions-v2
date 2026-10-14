const admin = require('firebase-admin');
const tools = require('../Tools');
const moment = require('moment');

if (!admin.apps.length) {
  admin.initializeApp();
  const settings = { timestampsInSnapshots: true, ignoreUndefinedProperties: true };
  admin.firestore().settings(settings);
}

const db = admin.firestore();

exports.handler = async function (request, response) {
  try {
    let body = request.body;

    if (body && body.messages && body.userid && body.repid) {
      await createCertificates(body.userid, body.certficate);
      return response.status(200).send({ success: true, message: 'Chat Enviado correctamente' });
    } else {
      return response.status(500).send({ msg: 'Faltan parámetros' });
    }
  } catch (error) {
    return response.status(500).send({ msg: 'error', error: error });
  }
};

exports.createCertificatesHandler = async (userId, certficate) => {
  return await createCertificates(userId, certficate);
};

async function createCertificates(userId, certficate) {
  try {
    return await db
      .collection('constancias-webinar/')
      .doc(`${userId}-${certficate.wuid}-${certficate.suid}`)
      .set({
        date: moment().toDate(),
        uuid: userId,
        wuid: certficate.wuid,
        suid: certficate.suid,
        dateOfSendingCertificates: certficate.dateOfSendingCertificates,
        eventCity: certficate.eventCity,
        eventDate: certficate.eventDate,
        eventDuration: certficate.eventDuration,
        eventName: certficate.eventName,
        eventNameContinuation: certficate.eventNameContinuation,
        eventPlatform: certficate.eventPlatform,
        viewed: false,
        status: 'active'
      });
  } catch (error) {
    console.error('==================> Constancias <==================', error);
    return error;
  }
}
