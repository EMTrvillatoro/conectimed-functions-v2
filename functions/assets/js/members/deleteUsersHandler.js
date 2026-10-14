const { getFBAdminInstance } = require('../Tools');

async function deleteUsersHandler(req, res) {
  res.set('Content-Type', 'application/json');
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  const admin = getFBAdminInstance();
  const db = admin.firestore();

  try {
    const body = req.body || {};
    if (!body.emails || !Array.isArray(body.emails)) {
      return res.status(401).json({ message: 'Usuario no válido' });
    }

    const emails = body.emails;
    const auth = [];

    for (let i = 0; i < emails.length; i++) {
      let resp;
      try {
        resp = await admin.auth().getUserByEmail(emails[i]);
        if (resp && resp.uid) {
          await admin.auth().deleteUser(resp.uid);
        }
      } catch (error) {
        console.error('Error fetching/deleting auth user:', error);
      }
      auth.push({
        email: String(emails[i]).toLowerCase(),
        uid: resp && resp.uid ? resp.uid : undefined
      });
    }

    // Delete users in Firestore
    for (let i = 0; i < auth.length; i++) {
      if (auth[i].uid) {
        try {
          await db.collection('users').doc(auth[i].uid).delete();
        } catch (error) {
          console.error('Error deleting user doc:', error);
        }
        try {
          await db.collection('representante-meta').doc(auth[i].uid).delete();
        } catch (error) {
          console.error('Error deleting representante-meta doc:', error);
        }
        try {
          await db.collection('medico-meta').doc(auth[i].uid).delete();
        } catch (error) {
          console.error('Error deleting medico-meta doc:', error);
        }
      }
    }

    return res.status(200).json(auth);
  } catch (e) {
    console.error('Error capturado en deleteUsersHandler:', e);
    return res.status(500).json({ message: e.message || e });
  }
}

module.exports = {
  deleteUsersHandler
};
