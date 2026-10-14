exports.handler = async function(request, response) {
  response.header('Content-Type', 'application/json');
  response.header('Access-Control-Allow-Origin', '*');
  response.header('Access-Control-Allow-Headers', 'Content-Type');
  const Tools = require('../Tools');
  const admin = Tools.getFBAdminInstance();
  const db = admin.firestore();
  if (request.method === 'OPTIONS') {
    return response.status(204).send('');
  }
  try {
    const user = await admin.auth().verifyIdToken(request.body.token);
    if (request && request.body && request.body.email && user && user.uid) {
      const email = request.body.email;
      var userRecord;
      try {
        userRecord = await admin.auth().getUserByEmail(email);
        if (userRecord && userRecord.uid && userRecord.email) {
          return response.status(200).send({ exist: true });
        } else {
          return response.status(200).send({ exist: false });
        }
      } catch (e) {
        return response.status(200).send({ exist: false });
      }
    } else {
      return response.status(401).send({ message: 'Usuario no válido' });
    }
  } catch (e) {
    console.error('Error capturado', e);
    return response.status(500).send(e);
  }
};
