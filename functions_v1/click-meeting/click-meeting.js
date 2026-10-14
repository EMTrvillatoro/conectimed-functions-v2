const functions = require('firebase-functions');
const Tools = require('../Tools');
const clickMeetingApi = 'https://api.clickmeeting.com/v1';
const { BigQuery } = require('@google-cloud/bigquery');
const jszip = require('jszip');
const https = require('https');
const bigqueryClient = new BigQuery();
const datasetId = 'clickMeeting';
const moment = require('moment');

/**
 * Request Contacts
 * @param {functions.https.Request} request - Https Request.
 * @param {functions.Response<any>} response - Response Any.
 * @returns {Promise<functions.Response<any>>}  Any
 */

exports.handlerApi = async function (request, response) {
  response.header('Content-Type', 'application/json');
  response.header('Access-Control-Allow-Origin', '*');
  response.header('Access-Control-Allow-Headers', 'Content-Type');
  if (request.method === 'OPTIONS') {
    return response.status(204).send('');
  }

  if (request && request.method === 'POST') {
    if (request && request.body && request.body.route) {
      const headers = {
        'Content-Type': 'application/json',
        'X-Api-Key': functions.config().click_meeting.x_api_key
      };
      const resp = await Tools.sendRequest(`${clickMeetingApi}/${request.body.route}`, headers, 'GET', {});
      console.log(resp.data);
      return response.status(200).send({ response: resp && resp.data ? resp.data : undefined });
    } else {
      return response.status(401).send({ message: 'missing parameters' });
    }
  } else {
    return response.status(405).send({ code: 405, message: `${request.method} Method Not Allowed` });
  }
};

/**
 * Request Contacts
 * @param {functions.https.Request} request - Https Request.
 * @param {functions.Response<any>} response - Response Any.
 * @returns {Promise<functions.Response<any>>}  Any
 */

exports.handlerBQ = async function (request, response) {
  response.header('Content-Type', 'application/json');
  response.header('Access-Control-Allow-Origin', '*');
  response.header('Access-Control-Allow-Headers', 'Content-Type');
  if (request.method === 'OPTIONS') {
    return response.status(204).send('');
  }

  if (request && request.method === 'POST') {
    if (request && request.body && request.body.data) {
      const comments = request.body.data.comments ? request.body.data.comments : undefined;
      const attendees = request.body.data.attendees ? request.body.data.attendees : undefined;
      const dataset = bigqueryClient.dataset(datasetId);
      const table1 = dataset.table('comments');
      const table2 = dataset.table('attendees');

      try {
        const response1 = await table1.insert(
          Array.from(comments).map(item => {
            let data = item;
            data.date = moment(data.date).format('YYYY-MM-DD HH:mm:ss');
            data.conference_end_date = moment(data.conference_end_date).format('YYYY-MM-DD HH:mm:ss');
            data.conference_start_date = moment(data.conference_start_date).format('YYYY-MM-DD HH:mm:ss');
            return data;
          })
        );

        const response2 = await table2.insert(
          Array.from(attendees).map(item => {
            let data = item;
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

        console.log(response1);
        console.log(response2);

        return response.status(200).send({ response: { comments: response1, attendees: response2 } });
      } catch (error) {
        console.log(error);
        return response.status(500).send({ error: error });
      }
    } else {
      return response.status(401).send({ message: 'missing parameters' });
    }
  } else {
    return response.status(405).send({ code: 405, message: `${request.method} Method Not Allowed` });
  }
};

/**
 * Request Contacts
 * @param {functions.https.Request} request - Https Request.
 * @param {functions.Response<any>} response - Response Any.
 * @returns {Promise<functions.Response<any>>}  Any
 */

exports.requestFile = async function (request, response) {
  response.header('Content-Type', 'application/octet-stream');
  response.header('Access-Control-Allow-Origin', '*');
  response.header('Access-Control-Allow-Headers', 'Content-Type');
  if (request.method === 'OPTIONS') {
    return response.status(204).send('');
  }
  if (request && request.method === 'POST') {
    if (request && request.body && request.body.url) {
      try {
        const url = request.body.url;
        https.get(url, resp => {
          resp.on('data', async blob => {
            const zip = await jszip.loadAsync(blob);
            const _blob = await zip.files['public.csv'].async('text');
            return response.status(200).send({ response: _blob });
          });
        });
      } catch (error) {
        console.log(error);
        return response.status(500).send({ error: error });
      }
    } else {
      return response.status(401).send({ message: 'missing parameters' });
    }
  } else {
    return response.status(405).send({ code: 405, message: `${request.method} Method Not Allowed` });
  }
};
