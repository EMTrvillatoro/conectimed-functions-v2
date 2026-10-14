exports.handler = async function(request, response) {
  const clickMeetingApi = 'https://api.clickmeeting.com/v1/conferences/';
  response.header('Content-Type', 'application/json');
  response.header('Access-Control-Allow-Origin', '*');
  response.header('Access-Control-Allow-Headers', 'Content-Type');
  const Tools = require('../Tools');
  const functions = require('firebase-functions');

  if (request.method === 'OPTIONS') {
    return response.status(204).send('');
  }
  try {
    if (request && request.body && request.body.room && request.body.email) {
      const room = request.body.room;
      const email = request.body.email;
      const nickname = request.body && request.body.nickname ? request.body.nickname : 'Usuario de Conectimed';

      const headers = {
        'Content-Type': 'application/json',
        'X-Api-Key': functions.config().click_meeting.x_api_key
      };

      const roomInfo = await Tools.sendRequest(clickMeetingApi + room, headers, 'GET', {});

      if (roomInfo && roomInfo.data && roomInfo.data.conference && roomInfo.data.conference.name_url) {
        const name_url = roomInfo.data.conference.name_url;

        const respuesta = await Tools.sendRequest(
          clickMeetingApi + room + '/room/autologin_hash?email=' + email + '&nickname=' + nickname,
          headers,
          'POST',
          {}
        );

        if (respuesta && respuesta.data && respuesta.data.autologin_hash) {
          const autologin_hash = respuesta.data.autologin_hash;

          const url = functions.config().click_meeting.url_account + name_url + '?l=' + autologin_hash;

          return response.status(200).send({ url: url });
        } else {
          return response.status(401).send({ message: 'Usuario no válido' });
        }
      } else {
        return response.status(401).send({ message: 'Usuario no válido' });
      }
    } else {
      return response.status(401).send({ message: 'Usuario no válido' });
    }
  } catch (e) {
    console.error('Error capturado', e);
    return response.status(500).send(e);
  }
};
