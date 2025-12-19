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
// Email: ZeptoMail
const mailingURL = defineSecret('MAILING_URL');
const mailingAToken = defineSecret('MAILING_TOKEN');

const smsURL = defineSecret('SMS_URL');
const smsUser = defineSecret('SMS_USER');
const smsToken = defineSecret('SMS_TOKEN');
const configAppURL = defineSecret('CONFIGAPP_URL');
const configAppIcon = defineSecret('CONFIGAPP_ICON');
const cloudMessagingURL = defineSecret('CLOUD_MESSAGING_URL');

const axios = require('axios');
const { google } = require('googleapis');
const { SendMailClient } = require("zeptomail");
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

function escapeHtmlToString(html) {
  return html
    .replace(/\\/g, '\\')   // Backslash
    .replace(/"/g, '\"')     // Comillas dobles
    .replace(/\r?\n/g, '\n') // Saltos de línea
    .replace(/\t/g, '\t');   // Tabs
}

async function sendEmail(body) {
  try {
    // -------- Configuración ZeptoMail --------
    const url = mailingURL.value();
    const token = mailingAToken.value();

    const _text = escapeHtmlToString(body.text);


    const html1 = "<div class=\"elem-body\" style=\"background-color:#F6F6F6;\" lang=\"en\" dir=\"auto\"><div style=\"background:#FFFFFF;background-color:#FFFFFF;margin:0px auto;max-width:600px;\"><table align=\"center\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; background: #FFFFFF; background-color: #FFFFFF; width: 100%;\" width=\"100%\" bgcolor=\"#FFFFFF\"><tbody><tr><td style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-bottom: 0 none #E3E3E3; border-left: 1px solid #E3E3E3; border-right: 1px solid #E3E3E3; border-top: 1px solid #E3E3E3; direction: ltr; font-size: 0px; padding: 0 32px; text-align: center;\" align=\"center\"><div class=\"mj-column-per-100 mj-outlook-group-fix\" style=\"font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;\"><table border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" width=\"100%\" style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;\"><tbody><tr><td style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: transparent; border-bottom: none; border-left: none; border-right: none; border-top: none; vertical-align: top; padding: 0;\" bgcolor=\"transparent\" valign=\"top\"><table border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" width=\"100%\" style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;\"><tbody><tr><td style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-size: 0px; word-break: break-word;\"><div style=\"height:20px;line-height:20px;\">&hairsp;<br></div></td></tr><tr><td align=\"center\" class=\"gr-mlimage-jfxauj gr-mlimage-itvddn\" style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-size: 0px; padding: 0; word-break: break-word;\"><table border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" style=\"mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse; border-spacing: 0px;\"><tbody><tr><td style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 94px;\" width=\"94\"><img alt=\"\" src=\"https://us-ms.gr-cdn.com/getresponse-yGxOr/photos/2fb30ebb-8942-4e92-bf23-e24ed9228ae9.png\" style=\"line-height: 100%; -ms-interpolation-mode: bicubic; box-sizing: border-box; border: 0; border-left: 0 none #000000; border-right: 0 none #000000; border-top: 0 none #000000; border-bottom: 0 none #000000; border-radius: 0; display: block; outline: none; text-decoration: none; height: auto; width: 100%; font-size: 13px;\" width=\"94\" height=\"auto\"></td></tr></tbody></table></td></tr><tr><td style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-size: 0px; word-break: break-word;\"><div style=\"height:10px;line-height:10px;\">&hairsp;<br></div></td></tr><tr><td align=\"left\" class=\"gr-mltext-euhkjf gr-mltext-dtmpwx\" style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-size: 0px; padding: 0; word-break: break-word;\"><div style=\"font-family:Ubuntu, Helvetica, Arial, sans-serif;font-size:13px;line-height:1.2;text-align:left;color:#000000;\"><div style=\"text-align: center\"><p style=\"display: block; margin: 0px; font-weight: normal;\"><span class=\"colour\" style=\"color:rgb(0, 0, 0)\"><span class=\"font\" style=\"font-family:Arial\"><span class=\"size\" style=\"font-size: 14px; display: block; margin: 0px; font-weight: normal;\"><span class=\"colour\" style=\"color:rgb(79, 79, 79)\"><b><span class=\"size\" style=\"font-size:16px\"><span class=\"font\" style=\"font-family:Roboto, Arial, sans-serif\">Plataforma de Educación Médica Contínua</span></span></b></span><br></span></span></span></p></div></div></td></tr><tr><td align=\"center\" style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-size: 0px; padding: 10px; word-break: break-word;\"><p style=\"display: block; border-top: 2px solid rgb(119, 119, 119); margin: 0px auto; width: 100%;\"><span class=\"size\" style=\"font-size: 1px; display: block; border-top: 2px solid rgb(119, 119, 119); margin: 0px auto; width: 100%;\"><br></span></p></td></tr></tbody></table></td></tr></tbody></table></div></td></tr></tbody></table></div></div>";
    const html2 = "</td></tr></tbody></table></div></div><div style=\"background:#FFFFFF;background-color:#FFFFFF;margin:0px auto;max-width:600px;\"><table align=\"center\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; background: #FFFFFF; background-color: #FFFFFF; width: 100%;\" width=\"100%\" bgcolor=\"#FFFFFF\"><tbody><tr><td style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-bottom: 1px solid #E3E3E3; border-left: 1px solid #E3E3E3; border-right: 1px solid #E3E3E3; border-top: 0 none #E3E3E3; direction: ltr; font-size: 0px; padding: 0 32px; text-align: center;\" align=\"center\"><div class=\"mj-column-per-100 mj-outlook-group-fix\" style=\"font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;\"><table border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" width=\"100%\" style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;\"><tbody><tr><td style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: transparent; border-bottom: none; border-left: none; border-right: none; border-top: none; vertical-align: top; padding: 0;\" bgcolor=\"transparent\" valign=\"top\"><table border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" width=\"100%\" style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;\"><tbody><tr><td align=\"center\" style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-size: 0px; padding: 10px; word-break: break-word;\"><p style=\"display: block; border-top: 2px solid rgb(119, 119, 119); margin: 0px auto; width: 80%;\"></p></td></tr><tr><td align=\"left\" class=\"gr-mltext-euhkjf gr-mltext-giguff\" style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-size: 0px; padding: 0; word-break: break-word;\"><div style=\"font-family:Ubuntu, Helvetica, Arial, sans-serif;font-size:13px;line-height:2;text-align:left;color:#000000;\"><div style=\"text-align: center\"><p style=\"display: block; margin: 0px; font-weight: normal;\"><span class=\"colour\" style=\"color:rgb(0, 0, 0)\"><span class=\"font\" style=\"font-family:Arial\"><span class=\"size\" style=\"font-size: 14px; display: block; margin: 0px; font-weight: normal;\"><span class=\"colour\" style=\"color:rgb(119, 119, 119)\"><span class=\"size\" style=\"font-size:13px\"><span class=\"font\" style=\"font-family:\" open=\"\" sans\",=\"\" arial,=\"\" sans-serif\"=\"\">Si tiene alguna pregunta o necesita asistencia adicional, no dude en comunicarse con nuestro equipo de soporte, siempre listo para ayudarle.</span></span></span><br></span></span></span></p></div><div style=\"text-align: center\"><p style=\"display: block; margin: 0px; font-weight: normal;\"><span class=\"colour\" style=\"color:rgb(0, 0, 0)\"><span class=\"font\" style=\"font-family:Arial\"><span class=\"size\" style=\"font-size: 14px; display: block; margin: 0px; font-weight: normal;\"><span class=\"size\" style=\"font-size:13px\"><span class=\"font\" style=\"font-family:\" open=\"\" sans\",=\"\" arial,=\"\" sans-serif\"=\"\"><span class=\"colour\" style=\"color:rgb(45, 136, 218)\">contacto@conectimed.com </span><span class=\"colour\" style=\"color:rgb(119, 119, 119)\">donde con gusto le atenderemos.</span></span></span><br></span></span></span></p></div></div></td></tr><tr><td style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-size: 0px; word-break: break-word;\"><div style=\"height:24px;line-height:24px;\">&hairsp;<br></div></td></tr></tbody></table></td></tr></tbody></table></div></td></tr></tbody></table></div><div style=\"background:#828282;background-color:#828282;margin:0px auto;max-width:600px;\"><table align=\"center\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; background: #828282; background-color: #828282; width: 100%;\" width=\"100%\" bgcolor=\"#828282\"><tbody><tr><td style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-bottom: 0 none #000000; border-left: 0 none #000000; border-right: 0 none #000000; border-top: 0 none #000000; direction: ltr; font-size: 0px; padding: 5px; text-align: center;\" align=\"center\"><div class=\"mj-column-per-100 mj-outlook-group-fix\" style=\"font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;\"><table border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" width=\"100%\" style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;\"><tbody><tr><td style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: transparent; border-bottom: none; border-left: none; border-right: none; border-top: none; vertical-align: top; padding: 0;\" bgcolor=\"transparent\" valign=\"top\"><table border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" width=\"100%\" style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;\"><tbody><tr><td align=\"left\" class=\"gr-mltext-euhkjf gr-mltext-wsdrfi\" style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-size: 0px; padding: 10px; word-break: break-word;\"><div style=\"font-family:Ubuntu, Helvetica, Arial, sans-serif;font-size:13px;line-height:1.4;text-align:left;color:#000000;\"><div style=\"text-align: center\"><p style=\"display: block; margin: 0px; font-weight: normal;\"><span class=\"colour\" style=\"color:rgb(0, 0, 0)\"><span class=\"font\" style=\"font-family:Arial\"><span class=\"size\" style=\"font-size: 14px; display: block; margin: 0px; font-weight: normal;\"><span class=\"colour\" style=\"color:rgb(242, 242, 242)\">Síganos en nuestras redes sociales</span><br></span></span></span></p></div></div></td></tr><tr><td align=\"center\" style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-size: 0px; padding: 5px; word-break: break-word;\"><table align=\"center\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; float: none; display: inline-table;\"><tbody><tr class=\"link-id-8c0c8c6943f7\"><td style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; padding: 0 10px; vertical-align: middle;\" valign=\"middle\"><table border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-radius: 0; width: 30px;\" width=\"30\"><tbody><tr><td style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-size: 0; height: 30px; vertical-align: middle; width: 30px;\" width=\"30\" height=\"30\" valign=\"middle\"><a href=\"https://www.facebook.com/conectimed/\" target=\"_blank\"><img alt=\"Visit our Facebook page\" height=\"30\" src=\"https://us-as.gr-cdn.com/images/common/templates/messages/v2/social/facebook7.png\" style=\"border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; border-radius: 0; display: block;\" width=\"30\"></a></td></tr></tbody></table></td></tr></tbody></table><table align=\"center\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; float: none; display: inline-table;\"><tbody><tr class=\"link-id-c418bf71afd1\"><td style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; padding: 0 10px; vertical-align: middle;\" valign=\"middle\"><table border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-radius: 0; width: 30px;\" width=\"30\"><tbody><tr><td style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-size: 0; height: 30px; vertical-align: middle; width: 30px;\" width=\"30\" height=\"30\" valign=\"middle\"><a href=\"https://www.instagram.com/conectimedapp/\" target=\"_blank\"><img alt=\"Visit our Instagram page\" height=\"30\" src=\"https://us-as.gr-cdn.com/images/common/templates/messages/v2/social/instagram7.png\" style=\"border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; border-radius: 0; display: block;\" width=\"30\"></a></td></tr></tbody></table></td></tr></tbody></table><table align=\"center\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; float: none; display: inline-table;\"><tbody><tr class=\"link-id-c29c1d26ba0b\"><td style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; padding: 0 10px; vertical-align: middle;\" valign=\"middle\"><table border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-radius: 0; width: 30px;\" width=\"30\"><tbody><tr><td style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-size: 0; height: 30px; vertical-align: middle; width: 30px;\" width=\"30\" height=\"30\" valign=\"middle\"><a href=\"https://mx.linkedin.com/company/conectimed\" target=\"_blank\"><img alt=\"Visit our LinkedIn page\" height=\"30\" src=\"https://us-as.gr-cdn.com/images/common/templates/messages/v2/social/linkedin7.png\" style=\"border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; border-radius: 0; display: block;\" width=\"30\"></a></td></tr></tbody></table></td></tr></tbody></table><table align=\"center\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; float: none; display: inline-table;\"><tbody><tr class=\"link-id-b83ae4f6d399\"><td style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; padding: 0 10px; vertical-align: middle;\" valign=\"middle\"><table border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-radius: 0; width: 30px;\" width=\"30\"><tbody><tr><td style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-size: 0; height: 30px; vertical-align: middle; width: 30px;\" width=\"30\" height=\"30\" valign=\"middle\"><a href=\"https://www.youtube.com/channel/UClVk1dBhD3Y59ddCPGA_ejg\" target=\"_blank\"><img alt=\"Visit our YouTube page\" height=\"30\" src=\"https://us-as.gr-cdn.com/images/common/templates/messages/v2/social/youtube7.png\" style=\"border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; border-radius: 0; display: block;\" width=\"30\"></a></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></div></td></tr></tbody></table></div><div style=\"margin:0px auto;max-width:600px;\"><table align=\"center\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%;\" width=\"100%\"><tbody><tr><td style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-bottom: 0 none #000000; border-left: 0 none #000000; border-right: 0 none #000000; border-top: 0 none #000000; direction: ltr; font-size: 0px; padding: 0; text-align: center;\" align=\"center\"><div class=\"mj-column-per-100 mj-outlook-group-fix\" style=\"font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;\"><table border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" width=\"100%\" style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;\"><tbody><tr><td style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: transparent; border-bottom: none; border-left: none; border-right: none; border-top: none; vertical-align: top; padding: 0;\" bgcolor=\"transparent\" valign=\"top\"><table border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" width=\"100%\" style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;\"><tbody><tr><td align=\"left\" class=\"gr-mltext-euhkjf gr-mltext-pqfkci\" style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-size: 0px; padding: 0 40px 10px 40px; word-break: break-word;\"><div style=\"font-family:Ubuntu, Helvetica, Arial, sans-serif;font-size:13px;line-height:1.4;text-align:left;color:#000000;\"><div style=\"text-align: center\"><p style=\"display: block; margin: 0px; font-weight: normal;\"><span class=\"colour\" style=\"color:rgb(0, 0, 0)\"><span class=\"font\" style=\"font-family:Arial\"><span class=\"size\" style=\"font-size: 14px; display: block; margin: 0px; font-weight: normal;\"><br></span></span></span></p></div><div style=\"text-align: center\"><p style=\"display: block; margin: 0px; font-weight: normal;\"><span class=\"colour\" style=\"color:rgb(0, 0, 0)\"><span class=\"font\" style=\"font-family:Arial\"><span class=\"size\" style=\"font-size: 14px; display: block; margin: 0px; font-weight: normal;\"><span class=\"size\" style=\"font-size:9px\"><span class=\"font\" style=\"font-family:Arial, sans-serif\">Usted recibió este mail por ser suscriptor de </span></span><a href=\"http://conectimed.com\" style=\"text-decoration: none; color: inherit;\" target=\"_blank\" class=\"link-id-3dc39d1329d1\"><span class=\"colour\" style=\"color:rgb(0, 186, 255)\"><span><span class=\"size\" style=\"font-size:9px\"><span class=\"font\" style=\"font-family:Arial, sans-serif\"><u>Conectimed.</u></span></span></span></span></a><br></span></span></span></p></div><div style=\"text-align: center\"><p style=\"display: block; margin: 0px; font-weight: normal;\"><span class=\"colour\" style=\"color:rgb(0, 0, 0)\"><span class=\"font\" style=\"font-family:Arial\"><span class=\"size\" style=\"font-size: 14px; display: block; margin: 0px; font-weight: normal;\"><span class=\"size\" style=\"font-size:9px\"><span class=\"font\" style=\"font-family:Arial, sans-serif\">Consulte nuestro </span></span><a href=\"https://conectimed.com/privacy-policy/\" style=\"text-decoration: none; color: inherit;\" target=\"_blank\" class=\"link-id-8b2370f3cc12\"><span class=\"colour\" style=\"color:rgb(0, 186, 255)\"><span><span class=\"size\" style=\"font-size:9px\"><span class=\"font\" style=\"font-family:Arial, sans-serif\"><u>Aviso de privacidad</u></span></span></span></span></a><br></span></span></span></p></div></div></td></tr></tbody></table></td></tr></tbody></table></div></td></tr></tbody></table></div><table align=\"center\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%;\" width=\"100%\"><tbody><tr><td style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;\"><div style=\"margin:0px auto;max-width:600px;\"><table align=\"center\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%;\" width=\"100%\"><tbody><tr><td style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-bottom: 0 none #000000; border-left: 0 none #000000; border-right: 0 none #000000; border-top: 0 none #000000; direction: ltr; font-size: 0px; padding: 5px; text-align: center;\" align=\"center\"><div class=\"mj-column-per-100 mj-outlook-group-fix\" style=\"font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;\"><table border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" width=\"100%\" style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;\"><tbody><tr><td style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: transparent; border-bottom: none; border-left: none; border-right: none; border-top: none; vertical-align: top; padding: 0;\" bgcolor=\"transparent\" valign=\"top\"><table border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" width=\"100%\" style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;\"><tbody><tr><td align=\"center\" class=\"gr-footer-nhdnla gr-footer-swgtwg\" style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-size: 0px; padding: 10px 40px; word-break: break-word;\"><div style=\"font-family:Open Sans, Arial, sans-serif;font-size:10px;font-style:normal;line-height:1;text-align:center;text-decoration:none;color:#777777;\"><div>Calle Chihuahua #46, 10710, Ciudad de México, MX <br> <br> You may <a href=\"https://app.getresponse.com/unsubscribe.html?x=a62b&amp;co=E&amp;m=E&amp;mc=JG&amp;u=yGxOr&amp;z=EV52ylE&amp;\" target=\"_blank\" style=\"color: #000000; text-decoration: underline;\">unsubscribe</a> or <a href=\"https://app.getresponse.com/change_details.html?x=a62b&amp;co=E&amp;m=E&amp;u=yGxOr&amp;z=ESOp9AA&amp;\" target=\"_blank\" style=\"color: #000000; text-decoration: underline;\">change your contact details</a> at any time.</div></div></td></tr></tbody></table></td></tr></tbody></table></div></td></tr></tbody></table></div></td></tr></tbody></table><table align=\"center\" style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-family: 'Roboto', Helvetica, sans-serif; font-weight: 400; letter-spacing: .018em; text-align: center; font-size: 10px;\"><tbody><tr><td style=\"border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; padding-bottom: 20px;\"><br></td></tr></tbody></table></div>"

    const _html = html1 +_text+ html2;

    const dataMail = {
      from: {
        address: "no-reply@conectimed.com",
        name: "Conectimed"
      },
      to: [
        {
          email_address: {
            address: body.recipient,
            name: body && body.name ? body.name : "Usuario Conectimed"
          }
        }
      ],
      subject: body && body.subject ? body.subject : "Contacto de Conectimed",
      htmlbody: _html
    };


    // -------- Envío --------
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(dataMail)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Error ZeptoMail:", result);
      throw new Error(
        `ZeptoMail error (${response.status}): ${JSON.stringify(result)}`
      );
    }

    console.log("Email enviado (ZeptoMail) correctamente a:", body.recipient);
    return { _html };

  } catch (error) {
    console.error("sendEmail ZeptoMail error:", error);
    throw error;
  }
}


