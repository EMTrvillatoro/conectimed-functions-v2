const { getFBAdminInstance, sendEmail, sendSMS, sendRequest } = require('../Tools');
const { defineSecret } = require('firebase-functions/params');
const moment = require('moment');
const PRIVATE_KEY = defineSecret('CUSTOM_SECURITY_PRIVATE_KEY');
const PUBLIC_KEY = defineSecret('CUSTOM_SECURITY_PUBLIC_KEY');
const APP_URL = defineSecret('CONFIGAPP_URL');
const API_KEY = defineSecret('CONFIGFB_API_KEY');

/**
 * 
 * @param { import('express').Request } request 
 * @param { import('express').Response } response 
 * @returns 
 */

async function generateCodeHandlerRequest(request, response) {
    response.set('Content-Type', 'application/json');
    response.set('Access-Control-Allow-Origin', '*');
    response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    const admin = getFBAdminInstance();

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
                        const URL_RESET_PASSWORD = `${APP_URL.value()}/reset-password/${base641}/${base642}`;
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

                        await sendEmail({
                            recipient: data.email,
                            subject: '¡Recuperar contraseña Conectimed!',
                            text: text,
                            name: ''
                        });
                    }

                    if (data.number) {
                        await sendSMS({
                            sender: 'Conectimed',
                            recipient: data.number,
                            content: `Éste es su código de verificación Conectimed: ${code}. Por favor ingréselo en el campo de "Código de verificación" para poder reestablecer su contraseña.`
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
}

/**
 * 
 * @param { import('express').Request } request 
 * @param { import('express').Response } response 
 * @returns 
 */

async function getUserByEmailHandlerRequest(request, response) {
    response.set('Content-Type', 'application/json');
    response.set('Access-Control-Allow-Origin', '*');
    response.set('Access-Control-Allow-Headers', 'Content-Type, private-key, public-key');
    const admin = getFBAdminInstance();
    const privateKey =
        request && request.headers && request.headers['private-key'] ? String(request.headers['private-key']) : undefined;

    const publicKey =
        request && request.headers && request.headers['public-key'] ? String(request.headers['public-key']) : undefined;

    if (request.method === 'OPTIONS') {
        return response.status(204).send('');
    }

    if (
        String(PRIVATE_KEY.value()) === privateKey &&
        String(PUBLIC_KEY.value()) === publicKey
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

async function getUserByEmail(email, info) {
    const admin = getFBAdminInstance();
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

async function signInWithCustomToken(customToken) {
    try {
        return await sendRequest(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY.value()
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

module.exports = { generateCodeHandlerRequest, getUserByEmailHandlerRequest };