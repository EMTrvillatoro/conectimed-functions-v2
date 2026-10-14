const functions = require('firebase-functions');
const Tools = require('../Tools');
const KJUR = require('jsrsasign');

exports.getSignature = function(request, response) {
  response.header('Content-Type', 'application/json');
  response.header('Access-Control-Allow-Origin', '*');
  response.header('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return response.status(204).send('');
  }

  if (!(request && request.method === 'POST')) {
    return response.status(405).send({ code: 405, message: `${request.method} Method Not Allowed` });
  }

  if (!(request && request.body && request.body.meetingNumber && request.body.role)) {
    return response.status(401).send({ message: 'missing parameters' });
  }

  const iat = Math.round(new Date().getTime() / 1000) - 30;
  const exp = iat + 60 * 60 * 2;
  const oHeader = { alg: 'HS256', typ: 'JWT' };
  const oPayload = {
    sdkKey: functions.config().configzoom.sdk_key,
    mn: request.body.meetingNumber,
    role: Number(request.body.role),
    iat: iat,
    exp: exp,
    appKey: functions.config().configzoom.sdk_key,
    tokenExp: iat + 60 * 60 * 2
  };
  const sHeader = JSON.stringify(oHeader);
  const sPayload = JSON.stringify(oPayload);
  const signature = KJUR.jws.JWS.sign('HS256', sHeader, sPayload, functions.config().configzoom.sdk_secret);

  return response.status(200).send({ signature: signature });
};

exports.getMeetingInfo = async function(request, response) {
  response.header('Content-Type', 'application/json');
  response.header('Access-Control-Allow-Origin', '*');
  response.header('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return response.status(204).send('');
  }

  if (!(request && request.method === 'POST')) {
    return response.status(405).send({ code: 405, message: `${request.method} Method Not Allowed` });
  }

  if (!(request && request.body && request.body.meetingNumber)) {
    return response.status(401).send({ message: 'missing parameters' });
  }

  const URL = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${
    functions.config().configzoom.account_id
  }`;

  let data = {};
  const token = `${functions.config().configzoom.username}:${functions.config().configzoom.password}`;
  const encodedToken = Buffer.from(token).toString('base64');
  const auth = `Basic ${encodedToken}`;

  const headers = {
    'Content-Type': 'application/json',
    Authorization: auth
  };

  try {
    const resp = await Tools.sendRequest(URL, headers, 'POST', {});
    if (resp && resp.data && resp.data.access_token) {
      const headers2 = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resp.data.access_token}`
      };
      const URL2 = `https://api.zoom.us/v2/webinars/${request.body.meetingNumber}`;
      const resp2 = await Tools.sendRequest(URL2, headers2, 'GET');
      data = resp2.data;
    }
  } catch (error) {
    console.log(error);
  }

  return response.status(200).send(data);
};
