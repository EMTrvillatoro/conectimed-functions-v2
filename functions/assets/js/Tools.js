const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

const ctmCryptSecretKey = defineSecret('CTM_CRYPT_SECRET_KEY');
const ctmCryptIvLength = defineSecret('CTM_CRYPT_IV_LENGTH');
const minLength = 3;

const databaseURL = defineSecret('CONFIGFB_DATABASE_URL');
const CERT = defineSecret('CONFIGFB_ADMIN_CREDENTIAL_CERT');

const clientEmail = defineSecret('CONFIGFB_CLIENT_EMAIL');
const storageBucket = defineSecret('CONFIGFB_STORAGE_BUCKET');
const databaseName = defineSecret('CONFIGFB_DATABASE_NAME');

const mailingURL = defineSecret('MAILING_URL');
const mailingAPIKey = defineSecret('MAILING_API_KEY');
const smsURL = defineSecret('SMS_URL');
const configAppURL = defineSecret('CONFIGAPP_URL');
const configAppIcon = defineSecret('CONFIGAPP_ICON');
const cloudMessagingURL = defineSecret('CLOUD_MESSAGING_URL');

const axios = require('axios');
const { google } = require('googleapis');
const specialities = require('../data/specialities.json');

// Rate limit en memoria
const rateLimits = new Map();
const MAX_REQUESTS = 10;
const WINDOW_MS = 60 * 1000; // 60 segundos

function getFBAdminInstance() {
  if (!admin.apps.length) {
   admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(CERT.value())),
      databaseURL: databaseURL.value(),
      serviceAccountId: clientEmail.value(),
      storageBucket: storageBucket.value(),
      projectId: databaseName.value()
    });
    const settings = { timestampsInSnapshots: true, ignoreUndefinedProperties: true };
    admin.firestore().settings(settings);
  }
  return admin;
}

function getAccessToken() {
  var MESSAGING_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
  var SCOPES = [MESSAGING_SCOPE];
  var key = JSON.parse(CERT.value());
  return new Promise((resolve, reject) => {
    const client_email = key.client_email;
    const private_key = String(key.private_key).replace(/\\n/g, '\n');
    var jwtClient = new google.auth.JWT({ email: client_email, key: private_key, scopes: SCOPES });
    jwtClient.authorize((err, tokens) => {
      if (err) {
        reject(err);
        return;
      }
      resolve({ success: true, token: tokens.access_token });
    });
  });
}

function isRateLimited(key) {
  const now = Date.now();
  const entry = rateLimits.get(key);

  if (entry) {
    if (now - entry.timestamp < WINDOW_MS) {
      if (entry.count >= MAX_REQUESTS) return true;
      entry.count += 1;
    } else {
      rateLimits.set(key, { count: 1, timestamp: now });
    }
  } else {
    rateLimits.set(key, { count: 1, timestamp: now });
  }
  return false;
}

function utf8Encode(str) {
  return Buffer.from(str, "utf8");
}

function utf8Decode(buf) {
  return buf.toString("utf8");
}

function xorWithKeyAndIv(data, key, iv) {
  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i++) {
    out[i] = data[i] ^ key[i % key.length] ^ iv[i % iv.length];
  }
  return out;
}

function decryptBack(b64) {
  const packed = Buffer.from(b64, "base64");
  const iv = packed.slice(0, ctmCryptIvLength.value());
  const cipher = packed.slice(ctmCryptIvLength.value());

  const keyBytes = utf8Encode(ctmCryptSecretKey.value());
  const plainBytes = xorWithKeyAndIv(cipher, keyBytes, iv);

  return utf8Decode(plainBytes);
}

function unique(value, index, self) {
  return self.indexOf(value) === index;
}

function arraySearch(text) {
  const _searchArray1 = searchArray(text);
  const _searchArray2 = searchArray(text, true);
  let _searchArray = [];
  _searchArray = _searchArray.concat(_searchArray1, _searchArray2);
  _searchArray = _searchArray.filter(unique);
  return _searchArray;
}

