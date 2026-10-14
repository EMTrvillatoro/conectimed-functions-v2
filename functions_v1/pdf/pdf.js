const functions = require('firebase-functions');
const html_to_pdf = require('html-pdf-node');
const Tools = require('../Tools');
const admin = Tools.getFBAdminInstance();
const db = admin.firestore();

/**
 * Request Contacts
 * @param {functions.https.Request} request - Https Request.
 * @param {functions.Response<any>} response - Response Any.
 * @returns {Promise<functions.Response<any>>}  Any
 */

exports.handler = async function(request, response) {
  response.header('Content-Type', 'application/pdf');

  response.header('Access-Control-Allow-Origin', '*');
  response.header('Access-Control-Allow-Headers', 'Content-Type');
  if (request.method === 'OPTIONS') {
    return response.status(204).send('');
  }
  if (request && request.method === 'GET') {
    if (request && request.query && request.query.cuid) {
      const name =
        request && request.query && request.query.name ? Tools.slugify(decodeURI(request.query.name)) : 'certificado';
      let options = { format: 'A4' };
      let file = [{ url: `${functions.config().configfb.api_url}generateHtmlCertificate?cuid=${request.query.cuid}` }];
      response.header('Content-Disposition', `attachment; filename=${name}.pdf`);
      const output = await html_to_pdf.generatePdfs(file, options);
      return response.status(200).send(output[0].buffer);
    } else {
      return response.status(401).send({ message: 'missing parameters' });
    }
  } else {
    return response.status(405).send({ code: 405, message: `${request.method} Method Not Allowed` });
  }
};
