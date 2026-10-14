const { BigQuery } = require('@google-cloud/bigquery');
const moment = require('moment');

const datasetId = 'clickMeeting';
const bigqueryClient = new BigQuery();

async function clickMeetingBQHandler(req, res) {
  res.set('Content-Type', 'application/json');
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method === 'POST') {
    if (req.body && req.body.data) {
      const comments = req.body.data.comments ? req.body.data.comments : [];
      const attendees = req.body.data.attendees ? req.body.data.attendees : [];
      const dataset = bigqueryClient.dataset(datasetId);
      const table1 = dataset.table('comments');
      const table2 = dataset.table('attendees');

      try {
        const response1 = await table1.insert(
          Array.from(comments).map(item => {
            let data = { ...item };
            data.date = moment(data.date).format('YYYY-MM-DD HH:mm:ss');
            data.conference_end_date = moment(data.conference_end_date).format('YYYY-MM-DD HH:mm:ss');
            data.conference_start_date = moment(data.conference_start_date).format('YYYY-MM-DD HH:mm:ss');
            return data;
          })
        );

        const response2 = await table2.insert(
          Array.from(attendees).map(item => {
            let data = { ...item };
            data.start_date = moment(data.start_date).format('YYYY-MM-DD HH:mm:ss');
            data.end_date = moment(data.end_date).format('YYYY-MM-DD HH:mm:ss');
            data.conference_end_date = moment(data.conference_end_date).format('YYYY-MM-DD HH:mm:ss');
            data.conference_start_date = moment(data.conference_start_date).format('YYYY-MM-DD HH:mm:ss');
            data.date = JSON.stringify(data.date);
            data.duration_minutes = moment.duration(data.duration).asMinutes();
            data.duration_hours = moment.duration(data.duration).asHours();
            return data;
          })
        );

        return res.status(200).json({ response: { comments: response1, attendees: response2 } });
      } catch (error) {
        console.error('Error in clickMeetingBQHandler:', error);
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
  clickMeetingBQHandler
};
