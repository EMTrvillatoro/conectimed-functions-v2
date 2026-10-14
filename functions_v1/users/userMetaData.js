const Tools = require('../Tools');

exports.handlerSpecialties = function(request, response) {
  response.header('Content-Type', 'application/json');
  response.header('Access-Control-Allow-Origin', '*');
  response.header('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return response.status(204).send('');
  }

  if (request && request.method === 'GET') {
    try {
      const specialties = Tools.getSpecialties();
      return response.status(200).send({ specialties: specialties });
    } catch (e) {
      console.error('Error capturado', e);
      return response.status(500).send(e);
    }
  } else {
    return response.status(405).send({ code: 405, message: `${request.method} Method Not Allowed` });
  }
};

exports.handlerSpecialty = function(request, response) {
  response.header('Content-Type', 'application/json');
  response.header('Access-Control-Allow-Origin', '*');
  response.header('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return response.status(204).send('');
  }

  if (request && request.method === 'POST') {
    try {
      if (request && request.body && request.body.id) {
        const specialty = Tools.getSpecialty(request.body.id);
        return response.status(200).send(specialty);
      } else {
        return response.status(401).send({ message: 'missing parameters' });
      }
    } catch (e) {
      console.error('Error capturado', e);
      return response.status(500).send(e);
    }
  } else {
    return response.status(405).send({ code: 405, message: `${request.method} Method Not Allowed` });
  }
};
