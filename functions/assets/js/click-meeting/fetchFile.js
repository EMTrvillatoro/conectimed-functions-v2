const https = require('https');
const jszip = require('jszip');

async function fetchFileHandler(req, res) {
  res.set('Content-Type', 'application/octet-stream');
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method === 'POST') {
    if (req.body && req.body.url) {
      try {
        const url = req.body.url;
        https.get(url, resp => {
          resp.on('data', async blob => {
            try {
              const zip = await jszip.loadAsync(blob);
              const _blob = await zip.files['public.csv'].async('text');
              return res.status(200).json({ response: _blob });
            } catch (err) {
              console.error('Error unzipping in fetchFileHandler:', err);
              return res.status(500).json({ error: err.message || err });
            }
          });
        });
      } catch (error) {
        console.error('Error in fetchFileHandler:', error);
        return res.status(500).json({ error: error.message || error });
      }
    } else {
      return res.status(401).json({ message: 'missing parameters' });
    }
  } else {
    return res.status(405).json({ code: 405, message: `${req.method} Method Not Allowed` });
  }
}

module.exports = {
  fetchFileHandler
};
