const { HttpsError } = require('firebase-functions/v2/https');
const Openpay = require('openpay');

async function listCardsHandler(request) {
  const body = request.data || {};

  return new Promise((resolve, reject) => {
    if (request.auth && request.auth.uid) {
      const prodBool = (process.env.CONFIGOP_PRODUCTION === 'true');
      const merchant = process.env.CONFIGOP_MERCHANT || '';
      const pk = process.env.CONFIGOP_PK || '';

      const openpay = new Openpay(merchant, pk, prodBool);
      if (!body.customer_id) {
        return reject(new HttpsError('invalid-argument', 'El valor customer_id es requerido'));
      }

      openpay.customers.list(
        { external_id: body.customer_id },
        (error, customerList) => {
          if (error) {
            console.error('Error listing customers in Openpay:', error);
            return reject(new HttpsError('internal', error.description || 'Internal error'));
          }

          if (customerList && customerList.length > 0) {
            openpay.customers.cards.list(customerList[0].id, null, (cardErr, customerCards) => {
              if (cardErr) {
                console.error('Error listing cards in Openpay:', cardErr);
                return reject(new HttpsError('internal', cardErr.description || 'Internal error'));
              }

              resolve({
                success: true,
                response: customerCards
              });
            });
          } else {
            resolve({
              success: true,
              response: []
            });
          }
        }
      );
    } else {
      reject(new HttpsError('unauthenticated', 'The function must be called while authenticated'));
    }
  });
}

module.exports = {
  listCardsHandler
};
