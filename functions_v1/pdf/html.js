const functions = require('firebase-functions');
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
  //response.header('Content-Type', 'application/json');
  response.header('Content-Type', 'text/html');
  response.header('Access-Control-Allow-Origin', '*');
  response.header('Access-Control-Allow-Headers', 'Content-Type');
  if (request.method === 'OPTIONS') {
    return response.status(204).send('');
  }
  if (request && request.method === 'GET') {
    if (request && request.query && request.query.cuid) {
      try {
        const cuid = request.query.cuid;
        const certificateDoc = await db.doc(`constancias-webinar/${cuid}`).get();
        if (certificateDoc.exists === true) {
          const certificateData = certificateDoc.data();
          const uuid = certificateData && certificateData.uuid ? certificateData.uuid : undefined;
          if (uuid) {
            const userDoc = await db.doc(`users/${uuid}`).get();
            if (userDoc.exists === true) {
              const userData = userDoc.data();
              let userFullName = `${userData && userData.name ? String(userData.name) : ''} ${
                userData && userData.lastName1 ? String(userData.lastName1) : ''
              } ${userData && userData.lastName2 ? String(userData.lastName2) : ''}`;
              ////////// CERTIFICATE PARAMETERS
              userFullName = Tools.capitalizeText(userFullName);
              const eventName =
                certificateData && certificateData.eventName ? Tools.cleanText(certificateData.eventName) : '';
              const eventNameContinuation =
                certificateData && certificateData.eventNameContinuation
                  ? Tools.cleanText(certificateData.eventNameContinuation)
                  : '<br>';
              const eventDate =
                certificateData && certificateData.eventDate ? Tools.cleanText(certificateData.eventDate) : '';
              const eventDuration =
                certificateData && certificateData.eventDuration ? Tools.cleanText(certificateData.eventDuration) : '';
              const eventPlatform =
                certificateData && certificateData.eventPlatform ? Tools.cleanText(certificateData.eventPlatform) : '';
              const eventCity =
                certificateData && certificateData.eventCity ? Tools.cleanText(certificateData.eventCity) : '';
              const dateOfSendingCertificates =
                certificateData && certificateData.dateOfSendingCertificates
                  ? Tools.cleanText(certificateData.dateOfSendingCertificates)
                  : '';

              const html = `
                            <!DOCTYPE html>
                            <html lang="en">

                            <head>
                                <meta charset="UTF-8">
                                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                <meta http-equiv="X-UA-Compatible" content="ie=edge">
                                <title>${eventName}</title>
                                <style type="text/css">
                                    :root {
                                        --bleeding: 0.5cm;
                                        --margin: 1cm;
                                    }

                                    @page {
                                        size: A4;
                                        margin: 0;
                                    }

                                    * {
                                        box-sizing: border-box;
                                    }

                                    body {
                                        margin: 0 auto;
                                        padding: 0;
                                        background: rgb(204, 204, 204);
                                        display: flex;
                                        flex-direction: column;
                                        font-family: Arial, Helvetica, sans-serif;
                                    }

                                    .page {
                                        display: inline-block;
                                        position: relative;
                                        height: 297mm;
                                        width: 210mm;
                                        font-size: 12pt;
                                        margin: 2em auto;
                                        padding: calc(var(--bleeding) + var(--margin));
                                        box-shadow: 0 0 0.5cm rgba(0, 0, 0, 0.5);
                                        background: white;
                                    }

                                    @media screen {
                                        .page::after {
                                            position: absolute;
                                            content: '';
                                            top: 0;
                                            left: 0;
                                            width: calc(100% - var(--bleeding) * 2);
                                            height: calc(100% - var(--bleeding) * 2);
                                            margin: var(--bleeding);
                                            outline: thin dashed black;
                                            pointer-events: none;
                                            z-index: 9999;
                                        }
                                    }

                                    @media print {
                                        .page {
                                            margin: 0;
                                            overflow: hidden;
                                        }
                                    }

                                    #logo {
                                        width: 160px;
                                    }

                                    #pleca-sup {
                                        width: 220px;
                                    }

                                    #pleca-sup-wrapper {
                                        position: absolute;
                                        top: 0;
                                        right: 0;
                                    }

                                    #footer {
                                        width: 800px;
                                    }

                                    #footer-wrapper {
                                        position: absolute;
                                        left: 0;
                                        bottom: 0px;
                                    }
                                </style>
                            </head>

                            <body style="--bleeding: 0.5cm;--margin: 1cm;">
                                <div class="page">
                                    <!-- Your content here -->
                                    <font style="font-size: 12px">
                                        <table border="0" cellspacing="0" align="center">
                                            <tr>

                                                <td width="1000" align="center">

                                                    <div style="position: relative;">
                                                        <img src="https://firebasestorage.googleapis.com/v0/b/conectimed-9d22c.appspot.com/o/Constancias%2Fformats%2Fimg%2Flogo-conectimed.png?alt=media&token=c6adab05-ee9b-48c6-bcc9-cdc0f7413bfe"
                                                            alt="logo-conectimed" id="logo">
                                                    </div>
                                                    <div id="pleca-sup-wrapper">
                                                        <img src="https://firebasestorage.googleapis.com/v0/b/conectimed-9d22c.appspot.com/o/Constancias%2Fformats%2Fimg%2Fpleca-sup.png?alt=media&token=807afddc-4e1b-4360-b215-39a0c286053f"
                                                            alt="pleca-sup" id="pleca-sup">
                                                    </div>
                                                </td>

                                            </tr>
                                        </table>
                                        <table border="0" cellspacing="0" style="margin-top: 40px;" align="center">
                                            <tr>

                                                <td width="644" align="center" style="font-size: 25px; color: #4c4e4f; text-align: center;">

                                                    Por medio del Consejo Académico de la <br>
                                                    Asociación Mexicana para la Educación Médica Contínua
                                                    se otorga la siguiente

                                                </td>

                                            </tr>
                                        </table>
                                        <table border="0" cellspacing="0" style="margin-top: 30px;" align="center">
                                            <tr>

                                                <td width="654" align="center"
                                                    style="font-size: 45px; color: #000; font-weight: bold; color:#115186;">
                                                    CONSTANCIA
                                                </td>

                                            </tr>
                                        </table>
                                        <table border="0" cellspacing="0" style="margin-top: 20px;" align="center">
                                            <tr>

                                                <td width="654" align="center" style="font-size: 32px; color: #231f20; font-weight: bold;">
                                                    ${userFullName}
                                                </td>

                                            </tr>
                                        </table>
                                        <table border="0" cellspacing="0" style="margin-top: 10px;" align="center">
                                            <tr>

                                                <td width="654" align="center" style="font-size: 25px; color: #4c4e4f;">
                                                    Por asistir a la Sesión Virtual
                                                </td>

                                            </tr>
                                        </table>

                                        <table border="0" cellspacing="0" style="margin-top: 10px;" align="center">
                                            <tr>

                                                <td width="654" align="center" style="font-size: 35px; color: #4c4e4f; font-weight: normal;">
                                                    ${eventName}
                                                    ${'<br>' + eventNameContinuation}
                                                </td>

                                            </tr>
                                        </table>

                                        <table border="0" cellspacing="0" style="margin-top: 20px;" align="center">
                                            <tr>

                                                <td width="654" align="center" style="font-size: 23px; color: #4c4e4f;">
                                                    efectuada el <b>
                                                        ${eventDate}
                                                    </b> con duración de <b>
                                                        ${eventDuration} min
                                                    </b>
                                                </td>

                                            </tr>
                                        </table>
                                        <table border="0" cellspacing="0" style="margin-top: 10px;" align="center">
                                            <tr>

                                                <td width="654" align="center" style="font-size: 26px; color: #4c4e4f;">
                                                    a través de <b>
                                                        ${eventPlatform}
                                                    </b> <br>
                                                    plataforma de educación médica contínua.
                                                </td>

                                            </tr>
                                        </table>
                                        <table border="0" cellspacing="0" style="margin-top: 20px; margin-bottom: 20px" align="center">
                                            <tr>

                                                <td width="654" align="center" style="font-size: 18px; color: #4c4e4f;">
                                                    ${eventCity}, a
                                                    ${dateOfSendingCertificates}
                                                </td>

                                            </tr>
                                        </table>
                                    </font>

                                    <font>
                                        <div id="footer-wrapper">
                                            <img src="https://firebasestorage.googleapis.com/v0/b/conectimed-9d22c.appspot.com/o/Constancias%2Fformats%2Fimg%2Ffooter.png?alt=media&token=89c942d8-be69-4560-ba61-dd5d2ffb4dd7"
                                                alt="footer" id="footer">
                                        </div>
                                    </font>
                                    <!-- End of your content -->
                                </div>
                            </body>

                            </html>`;

              return response.status(200).send(html);
            } else {
              return response.status(401).send({ message: 'Error getting user info' });
            }
          } else {
            return response.status(401).send({ message: 'Error getting user uuid' });
          }
        } else {
          return response.status(401).send({ message: 'Error getting certificate info' });
        }
      } catch (error) {
        console.log(error);
        return response.status(500).send({ error: error });
      }
    } else {
      return response.status(401).send({ message: 'missing parameters' });
    }
  } else {
    return response.status(405).send({ code: 405, message: `${request.method} Method Not Allowed` });
  }
};