function searchArray(text, noSpecial) {
  text = String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  text = String(text).toLowerCase();
  if (noSpecial === true) {
    text = String(text).replace(/[^a-z0-9 ]/gi, '');
  }
  text = String(text).replace(/\s\s+/g, ' ');
  text = String(text).trim();

  let wordArray = [];
  let tempArray = [];
  let afterArray = [];
  let finalArray = [];

  wordArray = text.split(' ');

  if (text.length > minLength) {
    tempArray = getArraySearch(text, minLength);
  }

  /* NEW */
  let reverse = '';
  let afterWithout = text;

  do {
    reverse = String(afterWithout)
      .split('')
      .reverse()
      .join('');
    afterWithout = String(reverse).substr(0, String(reverse).lastIndexOf(' '));
    afterWithout = String(afterWithout)
      .split('')
      .reverse()
      .join('');
    afterArray = afterArray.concat(getArraySearch(afterWithout));
  } while (String(afterWithout).indexOf(' ') > -1);
  /* NEW END */

  finalArray = finalArray.concat(wordArray, tempArray, afterArray);
  finalArray = finalArray.filter(unique);
  return finalArray;
}

function getArraySearch(text, minLength) {
  let array = [];
  for (let i = String(text).length; i > (minLength ? minLength - 1 : 1); i--) {
    array.push(String(text).substring(0, i));
  }
  return array;
}

async function updateUserSearch(userData, userMetadata) {
  try {
    let search = [];
    const metaData = {
      state1: '',
      state2: '',
      specialty1: '',
      specialty2: '',
      specialty3: '',
      specialty4: '',
      specialty5: ''
    };
    if (userMetadata && userMetadata.address1 && userMetadata.address1.state && userMetadata.address1.state !== '') {
      metaData.state1 = userMetadata.address1.state;
    }
    if (userMetadata && userMetadata.address2 && userMetadata.address2.state && userMetadata.address2.state !== '') {
      metaData.state2 = userMetadata.address2.state;
    }

    if (userMetadata && userMetadata.specialty1) {
      const espID = userMetadata.specialty1.id || undefined;
      if (espID) {
        const response = await getSpecialty(espID) || '';
        metaData.specialty1 = response;
      }
    }

    if (userMetadata && userMetadata.specialty2) {
      const espID = userMetadata.specialty2.id || undefined;
      if (espID) {
        const response = await getSpecialty(espID) || '';
        metaData.specialty2 = response;
      }
    }

    if (userMetadata && userMetadata.specialty3) {
      const espID = userMetadata.specialty3.id || undefined;
      if (espID) {
        const response = await getSpecialty(espID) || '';
        metaData.specialty3 = response;
      }
    }

    if (userMetadata && userMetadata.specialty4) {
      const espID = userMetadata.specialty4.id || undefined;
      if (espID) {
        const response = await getSpecialty(espID) || '';
        metaData.specialty4 = response;
      }
    }

    if (userMetadata && userMetadata.specialty5) {
      const espID = userMetadata.specialty5.id || undefined;
      if (espID) {
        const response = await getSpecialty(espID) || '';
        metaData.specialty5 = response;
      }
    }

    for (let element of Object.values(metaData)) {
      if (element && element !== '') {
        const _search = arraySearch(element) || [];
        search = search.concat(_search);
      }
    }

    const name = userData.name || '';
    const lastName1 = userData.lastName1 || '';
    const lastName2 = userData.lastName2 || '';
    const email = userData.email || '';
    const _search = arraySearch(`${name} ${lastName1} ${lastName2} ${lastName1} ${lastName2} ${name}`);
    search = search.concat(_search);
    search = search.concat(arraySearch(email));
    return search
  } catch (error) {
    console.error(error);
    return;
  }
}

async function getSpecialty(id) {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  try {
    const doc = await admin.firestore().collection('specialties').doc(id).get();
    if (doc.exists) {
      return doc.data().name || '';
    } else {
      return '';
    }
  } catch (error) {
    console.error(error);
    return '';
  }
}

function stringSearch(str, whiteSpaces) {
  str = str.trim();
  var noTildes = removeAccents(str).replace(/[^\w\s]/gi, '');
  let regexp = /[^a-zA-Z0-9]/g;
  if (whiteSpaces === true) {
    regexp = /[^a-zA-Z0-9 ]/g;
  }
  let search = noTildes.replace(regexp, '').toLocaleLowerCase();
  search = search.replace(/^\s+|\s+$|\s+(?=\s)/g, '');
  return search;
}

function removeAccents(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}


async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