async function sendSMS(body) {
  try {
    // ---- Construcción del objeto SMS (LabsMobile) ----
    const smsObj = {
      message: body.content,
      unicode: 1,
      tpoa: body.sender ?? "Conectimed",
      recipient: [
        { msisdn: body.recipient }
      ]
    };

    // ---- Configuración LabsMobile ----
    const url = smsURL.value();     // https://api.labsmobile.com/json/send
    const user = smsUser.value();   // usuario / email
    const token = smsToken.value(); // token API

    // ---- Basic Auth ----
    const auth = Buffer.from(`${user}:${token}`).toString("base64");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(smsObj),
    });

    // ---- Manejo de error HTTP ----
    if (!response.ok) {
      const errText = await response.text();
      console.error("SMS service error:", errText);
      throw new Error(`HTTP ${response.status}: ${errText}`);
    }

    // ---- Respuesta JSON de la API ----
    const result = await response.json();
    console.log("SMS sent successfully to:", body.recipient);
    return { ...result, recipient: body.recipient, company: 'LabsMobile' };

  } catch (error) {
    console.error("sendSMS error:", error);
    throw error;
  }
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

function normalizeMxMobile(number) {
  if (!number) return "";

  // Quitar espacios, guiones o símbolos
  let clean = number.replace(/\D/g, "");

  // Si empieza con "52" y NO tiene el "1" después, agregarlo
  if (clean.startsWith("52") && clean[2] !== "1") {
    clean = "521" + clean.slice(2);
  }

  // Asegurar el formato final con +
  return "+" + clean;
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
  normalizeMxMobile,
  escapeHtmlToString,
  runtimeOpts // <-- export runtimeOpts
};