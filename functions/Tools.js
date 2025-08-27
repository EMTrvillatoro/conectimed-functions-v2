const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

const ctmCryptSecretKey = defineSecret('CTM_CRYPT_SECRET_KEY');
const ctmCryptIvLength = defineSecret('CTM_CRYPT_IV_LENGTH');
const minLength = 3;

const databaseURL = defineSecret('CONFIGFB_DATABASE_URL');
const CERT = defineSecret('CONFIGFB_ADMIN_CREDENTIAL_CERT');

// FIREBASE
const clientEmail = defineSecret('CONFIGFB_CLIENT_EMAIL');
const storageBucket = defineSecret('CONFIGFB_STORAGE_BUCKET');
const databaseName = defineSecret('CONFIGFB_DATABASE_NAME');


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

module.exports = { decryptBack, updateUserSearch, getFBAdminInstance, stringSearch, removeAccents };