const { HttpsError } = require('firebase-functions/v2/https');
const Tools = require('../Tools');

async function generateTokenWPHandler(request) {
  if (request.auth && request.auth.uid) {
    const headers = {
      'Content-Type': 'application/json'
    };
    try {
      const generateUrl = process.env.CONFIGWP_GENERATE_TOKEN_URL || '';
      const email = process.env.CONFIGWP_GENERATE_TOKEN_EMAIL || '';
      const password = process.env.CONFIGWP_GENERATE_TOKEN_P || '';

      const respuesta = await Tools.sendRequest(generateUrl, headers, 'POST', {
        username: email,
        password: password
      });

      if (respuesta.status === 200 && respuesta.data && respuesta.data.token) {
        return {
          sucess: true,
          token: respuesta.data.token
        };
      } else {
        const msg = (respuesta.data && respuesta.data.message) ? respuesta.data.message : 'Authentication failed';
        throw new HttpsError('unauthenticated', msg);
      }
    } catch (error) {
      console.error('Error in generateTokenWPHandler:', error);
      throw new HttpsError('unauthenticated', error.message || 'Error generating token WP');
    }
  } else {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated');
  }
}

module.exports = {
  generateTokenWPHandler
};
