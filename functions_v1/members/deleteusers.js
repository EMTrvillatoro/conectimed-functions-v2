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
    // const decodedToken = await admin.auth().verifyIdToken(request.body.token);
    if (request.body.emails) {
      const emails = request.body.emails;
      var auth = [];
      for (let i = 0; i < emails.length; i++) {
        let resp;
        let deleted;
        try {
          resp = await admin.auth().getUserByEmail(emails[i]);
          deleted = await admin.auth().deleteUser(resp.uid);
        } catch (error) {
          console.error(error);
        }
        auth.push({
          email: String(emails[i]).toLocaleLowerCase(),
          uid: resp && resp.uid ? resp.uid : undefined
        });
      }
      //Eliminar usuarios en Firestore
      for (let i = 0; i < auth.length; i++) {
        try {
          if (auth[i].uid) {
            await db
              .collection('users')
              .doc(auth[i].uid)
              .delete();
          }
        } catch (error) {
          console.error(error);
        }
        try {
          if (auth[i].uid) {
            await db
              .collection('representante-meta')
              .doc(auth[i].uid)
              .delete();
          }
        } catch (error) {
          console.error(error);
        }
        try {
          if (auth[i].uid) {
            await db
              .collection('medico-meta')
              .doc(auth[i].uid)
              .delete();
          }
        } catch (error) {
          console.error(error);
        }
      }
      return response.status(200).send(auth);
    } else {
      return response.status(401).send({ message: 'Usuario no válido' });
    }
  } catch (e) {
    console.error('Error capturado', e);
    return response.status(500).send(e);
  }
};
