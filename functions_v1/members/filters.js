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
    if (request && request.body && request.body.uid && decodedToken && decodedToken.uid) {
      let users = [];
      let allFilters = [];
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
        const data = docData;
        const id = docData.id;
        if (data && id) {
          const returnedTarget = Object.assign(data, { id: id });
          users.push(returnedTarget);
        }
      }
      if (request.body.filter && request.body.filter !== '') {
        users = users.filter(element => {
          const index = Array.from(element['filter-meta-data']).indexOf(request.body.filter);
          if (index > -1) {
            return element;
          }
          return null;
        });
      }
      for (let i = 0; i < users.length; i++) {
        let tempArray = [];
        tempArray = tempArray.concat(users[i]['filter-meta-data']);
        tempArray = tempArray.map(e => {
          return { value: e, type: users[i]['type'] };
        });
        allFilters = allFilters.concat(tempArray);
      }
      var count = {};
      var finalCount = {};
      allFilters.forEach(item => {
        count[item.value] = Number((count[item.value] || 0) + 1);
        if (!finalCount[item.type]) {
          finalCount[item.type] = {};
        }
        finalCount[item.type][item.value] = count[item.value];
      });
      return response.status(200).send(finalCount);
    } else {
      return response.status(401).send({ message: 'Usuario no válido' });
    }
  } catch (e) {
    console.error('Error capturado', e);
    return response.status(500).send(e);
  }
};
