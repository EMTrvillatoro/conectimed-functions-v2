const Tools = require('../Tools');

async function existInFireAuthHandler(req, res) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  const admin = Tools.getFBAdminInstance();

  try {
    const body = req.body || {};
    const { token, email } = body;

    if (!token) {
      return res.status(401).json({ message: 'Usuario no válido' });
    }

    const user = await admin.auth().verifyIdToken(token);
    if (!email || !user || !user.uid) {
      return res.status(401).json({ message: 'Usuario no válido' });
    }

    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      if (userRecord && userRecord.uid && userRecord.email) {
        return res.status(200).json({ exist: true });
      } else {
        return res.status(200).json({ exist: false });
      }
    } catch (e) {
      return res.status(200).json({ exist: false });
    }
  } catch (e) {
    console.error('Error capturado en existInFireAuthHandler:', e);
    return res.status(500).json({ message: e.message || e });
  }
}

module.exports = {
  existInFireAuthHandler
};