async function sendEmail(body) {
  try {
    const html = `
    <html lang="es">
    <head>
      <meta charset="utf-8" />
      <title>${body.subject}</title>
    </head>

    <body>
      <div style="font-family: Arial, Helvetica, sans-serif;text-align: center;width: 100%;margin: auto;">
        <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="60%" align="center">
          <tbody>
            <tr>
              <td align="center" colspan="2" style="font-size:0px;padding:15px 10px;word-break:break-word;">
                <img
                  alt=""
                  height="auto"
                  src="https://m.gr-cdn-6.com/getresponse-yGxOr/photos/5d046360-c754-4aba-8933-dae26f1d9da2.png"
                  style="border:0;border-left:0 none #000000;border-right:0 none #000000;border-top:0 none #000000;border-bottom:0 none #000000;border-radius:0;display:block;outline:none;text-decoration:none;height:auto;width:100%;font-size:13px;"
                  width="440"
                />
              </td>
            </tr>
            <tr>
              <td align="center" colspan="2" style="font-size:0px;padding:15px 10px;word-break:break-word;">
                <p style="border-top:solid 3px #10BCF9;font-size:1;margin:0px auto;width:100%;"></p>
                <!--[if mso | IE]>
                          <table align="center" border="0" cellpadding="0" cellspacing="0" style="border-top:solid 3px #10BCF9;font-size:1;margin:0px auto;width:540px;" role="presentation" width="540px" >
                            <tr>
                              <td style="height:0;line-height:0;"> &nbsp;</td>
                            </tr>
                          </table>
                          <![endif]-->
              </td>
            </tr>
            <tr>
              <td
                colspan="2"
                align="center"
                class="gr-mltext-uogniq gr-mltext-rxkiwr"
                style="font-size:0px;padding:5px 10px;word-break:break-word;"
              >
                <div
                  style="font-family:Ubuntu, Helvetica, Arial, sans-serif;font-size:13px;line-height:1.4;text-align:left;color:#000000;"
                >
                  <div style="text-align: center;">
                    <p
                      style="font-family:Arial;font-size:14px;margin-top:0px;margin-bottom:0px;font-weight:normal;color:#000000;"
                    >
                      <span style="font-family: Georgia;"
                        ><span style="font-size: 28px">Información relevante para el</span></span
                      >
                    </p>
                  </div>
                  <div style="text-align: center;">
                    <p
                      style="font-family:Arial;font-size:14px;margin-top:0px;margin-bottom:0px;font-weight:normal;color:#000000;"
                    >
                      <span style="font-family: Georgia;"
                        ><span style="font-size: 28px"><strong>MÉDICO DE HOY</strong></span></span
                      >
                    </p>
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" colspan="2" style="font-size:0px;padding:15px 10px;word-break:break-word;">
                <p style="border-top:solid 3px #10BCF9;font-size:1;margin:0px auto;width:100%;"></p>
                <!--[if mso | IE]><table align="center" border="0" cellpadding="0" cellspacing="0" style="border-top:solid 3px #10BCF9;font-size:1;margin:0px auto;width:540px;" role="presentation" width="540px" ><tr><td style="height:0;line-height:0;"> &nbsp;
        </td></tr></table><![endif]-->
              </td>
            </tr>
            <tr>
              <td
                align="center"
                style="
    width: 50%;
  "
              >
                <div style="width: 50px;text-align: center;">
                  <a href="https://www.amem.com.mx/" target="_blank"
                    ><img
                      alt=""
                      height="auto"
                      src="https://m.gr-cdn-6.com/getresponse-yGxOr/photos/474746ed-df08-4a3c-a06b-6c157171c95e.jpg"
                      style="border:0;border-left:0 none #000000;border-right:0 none #000000;border-top:0 none #000000;border-bottom:0 none #000000;border-radius:0;display:block;outline:none;text-decoration:none;height:auto;font-size:13px;text-align: center;"
                      width="50"
                  /></a>
                </div>
              </td>
              <td align="center">
                <div
                  style="/* width: 50%; */font-family:Ubuntu, Helvetica, Arial, sans-serif;font-size:13px;line-height:1.4;text-align:left;color:#000000;"
                >
                  <p
                    style="font-family:Arial;font-size:14px;margin-top:0px;margin-bottom:0px;font-weight:normal;color:#000000;"
                  >
                    <a style="text-decoration: none;" target="_blank" href="https://www.amem.com.mx/"
                      ><strong
                        ><span style="color: #000000"><u>Asociación Mexicana para la Educación Médica</u></span></strong
                      ></a
                    >
                  </p>
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" colspan="2" style="font-size:0px;padding:15px 20px;word-break:break-word;">
                <p style="border-top:dashed 3px #BDBDBD;font-size:1;margin:0px auto;width:100%;"></p>
                <!--[if mso | IE]><table align="center" border="0" cellpadding="0" cellspacing="0" style="border-top:dashed 3px #BDBDBD;font-size:1;margin:0px auto;width:560px;" role="presentation" width="560px" ><tr><td style="height:0;line-height:0;"> &nbsp;
        </td></tr></table><![endif]-->
              </td>
            </tr>
            <tr>
              <td align="center" colspan="2">
                <p>Estimado (a) ${body.name ? body.name : ''}</p>
                <p>
                  <br />
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" colspan="2">
                <table border="0" cellspacing="0" cellpadding="0" width="100%" style="text-align: center;">
                  <tbody>
                    <tr>
                      <td width="100%" colspan="2">
                        ${body.text}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" colspan="2">
                <p><br /></p>
                <p>Para cualquier duda o comentario escribanos a</p>
                <p>
                  <a href="mailto:contacto@conectimed.com" data-cke-saved-href="mailto:contacto@conectimed.com"
                    >contacto@conectimed.com</a
                  >&nbsp;donde con gusto le atenderemos.
                </p>
                <p>
                  <br />
                </p>
                <p>
                  En CONECTI<strong>MED</strong>&nbsp;trabajamos todos los días buscando la satisfacción de nuestros
                  usuarios.
                </p>
                <p>
                  <br />
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" colspan="2" style="font-size:0px;padding:15px 20px;word-break:break-word;">
                <p style="border-top:dashed 3px #BDBDBD;font-size:1;margin:0px auto;width:100%;"></p>
                <!--[if mso | IE]><table align="center" border="0" cellpadding="0" cellspacing="0" style="border-top:dashed 3px #BDBDBD;font-size:1;margin:0px auto;width:560px;" role="presentation" width="560px" ><tr><td style="height:0;line-height:0;"> &nbsp;
        </td></tr></table><![endif]-->
              </td>
            </tr>
            <tr>
              <td
                colspan="2"
                style="background-color:transparent;border-bottom:none;border-left:none;border-right:none;border-top:none;vertical-align:top;padding:0 40px;"
              >
                <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                  <tbody>
                    <tr>
                      <td style="font-size:0px;word-break:break-word;">
                        <!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td height="20" style="vertical-align:top;height:20px;"><![endif]-->
                        <div style="height:20px;">&nbsp;</div>
                        <!--[if mso | IE]></td></tr></table><![endif]-->
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="font-size:0px;padding:5px;word-break:break-word;">
                        <!--[if mso | IE]><table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" ><tr><td><![endif]-->
                        <table
                          align="center"
                          border="0"
                          cellpadding="0"
                          cellspacing="0"
                          role="presentation"
                          style="float:none;display:inline-table;"
                        >
                          <tbody>
                            <tr>
                              <td style="padding:0 10px;">
                                <table
                                  border="0"
                                  cellpadding="0"
                                  cellspacing="0"
                                  role="presentation"
                                  style="border-radius:0;width:30px;"
                                >
                                  <tbody>
                                    <tr>
                                      <td style="font-size:0;height:30px;vertical-align:middle;width:30px;">
                                        <a href="" target="_blank"
                                          ><img
                                            height="30"
                                            src="https://app.getresponse.com/images/common/templates/messages/v2/social/facebook4.png"
                                            style="border-radius:0;display:block;"
                                            width="30"
                                        /></a>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <!--[if mso | IE]></td><td><![endif]-->
                        <table
                          align="center"
                          border="0"
                          cellpadding="0"
                          cellspacing="0"
                          role="presentation"
                          style="float:none;display:inline-table;"
                        >
                          <tbody>
                            <tr>
                              <td style="padding:0 10px;">
                                <table
                                  border="0"
                                  cellpadding="0"
                                  cellspacing="0"
                                  role="presentation"
                                  style="border-radius:0;width:30px;"
                                >
                                  <tbody>
                                    <tr>
                                      <td style="font-size:0;height:30px;vertical-align:middle;width:30px;">
                                        <a href="" target="_blank"
                                          ><img
                                            height="30"
                                            src="https://app.getresponse.com/images/common/templates/messages/v2/social/youtube4.png"
                                            style="border-radius:0;display:block;"
                                            width="30"
                                        /></a>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <!--[if mso | IE]></td><td><![endif]-->
                        <table
                          align="center"
                          border="0"
                          cellpadding="0"
                          cellspacing="0"
                          role="presentation"
                          style="float:none;display:inline-table;"
                        >
                          <tbody>
                            <tr>
                              <td style="padding:0 10px;">
                                <table
                                  border="0"
                                  cellpadding="0"
                                  cellspacing="0"
                                  role="presentation"
                                  style="border-radius:0;width:30px;"
                                >
                                  <tbody>
                                    <tr>
                                      <td style="font-size:0;height:30px;vertical-align:middle;width:30px;">
                                        <a href="" target="_blank"
                                          ><img
                                            height="30"
                                            src="https://app.getresponse.com/images/common/templates/messages/v2/social/linkedin4.png"
                                            style="border-radius:0;display:block;"
                                            width="30"
                                        /></a>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <!--[if mso | IE]></td></tr></table><![endif]-->
                      </td>
                    </tr>
                    <tr>
                      <td style="font-size:0px;word-break:break-word;">
                        <!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td height="20" style="vertical-align:top;height:20px;"><![endif]-->
                        <div style="height:20px;">&nbsp;</div>
                        <!--[if mso | IE]></td></tr></table><![endif]-->
                      </td>
                    </tr>
                    <tr>
                      <td
                        align="center"
                        class="gr-footer-xgabce gr-footer-wabdho"
                        style="font-size:0px;padding:0;word-break:break-word;"
                      >
                        <div
                          style="font-family:Sen, Arial, sans-serif;font-size:10px;font-style:normal;line-height:1;text-align:center;text-decoration:none;color:#B3B3B3;"
                        >
                          <div>
                            Calle Chihuahua #46, 10710, Ciudad de México, MX<br /><br />You may
                            <a href="mailto:contacto@conectimed.com">unsubscribe</a>
                            or
                            <a href="mailto:contacto@conectimed.com">change your contact details</a>
                            at any time.
                          </div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style="font-size:0px;word-break:break-word;">
                        <!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td height="20" style="vertical-align:top;height:20px;"><![endif]-->
                        <div style="height:20px;">&nbsp;</div>
                        <!--[if mso | IE]></td></tr></table><![endif]-->
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </body>
  </html>
  `;

    let sendData1 = {
      to: [
        {
          email: body.recipient,
          name: body.name ? body.name : null
        }
      ],
      replyTo: {
        email: 'no-reply@conectimed.com'
      },
      subject: body.subject,
      htmlContent: html
    };

    let sendData2 = {
      to: [
        {
          email: body.recipient,
          name: body.name ? body.name : null
        }
      ],
      replyTo: {
        email: 'no-reply@conectimed.com'
      }
    };

    if (!body.sender) {
      sendData1.sender = {
        name: 'CONECTIMED',
        email: 'notificaciones@conectimed.com.mx'
      };
      sendData2.sender = {
        name: 'CONECTIMED',
        email: 'notificaciones@conectimed.com.mx'
      };
    } else {
      sendData1.sender = {
        name: body.sender.name,
        email: body.sender.email
      };
      sendData2.sender = {
        name: body.sender.name,
        email: body.sender.email
      };
    }

    if (body.cc) {
      sendData1.cc = body.cc;
      sendData2.cc = body.cc;
    }

    if (body.bcc) {
      sendData1.bcc = [
        {
          email: body.bcc
        }
      ];
      sendData2.bcc = [
        {
          email: body.bcc
        }
      ];
    }

    if (body.attach) {
      let arrayAtt = [];
      if (attach.url) {
        arrayAtt.push({
          url: body.attach.url
        });
      } else if (attach.content) {
        arrayAtt.push({
          content: body.attach.content
        });
      }

      sendData1.attachment = arrayAtt;
      sendData2.attachment = arrayAtt;
    }

    var finalData;

    if (body.templateId) {
      sendData2.templateId = body.templateId;
      if (body.params) {
        sendData2.params = body.params;
      }

      sendData2.headers = {
        'X-Mailin-custom':
          'custom_header_1:custom_value_1|custom_header_2:custom_value_2|custom_header_3:custom_value_3',
        charset: 'iso-8859-1'
      };

      finalData = {
        url: mailingURL.value(),
        json: true,
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          'api-key': mailingAPIKey.value()
        },
        data: sendData2
      };
    } else {
      finalData = {
        url: mailingURL.value(),
        json: true,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'api-key': mailingAPIKey.value()
        },
        data: sendData1
      };
    }
    await axios(finalData);
  } catch (error) {
    console.error(error);
  }
  return;
}

