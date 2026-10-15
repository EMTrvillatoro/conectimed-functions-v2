const { HttpsError } = require('firebase-functions/v2/https');
const Openpay = require('openpay');

async function paymentsCallable(request) {
  const body = request.data || {};

  return new Promise((resolve, reject) => {
    if (request.auth && request.auth.uid) {
      const prodBool = process.env.CONFIGOP_PRODUCTION === 'true';
      const merchant = process.env.CONFIGOP_MERCHANT || '';
      const pk = process.env.CONFIGOP_PK || '';

      const openpay = new Openpay(merchant, pk, prodBool);

      if (!body.customer_id) {
        return reject(new HttpsError('invalid-argument', 'El valor customer_id es requerido'));
      }
      if (!body.customer) {
        return reject(new HttpsError('invalid-argument', 'El objeto customer es requerido'));
      }
      if (!body.customer.name) {
        return reject(new HttpsError('invalid-argument', 'El valor name es requerido'));
      }
      if (!body.customer.last_name) {
        return reject(new HttpsError('invalid-argument', 'El valor last_name es requerido'));
      }
      if (!body.customer.email) {
        return reject(new HttpsError('invalid-argument', 'El valor email es requerido'));
      }

      if (!body.card) {
        return reject(new HttpsError('invalid-argument', 'El objeto card es requerido'));
      } else {
        if (!body.card.id && !body.card_id) {
          return reject(new HttpsError('invalid-argument', 'El valor card_id es requerido'));
        }
      }

      openpay.customers.list(
        { external_id: body.customer_id },
        (error, customerList) => {
          if (error) {
            console.error('Error listing openpay customers:', error);
            return reject(new HttpsError('internal', error.description || 'Error in openpay'));
          }

          if (customerList.length === 0) {
            openpay.customers.create(
              {
                external_id: body.customer_id,
                name: body.customer.name,
                last_name: body.customer.last_name,
                email: body.customer.email
              },
              (error, customer) => {
                if (error) {
                  console.error('Error creating openpay customer:', error);
                  return resolve({ status: 'error', error });
                }

                if (customer) {
                  let cardRequest = {};
                  if (body.card_id) {
                    cardRequest = {
                      token_id: body.card_id,
                      device_session_id: body.card.device_session_id
                    };
                  } else {
                    cardRequest = {
                      card_number: body.card.card_number,
                      holder_name: body.card.holder_name,
                      expiration_year: body.card.expiration_year,
                      expiration_month: body.card.expiration_month,
                      cvv2: body.card.cvv2,
                      device_session_id: body.card.device_session_id
                    };
                  }
                  openpay.customers.cards.create(customer.id, cardRequest, (error, card) => {
                    if (error) {
                      console.error('Error creating openpay card:', error);
                      return resolve({ status: 'error', error });
                    }
                    openpay.customers.charges.create(
                      customer.id,
                      {
                        source_id: card.id,
                        method: 'card',
                        amount: body.amount,
                        description: 'Abono de Saldo Conectimed',
                        device_session_id: body.card.device_session_id,
                        order_id: `ORDEN-CONECTIMED-${new Date().getTime()}`,
                        currency: 'MXN'
                      },
                      (error, payment) => {
                        if (error) {
                          console.error('Error creating openpay charge:', error);
                          return resolve({ status: 'error', error });
                        }
                        resolve(payment);
                      }
                    );
                  });
                }
              }
            );
          } else {
            const customer = customerList[0];
            let device_session_id = body.device_session_id || (body.card && body.card.device_session_id);

            let chargReq = {
              method: 'card',
              amount: body.amount,
              description: 'Abono de Saldo Conectimed',
              device_session_id,
              order_id: `ORDEN-CONECTIMED-${new Date().getTime()}`,
              currency: 'MXN'
            };

            if (body.card_id) {
              openpay.customers.cards.create(
                customer.id,
                {
                  token_id: body.card_id,
                  device_session_id
                },
                (error, card) => {
                  if (error) {
                    console.error('Error creating openpay card:', error);
                    return resolve({ status: 'error', error });
                  }
                  chargReq.source_id = card.id;
                  openpay.customers.charges.create(customer.id, chargReq, (error, payment) => {
                    if (error) {
                      console.error('Error creating openpay charge:', error);
                      return resolve({ status: 'error', error });
                    }
                    resolve(payment);
                  });
                }
              );
            } else if (body.card.id) {
              chargReq.source_id = body.card.id;
              openpay.customers.charges.create(customer.id, chargReq, (error, payment) => {
                if (error) {
                  console.error('Error creating openpay charge:', error);
                  return resolve({ status: 'error', error });
                }
                resolve(payment);
              });
            } else {
              openpay.customers.cards.create(
                customer.id,
                {
                  card_number: body.card.card_number,
                  holder_name: body.card.holder_name,
                  expiration_year: body.card.expiration_year,
                  expiration_month: body.card.expiration_month,
                  cvv2: body.card.cvv2,
                  device_session_id
                },
                (error, card) => {
                  if (error) {
                    console.error('Error creating openpay card:', error);
                    return resolve({ status: 'error', error });
                  }
                  chargReq.source_id = card.id;
                  openpay.customers.charges.create(customer.id, chargReq, (error, payment) => {
                    if (error) {
                      console.error('Error creating openpay charge:', error);
                      return resolve({ status: 'error', error });
                    }
                    resolve(payment);
                  });
                }
              );
            }
          }
        }
      );
    } else {
      reject(new HttpsError('unauthenticated', 'The function must be called while authenticated'));
    }
  });
}

module.exports = {
  paymentsCallable
};
