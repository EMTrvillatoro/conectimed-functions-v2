const functions = require('firebase-functions');
const Openpay = require('openpay');
const Tools = require('../Tools');

exports.handler = async (data, context) => {
  const body = data;

  return new Promise((resolve, reject) => {
    if (context.auth && context.auth.uid) {
      let prodBool = functions.config().configop.production === 'true';
      let openpay = new Openpay(functions.config().configop.merchant, functions.config().configop.pk, prodBool);
      if (!body.customer_id) {
        reject(new functions.https.HttpsError('invalid-argument', 'El valor customer_id es requerido'));
      }

      openpay.customers.list(
        {
          external_id: body.customer_id
        },
        (error, customerList) => {
          if (error) {
            console.error(error);

            reject(new functions.https.HttpsError('internal', error.description));
          }

          if (customerList.length > 0) {
            openpay.customers.cards.list(customerList[0].id, null, (error, customerCards) => {
              if (error) {
                console.error(error);

                reject(new functions.https.HttpsError('internal', error.description));
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
      reject(new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated'));
    }
  });
};
