const functions = require('firebase-functions');
const Openpay = require('openpay');
const Tools = require('../Tools');

exports.handler = async (data, context) => {
  const body = data;
  console.log(JSON.stringify(body));
  return new Promise((resolve, reject) => {
    if (context.auth && context.auth.uid) {
      let prodBool = functions.config().configop.production === 'true';
      let openpay = new Openpay(functions.config().configop.merchant, functions.config().configop.pk, prodBool);
      if (!body.customer_id) {
        reject(new functions.https.HttpsError('invalid-argument', 'El valor customer_id es requerido'));
      }

      if (!body.customer) {
        reject(new functions.https.HttpsError('invalid-argument', 'El objeto customer es requerido'));
      }

      if (!body.customer.name) {
        reject(new functions.https.HttpsError('invalid-argument', 'El valor name es requerido'));
      }

      if (!body.customer.last_name) {
        reject(new functions.https.HttpsError('invalid-argument', 'El valor last_name es requerido'));
      }

      if (!body.customer.email) {
        reject(new functions.https.HttpsError('invalid-argument', 'El valor email es requerido'));
      }

      if (!body.card) {
        reject(new functions.https.HttpsError('invalid-argument', 'El objeto card es requerido'));
      } else {
        if (!body.card.id) {
          if (!body.card_id) {
            reject(new functions.https.HttpsError('invalid-argument', 'El valor card_id es requerido'));
          }
        }
      }

      /*openpay.customers.delete('ahamzpvf4r3okkjx9tvi', function(error) {
      // ... 
      if (error) {
        console.error(error);

        reject(new functions.https.HttpsError('internal', error.description));
      }
      console.log('deleted');
      resolve(true);
    }); */

      openpay.customers.list(
        {
          external_id: body.customer_id
        },
        (error, customerList) => {
          if (error) {
            console.error(error);

            reject(new functions.https.HttpsError('internal', error.description));
          }

          if (customerList.length === 0) {
            // create user
            openpay.customers.create(
              {
                external_id: body.customer_id,
                name: body.customer.name,
                last_name: body.customer.last_name,
                email: body.customer.email
              },
              (error, customer) => {
                if (error) {
                  console.error(error);
                  // reject(new functions.https.HttpsError('internal', error.description, error));
                  resolve({
                    status: 'error',
                    error
                  });
                }

                // create card
                console.log(JSON.stringify(customer));
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
                      console.error(error);
                      // reject(new functions.https.HttpsError('internal', error.description, error));
                      resolve({
                        status: 'error',
                        error
                      });
                    }
                    console.log(JSON.stringify(card[0]));
                    // pay
                    openpay.customers.charges.create(
                      customerId,
                      {
                        source_id: card.id,
                        method: 'card',
                        amount: body.amount,
                        description: 'Abodo de Saldo Conectimed',
                        device_session_id: body.card.device_session_id,
                        order_id: `ORDEN-CONECTIMED-'${new Date().getTime()}`,
                        currency: 'MXN'
                      },
                      (error, payment) => {
                        if (error) {
                          console.error(error);
                          // reject(new functions.https.HttpsError('internal', error.description, error));
                          resolve({
                            status: 'error',
                            error
                          });
                        }
                        console.log(JSON.stringify(payment));
                        resolve(payment);
                      }
                    );
                  });
                }
              }
            );
          } else {
            const customer = customerList[0];
            let device_session_id = body.device_session_id;
            console.log(customer);
            if (body.card.device_session_id) {
              device_session_id = body.card.device_session_id;
            }

            let chargReq = {
              method: 'card',
              amount: body.amount,
              description: 'Abodo de Saldo Conectimed',
              device_session_id,
              order_id: `ORDEN-CONECTIMED-'${new Date().getTime()}`,
              currency: 'MXN'
            };

            if (body.card_id) {
              // create card
              openpay.customers.cards.create(
                customer.id,
                {
                  token_id: body.card_id,
                  device_session_id
                },
                (error, card) => {
                  if (error) {
                    console.error(error);
                    // reject(new functions.https.HttpsError('internal', error.description, error));
                    resolve({
                      status: 'error',
                      error
                    });
                  }
                  console.log(JSON.stringify(card));
                  chargReq.source_id = card.id;
                  console.log(JSON.stringify(chargReq));
                  // pay
                  openpay.customers.charges.create(customer.id, chargReq, (error, payment) => {
                    if (error) {
                      console.error(error);
                      // reject(new functions.https.HttpsError('internal', error.description, error));
                      resolve({
                        status: 'error',
                        error
                      });
                    }
                    console.log(JSON.stringify(payment));
                    resolve(payment);
                  });
                }
              );
            } else if (body.card.id) {
              chargReq.source_id = body.card.id;
              // pay
              openpay.customers.charges.create(customer.id, chargReq, (error, payment) => {
                if (error) {
                  console.error(error);
                  // reject(new functions.https.HttpsError('internal', error.description, error));
                  resolve({
                    status: 'error',
                    error
                  });
                }

                resolve(payment);
              }); // pay
            } else {
              // create card
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
                    console.error(error);
                    // reject(new functions.https.HttpsError('internal', error.description, error));
                    resolve({
                      status: 'error',
                      error
                    });
                  }

                  chargReq.source_id = card.id;

                  // pay
                  openpay.customers.charges.create(customer.id, chargReq, (error, payment) => {
                    if (error) {
                      console.error(error);
                      // reject(new functions.https.HttpsError('internal', error.description, error));
                      resolve({
                        status: 'error',
                        error
                      });
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
      reject(new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated'));
    }
  });
};
