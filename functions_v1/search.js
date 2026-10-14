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
  var email, tel;
  if (body.email) {
    email = body.email;
  } else {
    return response.status(404).send({ msg: 'El parámetro email es requerido para la búsqueda' });
  }
  if (body.telefono) {
    tel = body.telefono;
  } else {
    return response.status(404).send({ msg: 'El parámetro teléfono es requerido para la búsqueda' });
  }

  search(email, tel, response);
  async function search(email, tel, response) {
    try {
      let bdresult = await db
        .collection('preregistro')
        .where('email', '==', email)
        .where('telmovil', '==', tel)
        .get();
      if (bdresult.size === 0) {
        return response.status(404).send({ msg: 'No se encontraron resultados' });
      } else {
        var idPreregistro;
        bdresult.forEach(doc => {
          idPreregistro = doc.data();
          idPreregistro.id = doc.id;
        });

        return response.status(200).send({ msg: 'Pre-registro econtrado', data: idPreregistro });
      }
    } catch (error) {
      console.log(error);
      return response.status(500).send({ msg: error });
    }
  }
  return true;
});
