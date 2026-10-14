const functions = require('firebase-functions');

exports.handler = functions.https.onRequest((request, response) => {
  response.header('Content-Type', 'application/json');
  response.header('Access-Control-Allow-Origin', '*');
  response.header('Access-Control-Allow-Headers', 'Content-Type');

  //respond to CORS preflight requests
  if (request.method === 'OPTIONS') {
    return response.status(204).send('');
  }

  const Tools = require('./Tools');
  const admin = Tools.getFBAdminInstance();
  const db = admin.firestore();

  var body = request.body;
  var idPreregistro;
  if (body.idPreregistro) {
    idPreregistro = body.idPreregistro;
  } else {
    return response.status(404).send({ msg: 'El ID del pre-registro es requerido para hacer la actualización' });
  }

  update(idPreregistro);
  async function update(idPreregistro) {
    try {
      await db
        .collection('preregistro')
        .doc(idPreregistro)
        .update({ inWP: true });
      return response.status(200).send({ msg: 'Pre-registro actualizado', id: idPreregistro });
    } catch (error) {
      console.log(error);
      return response.status(500).send({ msg: error });
    }
  }
  return true;
});
