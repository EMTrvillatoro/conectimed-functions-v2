const Tools = require('../Tools');
const clickMeetingApi = 'https://api.clickmeeting.com/v1';

async function clickMeetingV2Handler(req, res) {
  res.set('Content-Type', 'application/json');
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method === 'POST') {
    if (req.body && req.body.route) {
      const apiKey = process.env.CLICK_MEETING_X_API_KEY || '';
      const headers = {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey
      };
      try {
        const resp = await Tools.sendRequest(`${clickMeetingApi}/${req.body.route}`, headers, 'GET', {});
        return res.status(200).json({ response: resp && resp.data ? resp.data : undefined });
      } catch (error) {
        console.error('Error in clickMeetingV2Handler:', error);
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
  clickMeetingV2Handler
};