async function sendSMS(body) {
  try {
    let smsObj = {
      type: 'transactional',
      sender: body.sender ? body.sender : 'ConectiMED',
      recipient: body.recipient,
      content: body.content
    };
    if (body.tag) {
      smsObj.tag = body.tag;
    }
    if (body.webUrl) {
      smsObj.webUrl = body.webUrl;
    }
    return await sendRequest(
      smsURL.value(),
      {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'api-key': mailingAPIKey.value()
      },
      'POST',
      smsObj
    );
  } catch (error) {
    console.error(error.response);
  }
  return true;
}

async function sendRequest(url, headers, method, data) {
  return await axios({
    url,
    json: true,
    strictSSL: false,
    method,
    headers,
    data
  });
}

async function updateUserBages(userId, count) {
  return admin
    .firestore()
    .collection('users')
    .doc(userId)
    .update({ badges: count });
}

async function getUserBages(userId) {
  var count = 0;
  var badges;
  try {
    const resp = await admin
      .firestore()
      .collection('users')
      .doc(userId)
      .get();
    badges = resp.get('badges');
  } catch (error) {
    console.error(error);
  }
  if (badges) {
    count = Number(badges);
  }
  return count;
}

async function sendNotificationHandler(tokens, title, body, priority, type, data, device, uid) {
  let newCount = 1;
  try {
    const count = await getUserBages(uid);
    if (count) {
      if (device === 'web') {
        newCount = count;
      } else {
        newCount = count + 1;
      }
    }
    updateUserBages(uid, newCount);
  } catch (error) {
    log.error(error);
  }

  const base64 = Buffer.from(data).toString('base64');
  const LINK_WEB = configAppURL.value() + '/notifications/' + type + '/' + base64;

  let payload = {
    message: {
      token: tokens,
      notification: {
        title: title,
        body: body,
        image: configAppIcon.value()
      },
      android: {
        notification: {
          title: title,
          body: body
        },
        data: {
          type: type,
          data: data
        },
        fcm_options: {
          analytics_label: 'push_notification_conectimed_test_label_one'
        }
      },
      webpush: {
        notification: {
          title: title,
          body: body,
          click_action: LINK_WEB
        },
        fcm_options: {
          link: LINK_WEB,
          analytics_label: 'push_notification_conectimed_test_label_one'
        }
      },
      apns: {
        fcm_options: {
          image: configAppIcon.value(),
          analytics_label: 'push_notification_conectimed_test_label_one'
        }
      },
      fcm_options: {
        analytics_label: 'push_notification_conectimed_test_label_one'
      },
      data: {
        type: type,
        data: data
      }
    }
  };
  try {
    console.log("=== MESSAGE ===", JSON.stringify(payload));
    const URL = cloudMessagingURL.value();
    const accessToken = (await getAccessToken()).token;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    };
    const resp = await sendRequest(URL, headers, 'POST', payload);
    return resp.data;
  } catch (error) {
    return error;
  }
}

