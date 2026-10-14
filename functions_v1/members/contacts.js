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
    const decodedToken = await admin.auth().verifyIdToken(request.body.token);
    if (request.body.uid && decodedToken.uid) {
      let users = [];
      const snap = await db
        .collection('friends')
        .doc(request.body.uid)
        .collection('friends')
        .get();
      const docs = snap.docs.map(element => {
        let data = element.data();
        data.id = element.id;
        return data;
      });
      for (let i = 0; i < docs.length; i++) {
        const docData = docs[i];
        if (docData.id) {
          users.push(docData);
        }
      }
      users = users.sort((a, b) => {
        if (a.nameStr < b.nameStr) {
          return -1;
        }
        if (b.nameStr < a.nameStr) {
          return 1;
        }
        return 0;
      });
      //Filtro por tipo de usuario
      if (request.body.type) {
        users = users.filter(element => {
          if (element.type === request.body.type) {
            return element;
          }
          return null;
        });
      }
      //Busqueda por nombre
      if (request.body.search) {
        users = users.filter(element => {
          const index = element.search.indexOf(request.body.search);
          if (index > -1) {
            return element;
          }
          return null;
        });
      }
      //Filtrar por parametros
      if (request.body.filter) {
        users = users.filter(element => {
          var index = 0;
          try {
            if (element && element['filter-meta-data']) {
              index = element['filter-meta-data'].indexOf(request.body.filter);
            }
          } catch (error) {
            error;
          }
          if (index > -1) {
            return element;
          }
          return null;
        });
      }
      return response.status(200).send(users);
    } else {
      return response.status(401).send({ message: 'Usuario no válido' });
    }
  } catch (e) {
    console.error('Error capturado', e);
    return response.status(500).send(e);
  }
};
