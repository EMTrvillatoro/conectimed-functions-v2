const Tools = require('../Tools');

async function changePasswordHandlerRequest(req, res) {
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
          if (data.data && data.data.password && data.data.repeatPassword && data.data.code) {
            const ref = db.collection('recovery-codes').doc(data.uid);
            const resp = await ref.get();
            const _code = resp.get('code');
            const _status = resp.get('status');
            if (String(_code) === String(data.data.code) && _status === 'pending') {
              if (String(data.data.password).length >= 6) {
                if (String(data.data.password) === String(data.data.repeatPassword)) {
                  await ref.update({ status: 'active' });
                  await admin.auth().updateUser(data.uid, { password: data.data.password });
                  return res.status(200).json({ success: true, message: 'Password updated successfully' });
                } else {
                  return res.status(400).json({
                    code: 'must-match-password',
                    message: 'the password must be the same as when repeating the password'
                  });
                }
              } else {
                return res
                  .status(400)
                  .json({ code: 'password-length', message: 'the password must have at least 6 characters' });
              }
            } else {
              return res
                .status(400)
                .json({ code: 'invalid-argument', message: 'incorrect code please try again' });
            }
          } else {
            return res.status(400).json({
              code: 'missing-parameters',
              message: 'missing parameters (password, repeatPassword or verification code)'
            });
          }
        } else {
          return res.status(400).json({ code: 'missing-user-id', message: 'missing parameters (uid)' });
        }
      } catch (e) {
        console.error('Error in changePasswordHandlerRequest:', e);
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
  changePasswordHandlerRequest
};
