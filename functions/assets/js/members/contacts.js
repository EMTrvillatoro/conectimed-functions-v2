const Tools = require('../Tools');

async function contactsHandler(req, res) {
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
    const { token, uid, type, search, filter } = body;

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

    users.sort((a, b) => {
      if (a.nameStr < b.nameStr) return -1;
      if (b.nameStr < a.nameStr) return 1;
      return 0;
    });

    // Filter by user type
    if (type) {
      users = users.filter(element => element.type === type);
    }

    // Search by name
    if (search) {
      users = users.filter(element => {
        if (!element.search) return false;
        return element.search.indexOf(search) > -1;
      });
    }

    // Filter by metadata parameters
    if (filter) {
      users = users.filter(element => {
        try {
          if (element && element['filter-meta-data']) {
            return element['filter-meta-data'].indexOf(filter) > -1;
          }
        } catch (error) {
          console.error('Error filtering metadata in contactsHandler:', error);
        }
        return false;
      });
    }

    return res.status(200).json(users);
  } catch (e) {
    console.error('Error capturado en contactsHandler:', e);
    return res.status(500).json({ message: e.message || e });
  }
}

module.exports = {
  contactsHandler
};
