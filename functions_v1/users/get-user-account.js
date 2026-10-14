const functions = require('firebase-functions');
const Tools = require('../Tools');
const moment = require('moment');

async function getUserByUID(uid) {
  const admin = Tools.getFBAdminInstance();
  try {
    return await admin.auth().getUser(uid);
  } catch (error) {
    return error;
  }
}

async function getUserByEmail(email, info) {
  const admin = Tools.getFBAdminInstance();
  const db = admin.firestore();
  try {
    let userAuth = await admin.auth().getUserByEmail(email);
    if (userAuth && userAuth.uid && info && info === true) {
      const resp = await db.doc(`users/${userAuth.uid}`).get();
      let information = {};
      if (resp && resp.exists === true) {
        information = resp.data();
      }
      return {
        authInformation: userAuth,
        userInformation: information
      };
    } else {
      return userAuth;
    }
  } catch (error) {
    return error;
  }
}

async function generatePasswordResetLink(email) {
  const admin = Tools.getFBAdminInstance();
  try {
    return await admin.auth().generatePasswordResetLink(email);
  } catch (error) {
    return error;
  }
}

async function generateEmailVerificationLink(email) {
  const admin = Tools.getFBAdminInstance();
  try {
    return await admin.auth().generateEmailVerificationLink(email);
  } catch (error) {
    return error;
  }
}

async function deleteUser(uid) {
  const admin = Tools.getFBAdminInstance();
  const db = admin.firestore();
  try {
    // Delete user record in `users` collection
    try {
      await db
        .collection('users')
        .doc(uid)
        .delete();
    } catch (error) {
      return error;
    }
    // Delete user record in `medico-meta` collection
    try {
      await db
        .collection('medico-meta')
        .doc(uid)
        .delete();
    } catch (error) {
      return error;
    }
    // Delete user record in `representante-meta` collection
    try {
      await db
        .collection('representante-meta')
        .doc(uid)
        .delete();
    } catch (error) {
      return error;
    }
    //
    try {
      await admin.auth().deleteUser(uid);
    } catch (error) {
      return error;
    }
    return { success: true };
  } catch (error) {
    return error;
  }
}

