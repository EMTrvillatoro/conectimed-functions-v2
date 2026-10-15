const { HttpsError } = require('firebase-functions/v2/https');
const Tools = require('../Tools');

async function sendNotificationHandlerRequest(req, res) {
  res.set('Content-Type', 'application/json');
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method === 'POST') {
    try {
      const URL = process.env.CLOUD_MESSAGING_URL || '';
      const accessToken = (await Tools.getAccessToken()).token;
      const body = req.body;
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      };
      if (body && body.message) {
        const resp = await Tools.sendRequest(URL, headers, 'POST', body);
        return res.status(200).json(resp.data);
      } else {
        return res.status(400).json({ message: 'Body is needed!.' });
      }
    } catch (e) {
      console.error('Error in sendNotificationHandlerRequest:', e);
      return res.status(500).json({ error: e.message || e });
    }
  } else {
    return res.status(405).json({ message: `${req.method} Method Not Allowed` });
  }
}

async function sendNotificationCallCallable(request) {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated');
  }

  try {
    const URL = process.env.CLOUD_MESSAGING_URL || '';
    const accessToken = (await Tools.getAccessToken()).token;
    const body = request.data;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    };
    if (body && body.message) {
      const resp = await Tools.sendRequest(URL, headers, 'POST', body);
      return resp.data;
    } else {
      throw new HttpsError('invalid-argument', 'The function was called but parameters are missing');
    }
  } catch (error) {
    console.error('Error in sendNotificationCallCallable:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', error.message || 'Unexpected error occurred');
  }
}

async function subscribeToTopicCallable(request) {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated');
  }

  const data = request.data || {};
  if (!data.token || !data.topic) {
    throw new HttpsError('invalid-argument', 'Missing token or topic parameter');
  }

  const admin = Tools.getFBAdminInstance();
  await admin.messaging().subscribeToTopic(data.token, data.topic);
  return 'Subscribed to ' + data.topic;
}

async function unsubscribeFromTopicCallable(request) {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated');
  }

  const data = request.data || {};
  if (!data.token || !data.topic) {
    throw new HttpsError('invalid-argument', 'Missing token or topic parameter');
  }

  const admin = Tools.getFBAdminInstance();
  await admin.messaging().unsubscribeFromTopic(data.token, data.topic);
  return 'Unsubscribed from ' + data.topic;
}

module.exports = {
  sendNotificationHandlerRequest,
  sendNotificationCallCallable,
  subscribeToTopicCallable,
  unsubscribeFromTopicCallable
};
