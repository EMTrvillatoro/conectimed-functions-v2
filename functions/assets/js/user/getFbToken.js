const { getFBAdminInstance } = require('../Tools');

async function getFbTokenHandlerRequest(req, res) {
  res.set('Content-Type', 'application/json');
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  const admin = getFBAdminInstance();

  try {
    const body = req.body || {};
    if (!body.uid) {
      return res.status(400).json({ message: 'Missing parameter: uid' });
    }

    const customToken = await admin.auth().createCustomToken(body.uid);
    return res.status(200).json({ success: true, token: customToken });
  } catch (error) {
    console.error('Error in getFbTokenHandlerRequest:', error);
    return res.status(500).json({ message: error.message || error });
  }
}

module.exports = {
  getFbTokenHandlerRequest
};
