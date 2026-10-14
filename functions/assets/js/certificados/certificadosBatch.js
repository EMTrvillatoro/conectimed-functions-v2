const Tools = require('../Tools');
const moment = require('moment');

async function certificadosBatchHandler(req, res) {
  res.set('Content-Type', 'application/json');
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  try {
    const body = req.body || {};

    if (body && body.messages && body.userid && body.repid) {
      await createCertificates(body.userid, body.certficate);
      return res.status(200).json({ success: true, message: 'Chat Enviado correctamente' });
    } else {
      return res.status(500).json({ msg: 'Faltan parámetros' });
    }
  } catch (error) {
    console.error('Error in certificadosBatchHandler:', error);
    return res.status(500).json({ msg: 'error', error: error.message || error });
  }
}

async function createCertificates(userId, certficate) {
  const admin = Tools.getFBAdminInstance();
  const db = admin.firestore();

  try {
    return await db
      .collection('constancias-webinar')
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

module.exports = {
  certificadosBatchHandler,
  createCertificates
};
