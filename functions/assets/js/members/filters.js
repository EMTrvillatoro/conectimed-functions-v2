const Tools = require('../Tools');

async function filtersHandler(req, res) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  const admin = Tools.getFBAdminInstance();
  const db = admin.firestore();

  try {
    const body = req.body || {};
    const { token, uid, filter } = body;

    if (!token) {
      return res.status(401).json({ message: 'Usuario no válido' });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    if (!uid || !decodedToken.uid) {
      return res.status(401).json({ message: 'Usuario no válido' });
    }

    const snap = await db
      .collection('friends')
      .doc(uid)
      .collection('friends')
      .get();

    let users = snap.docs.map(element => {
      let data = element.data();
      data.id = element.id;
      return data;
    }).filter(docData => docData.id);

    if (filter && filter !== '') {
      users = users.filter(element => {
        if (!element['filter-meta-data']) return false;
        return Array.from(element['filter-meta-data']).indexOf(filter) > -1;
      });
    }

    let allFilters = [];
    for (let i = 0; i < users.length; i++) {
      if (users[i]['filter-meta-data']) {
        const tempArray = Array.from(users[i]['filter-meta-data']).map(e => ({
          value: e,
          type: users[i]['type']
        }));
        allFilters = allFilters.concat(tempArray);
      }
    }

    const count = {};
    const finalCount = {};
    allFilters.forEach(item => {
      count[item.value] = Number((count[item.value] || 0) + 1);
      if (!finalCount[item.type]) {
        finalCount[item.type] = {};
      }
      finalCount[item.type][item.value] = count[item.value];
    });

    return res.status(200).json(finalCount);
  } catch (e) {
    console.error('Error capturado en filtersHandler:', e);
    return res.status(500).json({ message: e.message || e });
  }
}

module.exports = {
  filtersHandler
};