async function notificationList(title, type, data, uid) {
  try {
    const admin = getFBAdminInstance();
    const db = admin.firestore();

    let route = '';
    let dataDoc = {};
    let description = '';
    let elementId = '';
    const date = new Date();

    switch (type) {
      case 'chat':
        elementId = data;
        break;
      case 'event-send':
        elementId = data;
        break;
      case 'event-updated':
        elementId = data;
        break;
      case 'event-acepted':
        elementId = data;
        break;
      case 'friend-request-acepted':
        route = '/user/details/' + data;
        break;
      case 'friend-request-send':
        route = '/user/details/' + data;
        break;
    }

    dataDoc = {
      date: date,
      uid: uid,
      title: title,
      type: type,
      viewed: false,
      route: route,
      description: description,
      elementId: elementId
    };
    db.collection('notifications').add(dataDoc);
  } catch (error) {
    console.log(error);
  }
  return true;
}

function unique(value, index, self) {
  return self.indexOf(value) === index;
}

/**
 *
 *@param { string [] } array  String arrary
 * @returns { string [] } An array (String) whit posible search keys
 */

function searchArrayHandler(array) {
  let mainArray = [];
  let tempArray = [];
  const minLength = 3;
  for (let item of Array.from(array)) {
    const subArray = String(item).split(' ');
    for (let sub of subArray) {
      mainArray.push(sub);
    }
    mainArray.push(item);
  }

  mainArray = mainArray.filter(unique);

  let _mainArray = [];

  for (let item of mainArray) {
    let texto = item;
    let index = String(texto).indexOf(' ', 0);
    _mainArray.push(texto);
    do {
      if (index > -1) {
        texto = texto.slice(index + 1);
        index = String(texto).indexOf(' ', 0);
        _mainArray.push(texto);
      }
    } while (index > -1);
  }
  mainArray = _mainArray;

  mainArray = mainArray.filter(unique);

  for (let sentence of Array.from(mainArray)) {
    tempArray = tempArray.concat(String(sentence).split(' '));

    for (let i = String(sentence).length; i >= minLength; i--) {
      tempArray = tempArray.concat(String(sentence).substring(0, i));
    }
  }

  tempArray = tempArray.filter(unique);

  tempArray = tempArray.sort((a, b) => {
    return a === b ? 0 : a < b ? -1 : 1;
  });

  return tempArray;
}

