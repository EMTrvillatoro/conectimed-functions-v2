const Tools = require('../Tools');
const KJUR = require('jsrsasign');

async function zoomSignatureHandler(req, res) {
  res.set('Content-Type', 'application/json');
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ code: 405, message: `${req.method} Method Not Allowed` });
  }

  if (!req.body || !req.body.meetingNumber || !req.body.role) {
    return res.status(401).json({ message: 'missing parameters' });
  }

  try {
    const sdkKey = process.env.CONFIGZOOM_SDK_KEY || '';
    const sdkSecret = process.env.CONFIGZOOM_SDK_SECRET || '';

    const iat = Math.round(new Date().getTime() / 1000) - 30;
    const exp = iat + 60 * 60 * 2;
    const oHeader = { alg: 'HS256', typ: 'JWT' };
    const oPayload = {
      sdkKey: sdkKey,
      mn: req.body.meetingNumber,
      role: Number(req.body.role),
      iat: iat,
      exp: exp,
      appKey: sdkKey,
      tokenExp: iat + 60 * 60 * 2
    };
    const sHeader = JSON.stringify(oHeader);
    const sPayload = JSON.stringify(oPayload);
    const signature = KJUR.jws.JWS.sign('HS256', sHeader, sPayload, sdkSecret);

    return res.status(200).json({ signature: signature });
  } catch (error) {
    console.error('Error in zoomSignatureHandler:', error);
    return res.status(500).json({ error: error.message || error });
  }
}

async function zoomGetMeetingInfoHandler(req, res) {
  res.set('Content-Type', 'application/json');
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ code: 405, message: `${req.method} Method Not Allowed` });
  }

  if (!req.body || !req.body.meetingNumber) {
    return res.status(401).json({ message: 'missing parameters' });
  }

  try {
    const accountId = process.env.CONFIGZOOM_ACCOUNT_ID || '';
    const username = process.env.CONFIGZOOM_USERNAME || '';
    const password = process.env.CONFIGZOOM_PASSWORD || '';

    const URL = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`;
    let data = {};
    const token = `${username}:${password}`;
    const encodedToken = Buffer.from(token).toString('base64');
    const auth = `Basic ${encodedToken}`;

    const headers = {
      'Content-Type': 'application/json',
      Authorization: auth
    };

    const resp = await Tools.sendRequest(URL, headers, 'POST', {});
    if (resp && resp.data && resp.data.access_token) {
      const headers2 = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resp.data.access_token}`
      };
      const URL2 = `https://api.zoom.us/v2/webinars/${req.body.meetingNumber}`;
      const resp2 = await Tools.sendRequest(URL2, headers2, 'GET');
      data = resp2.data;
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Error in zoomGetMeetingInfoHandler:', error);
    return res.status(500).json({ error: error.message || error });
  }
}

module.exports = {
  zoomSignatureHandler,
  zoomGetMeetingInfoHandler
};
