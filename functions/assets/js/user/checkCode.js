const Tools = require('../Tools');

async function checkCodeHandlerRequest(req, res) {
  res.set('Content-Type', 'application/json');
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  const admin = Tools.getFBAdminInstance();
  const db = admin.firestore();

  const authHeader = req.headers['authorization'] || '';
  const idToken = String(authHeader).replace('Bearer ', '');
  let verify = {};

  try {
    verify = await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    return res.status(401).json(error);
  }

  if (verify && verify.uid) {
    if (req.method === 'POST') {
      try {
        const data = req.body || {};

        if (data && data.uid) {
          if (data.data && data.data.code) {
            const ref = db.collection('recovery-codes').doc(data.uid);
            const resp = await ref.get();
            const _code = resp.get('code');
            const _status = resp.get('status');
            if (String(_code) === String(data.data.code) && _status === 'pending') {
              return res.status(200).json(resp.data());
            } else {
              return res
                .status(400)
                .json({ code: 'invalid-argument', message: 'incorrect code please try again' });
            }
          } else {
            return res.status(400).json({
              code: 'missing-parameters',
              message: 'missing parameters (verification code)'
            });
          }
        } else {
          return res.status(400).json({ code: 'missing-user-id', message: 'missing parameters (uid)' });
        }
      } catch (e) {
        console.error('Error in checkCodeHandlerRequest:', e);
        return res.status(500).json(e);
      }
    } else {
      return res.status(405).json({ code: 405, message: `${req.method} Method Not Allowed` });
    }
  } else {
    return res.status(401).json({ message: 'unauthorized request' });
  }
}

module.exports = {
  checkCodeHandlerRequest
};