/**
 *
 * @param { string } string The raw string
 * @param  { boolean } normalize If set true return the string with out acents
 * @returns a JSON object with one or two keys
 */

function cleanString(string, normalize) {
  let data = {};
  string = string.toLocaleLowerCase().trim();
  string = string.replace(/\s{2,}/g, ' ');
  data.string = string;
  if (normalize === true) {
    data.normalized = string.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
  return data;
}

/**
 *
 * @param { string [] | number []  }items Array (String or Number)
 * @param  { number } current_page the number of the page
 * * @param  { number } per_page_items the number of results per page
 * @returns a JSON paginitation info
 */

function arrayPaginator(items, current_page, per_page_items) {
  let page = current_page || 1,
    per_page = per_page_items || 10,
    offset = (page - 1) * per_page,
    paginatedItems = items.slice(offset).slice(0, per_page_items),
    total_pages = Math.ceil(items.length / per_page);

  return {
    page: page,
    per_page: per_page,
    pre_page: page - 1 ? page - 1 : null,
    next_page: total_pages > page ? page + 1 : null,
    total: items.length,
    total_pages: total_pages,
    data: paginatedItems
  };
}

/**
 *
 * @returns  An Array of specialty JSON Object
 */

function getSpecialties() {
  return Array.from(specialities);
}

/**
 *
 * @param {string} id ID of  specialty
 * @returns  A JSON Object whit specialty
 */

function getSpecialty(id) {
  const array = Array.from(specialities);
  let ret = {};
  const index = array
    .map(e => {
      return String(e.id);
    })
    .indexOf(String(id));
  if (index > -1) {
    ret = array[index];
  }
  return ret;
}

function parser(str) {
  return String(str)
    .replace(/'/g, '')
    .replace(/"/g, '');
}

function parserJSON(obj) {
  const keys = Object.keys(obj);
  let newObj = {};
  for (const key of keys) {
    newObj[key] = parser(obj[key]);
  }
  return obj ? `JSON '${JSON.stringify(newObj)}'` : '{}';
}

function slugify(text) {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

function excerpt(str) {
  return str.replace(/^(.{55}[^\s]*).*/, '$1');
}

function stringSearch(str, whiteSpaces) {
  str = str.trim();
  var noTildes = removeAccents(str);
  let regexp = /[^a-zA-Z0-9]/g;
  if (whiteSpaces === true) {
    regexp = /[^a-zA-Z0-9 ]/g;
  }
  let search = noTildes.replace(regexp, '').toLocaleLowerCase();
  search = search.replace(/^\s+|\s+$|\s+(?=\s)/g, '');
  return search;
}

function removeAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function arraySearch(text) {
  const _searchArray1 = searchArray(text);
  const _searchArray2 = searchArray(text, true);
  let _searchArray = [];
  _searchArray = _searchArray.concat(_searchArray1, _searchArray2);
  _searchArray = _searchArray.filter(unique);
  return _searchArray;
}

function searchArray(text, noSpecial) {
  text = String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  text = String(text).toLowerCase();
  if (noSpecial === true) {
    text = String(text).replace(/[^a-z0-9 ]/gi, '');
  }
  text = String(text).replace(/\s\s+/g, ' ');
  text = String(text).trim();

  let wordArray = [];
  let tempArray = [];
  let afterArray = [];
  let finalArray = [];

  wordArray = text.split(' ');

  if (text.length > minLength) {
    tempArray = getArraySearch(text, minLength);
  }

  /* NEW */
  let reverse = '';
  let afterWithout = text;

  do {
    reverse = String(afterWithout)
      .split('')
      .reverse()
      .join('');
    afterWithout = String(reverse).substr(0, String(reverse).lastIndexOf(' '));
    afterWithout = String(afterWithout)
      .split('')
      .reverse()
      .join('');
    afterArray = afterArray.concat(getArraySearch(afterWithout));
  } while (String(afterWithout).indexOf(' ') > -1);
  /* NEW END */

  finalArray = finalArray.concat(wordArray, tempArray, afterArray);
  finalArray = finalArray.filter(unique);
  return finalArray;
}

function getArraySearch(text, minLength) {
  let array = [];
  for (let i = String(text).length; i > (minLength ? minLength - 1 : 1); i--) {
    array.push(String(text).substring(0, i));
  }
  return array;
}

function capitalizeText(text) {
  let str = text;
  str = String(str).trim();
  str = str.toLocaleLowerCase().trim();
  str = str.replace(/\s{2,}/g, ' ');
  const arr = str.split(' ');
  for (var i = 0; i < arr.length; i++) {
    arr[i] = arr[i].charAt(0).toUpperCase() + arr[i].slice(1);
  }
  const str2 = arr.join(' ');
  return str2;
}

function cleanText(text) {
  let str = text;
  str = String(str).trim();
  str = str.trim();
  str = str.replace(/\s{2,}/g, ' ');
  return str;
}

function filterMetaData(data) {
  let filterMetaData = [];
  let metaData = {
    state1: '',
    state2: '',
    specialty1: '',
    specialty2: '',
    specialty3: '',
    specialty4: '',
    specialty5: ''
  };
  if (data && data.address1 && data.address1.state && data.address1.state !== '') {
    filterMetaData.push(data.address1.state);
    metaData.state1 = data.address1.state;
  }
  if (data && data.address2 && data.address2.state && data.address2.state !== '') {
    filterMetaData.push(data.address2.state);
    metaData.state2 = data.address2.state;
  }
  if (data && data.specialty1) {
    const id = data.specialty1.id;
    if (id) {
      filterMetaData.push(String(id));
      metaData.specialty1 = String(id);
    }
  }
  if (data && data.specialty2) {
    const id = data.specialty2.id;
    if (id) {
      filterMetaData.push(String(id));
      metaData.specialty2 = String(id);
    }
  }
  if (data && data.specialty3) {
    const id = data.specialty3.id;
    if (id) {
      filterMetaData.push(String(id));
      metaData.specialty3 = String(id);
    }
  }
  if (data && data.specialty4) {
    const id = data.specialty4.id;
    if (id) {
      filterMetaData.push(String(id));
      metaData.specialty4 = String(id);
    }
  }
  if (data && data.specialty5) {
    const id = data.specialty5.id;
    if (id) {
      filterMetaData.push(String(id));
      metaData.specialty5 = String(id);
    }
  }
  filterMetaData.push(String(metaData.state1) + metaData.specialty1);
  filterMetaData.push(String(metaData.state1) + metaData.specialty2);
  filterMetaData.push(String(metaData.state1) + metaData.specialty3);
  filterMetaData.push(String(metaData.state1) + metaData.specialty4);
  filterMetaData.push(String(metaData.state1) + metaData.specialty5);
  filterMetaData.push(String(metaData.state2) + metaData.specialty1);
  filterMetaData.push(String(metaData.state2) + metaData.specialty2);
  filterMetaData.push(String(metaData.state2) + metaData.specialty3);
  filterMetaData.push(String(metaData.state2) + metaData.specialty4);
  filterMetaData.push(String(metaData.state2) + metaData.specialty5);
  filterMetaData = filterMetaData.filter(unique);
  return filterMetaData;
}

const runtimeOpts = {
  memory: "8GiB",
  cpu: "gcf_gen1",
  timeoutSeconds: 540,
}

module.exports = {
  decryptBack,
  updateUserSearch,
  getFBAdminInstance,
  stringSearch,
  removeAccents,
  cleanText,
  capitalizeText,
  arraySearch,
  stringSearch,
  excerpt,
  slugify,
  parserJSON,
  parser,
  getSpecialty,
  getSpecialties,
  arrayPaginator,
  cleanString,
  searchArrayHandler,
  unique,
  getFBAdminInstance,
  asyncForEach,
  sendEmail,
  sendRequest,
  sendNotificationHandler,
  notificationList,
  sendSMS,
  getAccessToken,
  isRateLimited,
  filterMetaData,
  runtimeOpts // <-- export runtimeOpts
};