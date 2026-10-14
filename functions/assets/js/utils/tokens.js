const { getAccessToken } = require('../Tools');

async function tokensHandler(req, res) {
  res.set('Content-Type', 'application/json');
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  try {
    const accessToken = await getAccessToken();
    console.log(accessToken.token);
    return res.status(200).json({ success: true, message: accessToken.token });
  } catch (error) {
    console.error('Error in tokensHandler:', error);
    return res.status(500).json({ success: false, message: error.message || error });
  }
}

module.exports = {
  tokensHandler
};