async function signInWithCustomToken(customToken) {
  try {
    return await Tools.sendRequest(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${functions.config().configfb.api_key
      }`,
      {
        headers: {
          'content-type': 'application/json'
        }
      },
      'POST',
      { token: customToken, returnSecureToken: true }
    )
      .then(response => {
        return response.data;
      })
      .catch(error => {
        return error.response.data;
      });
  } catch (error) {
    return error;
  }
}

/**
 *
 * @param { string } uid user uid
 * @param  { number } properties the key(s) what you want to update (email, emailVerified, password, disabled etc.).
 * @returns a JSON user
 */

async function updateUser(uid, properties) {
  const admin = Tools.getFBAdminInstance();
  const db = admin.firestore();
  try {
    if (properties && properties.email) {
      // Update user record in `users` collection
      const email = String(properties.email)
        .toLocaleLowerCase()
        .trim();
      try {
        await db
          .collection('users')
          .doc(uid)
          .update({
            email: email
          });
      } catch (error) {
        return error;
      }
    }
    if (properties && (properties.disabled === false || properties.disabled === true)) {
      // Update user record in `users` collection
      try {
        await db
          .collection('users')
          .doc(uid)
          .update({
            status: properties.disabled === true ? 'inactive' : 'active'
          });
      } catch (error) {
        return error;
      }
    }
    return await admin.auth().updateUser(uid, properties);
  } catch (error) {
    return error;
  }
}

async function getUsers(pageToken) {
  const admin = Tools.getFBAdminInstance();
  try {
    if (pageToken) {
      return await admin.auth().listUsers(1000, pageToken);
    } else {
      return await admin.auth().listUsers(1000);
    }
  } catch (error) {
    return error;
  }
}

async function getAllUsers() {
  const admin = Tools.getFBAdminInstance();
  const allUsers = [];
  let pageToken = undefined;

  try {
    do {
      const result = await admin.auth().listUsers(1000, pageToken);

      const nonAnonymous = result.users.filter(user =>
        user.providerData.length > 0 && !user.providerData.some(p => p.providerId === 'anonymous')
      );

      const _users = nonAnonymous.map(user => {
        return {
          uid: user.uid,
          email: user.email || null,
          disabled: user.disabled || false,
          creationTime: user.metadata.creationTime
            ? moment(user.metadata.creationTime).format('YYYY-MM-DD HH:mm:ss')
            : null,
          lastSignInTime: user.metadata.lastSignInTime
            ? moment(user.metadata.lastSignInTime).format('YYYY-MM-DD HH:mm:ss')
            : null
        };
      });

      allUsers.push(..._users);
      pageToken = result.pageToken;
    } while (pageToken);

    return allUsers;
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    throw error;
  }
}

exports.deleteUserHandlerCallable = async (data, context) => {
  if (context.auth && context.auth.uid) {
    try {
      if (data && data.uid) {
        return await deleteUser(data.uid);
      } else {
        throw new functions.https.HttpsError('missing parameters', 'missing parameters (uid)');
      }
    } catch (error) {
      throw new functions.https.HttpsError(
        'unexpected error',
        'The function was called and an unexpected error occurred'
      );
    }
  } else {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated');
  }
};

exports.updateUserHandlerCallable = async (data, context) => {
  if (context.auth && context.auth.uid) {
    try {
      if (data && data.uid) {
        return await updateUser(data.uid, data.data);
      } else {
        throw new functions.https.HttpsError('missing parameters', 'missing parameters (uid)');
      }
    } catch (error) {
      throw new functions.https.HttpsError(
        'unexpected error',
        'The function was called and an unexpected error occurred'
      );
    }
  } else {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated');
  }
};

exports.getUserHandlerCallable = async (data, context) => {
  if (context.auth && context.auth.uid) {
    try {
      if (data && data.uid) {
        return await getUserByUID(data.uid);
      } else {
        throw new functions.https.HttpsError('missing parameters', 'missing parameters (uid)');
      }
    } catch (error) {
      throw new functions.https.HttpsError(
        'unexpected error',
        'The function was called and an unexpected error occurred'
      );
    }
  } else {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated');
  }
};

exports.getUserByEmailHandlerCallable = async (data, context) => {
  if (context.auth && context.auth.uid) {
    try {
      if (data && data.email) {
        return await getUserByEmail(data.email, data.info);
      } else {
        throw new functions.https.HttpsError('missing parameters', 'missing parameters (email)');
      }
    } catch (error) {
      throw new functions.https.HttpsError(
        'unexpected error',
        'The function was called and an unexpected error occurred'
      );
    }
  } else {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated');
  }
};

exports.generatePasswordResetLinkHandlerCallable = async (data, context) => {
  if (context.auth && context.auth.uid) {
    try {
      if (data && data.email) {
        return await generatePasswordResetLink(data.email);
      } else {
        throw new functions.https.HttpsError('missing parameters', 'missing parameters (email)');
      }
    } catch (error) {
      throw new functions.https.HttpsError(
        'unexpected error',
        'The function was called and an unexpected error occurred'
      );
    }
  } else {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated');
  }
};

exports.generateEmailVerificationLinkHandlerCallable = async (data, context) => {
  if (context.auth && context.auth.uid) {
    try {
      if (data && data.email) {
        return await generateEmailVerificationLink(data.email);
      } else {
        throw new functions.https.HttpsError('missing parameters', 'missing parameters (email)');
      }
    } catch (error) {
      throw new functions.https.HttpsError(
        'unexpected error',
        'The function was called and an unexpected error occurred'
      );
    }
  } else {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated');
  }
};

exports.getAllUsersHandlerCallable = async function (request, response) {
  response.header('Content-Type', 'application/json');
  response.header('Access-Control-Allow-Origin', '*');

  if (request.method === 'OPTIONS') {
    return response.status(204).send('');
  }

  if (request && request.method === 'POST') {
    try {
      const resp = await getAllUsers();
      return response.status(200).send(resp);
    } catch (e) {
      console.error('Error capturado', e);
      return response.status(204).send(e);
    }
  } else {
    return response.status(405).send({ code: 405, message: `${request.method} Method Not Allowed` });
  }
};

exports.getUserByEmailHandlerRequest = async function (request, response) {
  response.header('Content-Type', 'application/json');
  response.header('Access-Control-Allow-Origin', '*');
  response.header('Access-Control-Allow-Headers', 'Content-Type, private-key, public-key');
  const admin = Tools.getFBAdminInstance();
  const privateKey =
    request && request.headers && request.headers['private-key'] ? String(request.headers['private-key']) : undefined;

  const publicKey =
    request && request.headers && request.headers['public-key'] ? String(request.headers['public-key']) : undefined;

  if (request.method === 'OPTIONS') {
    return response.status(204).send('');
  }

  if (
    String(functions.config().custom_security.private_key) === privateKey &&
    String(functions.config().custom_security.public_key) === publicKey
  ) {
    if (request && request.method === 'POST') {
      try {
        if (request && request.body && request.body.email) {
          let uid = undefined;
          let data = await getUserByEmail(request.body.email, request.body.info);
          if (data && data.uid) {
            uid = data.uid;
          }
          if (data && data.authInformation && data.authInformation.uid) {
            uid = data.authInformation.uid;
          }
          if (uid) {
            const token = await admin.auth().createCustomToken(uid);

            if (token) {
              const customToken = await signInWithCustomToken(token);
              data.token = customToken;
              return response.status(200).send(data);
            } else {
              console.error({ 'error-code': 'Error token' });
              return response.status(204).send({ 'error-code': 'Error token' });
            }
          } else {
            console.error({ 'error-code': 'Unhandled error' });
            return response.status(204).send({ 'error-code': 'Unhandled error' });
          }
        } else {
          console.error({ message: 'missing parameters' });
          return response.status(204).send({ message: 'missing parameters' });
        }
      } catch (e) {
        console.error('Error capturado', e);
        return response.status(204).send(e);
      }
    } else {
      return response.status(405).send({ code: 405, message: `${request.method} Method Not Allowed` });
    }
  } else {
    return response.status(401).send({ message: 'unauthorized request' });
  }
};

exports.changePasswordHandlerRequest = async function (request, response) {
  response.header('Content-Type', 'application/json');
  response.header('Access-Control-Allow-Origin', '*');
  response.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  const admin = Tools.getFBAdminInstance();

  if (request.method === 'OPTIONS') {
    return response.status(204).send('');
  }

  const idToken = String(request.headers['authorization']).replace('Bearer ', '');
  let verify = {};

  try {
    verify = await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    return response.status(401).send(error);
  }

  if (verify && verify.uid) {
    if (request && request.method === 'POST') {
      try {
        const db = admin.firestore();
        const data = request && request.body ? request.body : {};

        if (data && data.uid) {
          if (data && data.data && data.data.password && data.data.repeatPassword && data.data.code) {
            const ref = db.collection('recovery-codes').doc(data.uid);
            const resp = await ref.get();
            const _code = resp.get('code');
            const _status = resp.get('status');
            if (String(_code) === String(data.data.code) && _status === 'pending') {
              if (String(data.data.password).length >= 6) {
                if (String(data.data.password) === String(data.data.repeatPassword)) {
                  await ref.update({ status: 'active' });
                  const resp = await updateUser(data.uid, { password: data.data.password });
                  return response.status(200).send(resp);
                } else {
                  return response.status(400).send({
                    code: 'must-match-password',
                    message: 'the password must be the same as when repeating the password'
                  });
                }
              } else {
                return response
                  .status(400)
                  .send({ code: 'password-length', message: 'the password must have at least 6 characters' });
              }
            } else {
              return response
                .status(400)
                .send({ code: 'invalid-argument', message: 'incorrect code please try again' });
            }
          } else {
            return response.status(400).send({
              code: 'missing-parameters',
              message: 'missing parameters (password, repeatPassword or verification code)'
            });
          }
        } else {
          return response.status(400).send({ code: 'missing-user-id', message: 'missing parameters (uid)' });
        }
      } catch (e) {
        console.error('Error capturado', e);
        return response.status(500).send(e);
      }
    } else {
      return response.status(405).send({ code: 405, message: `${request.method} Method Not Allowed` });
    }
  } else {
    return response.status(401).send({ message: 'unauthorized request' });
  }
};

exports.checkCodeHandlerRequest = async function (request, response) {
  response.header('Content-Type', 'application/json');
  response.header('Access-Control-Allow-Origin', '*');
  response.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  const admin = Tools.getFBAdminInstance();

  if (request.method === 'OPTIONS') {
    return response.status(204).send('');
  }

  const idToken = String(request.headers['authorization']).replace('Bearer ', '');
  let verify = {};

  try {
    verify = await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    return response.status(401).send(error);
  }

  if (verify && verify.uid) {
    if (request && request.method === 'POST') {
      try {
        const db = admin.firestore();
        const data = request && request.body ? request.body : {};

        if (data && data.uid) {
          if (data && data.data && data.data.code) {
            const ref = db.collection('recovery-codes').doc(data.uid);
            const resp = await ref.get();
            const _code = resp.get('code');
            const _status = resp.get('status');
            if (String(_code) === String(data.data.code) && _status === 'pending') {
              return response.status(200).send(resp.data());
            } else {
              return response
                .status(400)
                .send({ code: 'invalid-argument', message: 'incorrect code please try again' });
            }
          } else {
            return response.status(400).send({
              code: 'missing-parameters',
              message: 'missing parameters (verification code)'
            });
          }
        } else {
          return response.status(400).send({ code: 'missing-user-id', message: 'missing parameters (uid)' });
        }
      } catch (e) {
        console.error('Error capturado', e);
        return response.status(500).send(e);
      }
    } else {
      return response.status(405).send({ code: 405, message: `${request.method} Method Not Allowed` });
    }
  } else {
    return response.status(401).send({ message: 'unauthorized request' });
  }
};

exports.generateCodeHandlerRequest = async function (request, response) {
  response.header('Content-Type', 'application/json');
  response.header('Access-Control-Allow-Origin', '*');
  response.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  const admin = Tools.getFBAdminInstance();

  if (request.method === 'OPTIONS') {
    return response.status(204).send('');
  }

  const idToken = String(request.headers['authorization']).replace('Bearer ', '');
  let verify = {};

  try {
    verify = await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    return response.status(401).send(error);
  }

  if (verify && verify.uid) {
    if (request && request.method === 'POST') {
      try {
        const db = admin.firestore();
        const data = request && request.body ? request.body : {};

        if (data && data.uid && (data.email || data.number)) {
          const code = String(Math.floor(100000 + Math.random() * 900000));
          const ref = db.collection('recovery-codes').doc(data.uid);

          await ref.set({
            uid: data.uid,
            email: data.email || null,
            number: data.number || null,
            date: moment().toDate(),
            code: code,
            status: 'pending'
          });

          const info = await ref.get();

          if (data.email) {
            const base641 = Buffer.from(data.email).toString('base64');
            const base642 = Buffer.from(code).toString('base64');
            const URL_RESET_PASSWORD = `${functions.config().configapp.url}/reset-password/${base641}/${base642}`;
            const text = `
          <div style="font-family: Arial, Helvetica, sans-serif; text-align: center;">
              <table border="0" cellspacing="1" cellpadding="10" align="center">
                  <tbody>
                      <tr>
                          <td>
                          <h2>Hola ${data.name || ''}</h2>    

                          <p>Le hemos enviado este correo en respuesta a su solicitud de restablecimiento de contraseña en <strong>Conectimed</strong>.</p>

                          <p>Este es su código de verificación: <strong>${code}</strong>. Por favor, ingréselo en el campo de "Código de
                              verificación" para poder restablecer su contraseña.</p>

                          <p>Para restablecer su contraseña, también puede seguir el siguiente enlace:</p>

                          <p><a href="${URL_RESET_PASSWORD}" target="_blank"
                                  style="display: inline-block; padding: 10px 20px; font-size: 16px; color: #ffffff; background-color: #007bff; text-align: center; text-decoration: none; border-radius: 5px;">Restablecer
                                  Contraseña</a></p>

                          <p>Si el enlace no funciona, copie y pegue la siguiente dirección en su navegador:</p>

                          <p><a href="${URL_RESET_PASSWORD}" target="_blank">${URL_RESET_PASSWORD}</a></p>

                          <p>Por favor, ignore este correo si no solicitó un cambio de contraseña.</p>
                          </td>
                      </tr>
                   
                  </tbody>
              </table>
          </div>`;

            await Tools.sendEmail({
              recipient: data.email,
              subject: '¡Recuperar contraseña Conectimed!',
              text: text,
              name: ''
            });
          }

          if (data.number) {
            await Tools.sendSMS({
              sender: 'Conectimed',
              recipient: data.number,
              content: `Éste es su código de verificación: ${code}. Por favor ingréselo en el campo de "Código de verificación" para poder reestablecer su contraseña.`
            });
          }

          return response.status(200).send({ code: info.get('code') });
        } else {
          return response
            .status(400)
            .send({ code: 'missing-parameters', message: 'missing parameters (uid, email or number)' });
        }
      } catch (e) {
        console.error('Error capturado', e);
        return response.status(500).send(e);
      }
    } else {
      return response.status(405).send({ code: 405, message: `${request.method} Method Not Allowed` });
    }
  } else {
    return response.status(401).send({ message: 'unauthorized request' });
  }
};
