const functions = require('firebase-functions');
const Tools = require('../Tools');
const admin = Tools.getFBAdminInstance();
const db = admin.firestore();
const storage = admin.storage();
const bucket = storage.bucket();
const moment = require('moment');
const path = require('path');

const XLSX = require('xlsx');

exports.handler = async function (request, response) {
  response.header('Content-Type', 'application/json');
  response.header('Access-Control-Allow-Origin', '*');
  response.header('Access-Control-Allow-Headers', 'Content-Type');
  const Tools = require('../Tools');
  const admin = Tools.getFBAdminInstance();
  const db = admin.firestore();
  if (request.method === 'OPTIONS') {
    return response.status(204).send('');
  }
  try {
    // const decodedToken = await admin.auth().verifyIdToken(request.body.token);
    if (request.body.users) {
      const userData = request.body.users;
      var auth = [];
      //Crear usuarios en Auth
      for (let i = 0; i < userData.length; i++) {
        let resp;
        try {
          resp = await admin.auth().createUser({ email: userData[i].email, password: randomChain(8) });
        } catch (error) {
          console.error(error);
        }
        auth.push({
          email: String(userData[i].email).toLocaleLowerCase(),
          uid: resp && resp.uid ? resp.uid : undefined,
          data: resp && resp.uid ? userData[i] : undefined,
          created: resp && resp.uid ? true : false
        });
      }
      //Crear usuarios en Firestore
      for (let i = 0; i < auth.length; i++) {
        if (auth[i].created === true) {
          const data = {
            uid: auth[i].uid,
            avatar: auth[i].data.avatar,
            wp_id: auth[i].data.wp_id,
            createdAt: auth[i].data.createdAt,
            email: auth[i].data.email,
            lastName1: auth[i].data.lastName1,
            lastName2: auth[i].data.lastName2,
            mobile: auth[i].data.mobile,
            name: auth[i].data.name,
            nameStr: auth[i].data.nameStr,
            phone: auth[i].data.phone,
            search: auth[i].data.search,
            type: auth[i].data.type,
            status: 'active',
            updatedAt: auth[i].data.updatedAt
          };
          try {
            await db
              .collection('users')
              .doc(data.uid)
              .set(data);
          } catch (error) {
            console.error(error);
          }
          if (data.type === 'representante-medico') {
            let metaData = auth[i]['data']['meta-data'];
            try {
              const _company = await db.doc(metaData.company).get();
              metaData.company = _company.ref;
              try {
                await db
                  .collection('users')
                  .doc(data.uid)
                  .update({
                    'filter-meta-data': [_company.id]
                  });
              } catch (error) {
                console.error(error);
              }
            } catch (error) {
              console.error(error);
            }
            try {
              await db
                .collection('representante-meta')
                .doc(data.uid)
                .set(metaData);
            } catch (error) {
              console.error(error);
            }
          } else {
            const metaData = auth[i]['data']['meta-data'];
            try {
              await db
                .collection('medico-meta')
                .doc(data.uid)
                .set(metaData);
            } catch (error) {
              console.error(error);
            }
          }
        }
      }
      return response.status(200).send(auth);
    } else {
      return response.status(401).send({ message: 'Usuario no válido' });
    }
  } catch (e) {
    console.error('Error capturado', e);
    return response.status(500).send(e);
  }
};

exports.handlerOnlyAuth = async (data, context) => {
  const Tools = require('../Tools');
  const admin = Tools.getFBAdminInstance();
  if (context.auth && context.auth.uid) {
    try {
      if (data && data.email && data.password) {
        return await admin.auth().createUser({ email: data.email, password: data.password });
      } else {
        throw new functions.https.HttpsError('missing parameters', 'missing parameters (email or password)');
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

function randomChain(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

async function listAllUsers(pageToken) {
  const Tools = require('../Tools');
  const admin = Tools.getFBAdminInstance();
  try {
    return await admin.auth().listUsers(500, pageToken);
  } catch (e) {
    return [];
  }
}

exports.handlerGetAllAuthUsers = async function (request, response) {
  response.header('Content-Type', 'application/json');
  response.header('Access-Control-Allow-Origin', '*');
  response.header('Access-Control-Allow-Headers', 'Content-Type');
  if (request.method === 'OPTIONS') {
    return response.status(204).send('');
  }
  try {
    console.log(`pageToken: ${request.body.pageToken}`)
    const _resp = await listAllUsers(request.body.pageToken);
    return response.status(200).send(_resp);
  } catch (e) {
    console.error('Error capturado', e);
    return response.status(500).send(e);
  }
};

/**
 * Request Contacts
 * @param {functions.https.Request} request - Https Request.
 * @param {functions.Response<any>} response - Response Any.
 * @returns {Promise<functions.Response<any>>}  Any
 */

exports.handlerGetValidatedUsers = async function (request, response) {
  response.header('Content-Type', 'application/json');
  response.header('Access-Control-Allow-Origin', '*');
  response.header('Access-Control-Allow-Headers', 'Content-Type');
  if (request.method === 'OPTIONS') {
    return response.status(204).send('');
  }
  if (request && request.method === 'POST') {
    try {
      let name = "";
      const type = request && request.body && request.body.type ? request.body.type : 'medicos';
      const startDate = request && request.body && request.body.start ? moment(request.body.start).toDate() : undefined;
      const endDate = request && request.body && request.body.end ? moment(request.body.end).toDate() : undefined;
      let fields = request && request.body && request.body.fields ? request.body.fields : [];

      if (!!!fields || fields.length === 0) {
        if (type === 'medicos') {
          fields = [
            { value: 'fullName', label: 'Nombre Completo' },
            { value: 'title', label: 'Título' },
            { value: 'dateOfCreation', label: 'Fecha de Registro' },
            { value: 'dateOfValidation', label: 'Fecha de Validación' },
            { value: 'firstName', label: 'Primer Nombre' },
            { value: 'secondName', label: 'Segundo Nombre' },
            { value: 'lastName1', label: 'Primer Apellido' },
            { value: 'lastName2', label: 'Segundo Apellido' },
            { value: 'address1.city', label: 'Ciudad' },
            { value: 'address1.state', label: 'Estado' },
            { value: 'address1.postalCode', label: 'Código Postal' },
            { value: 'mobile', label: 'Teléfono Móvil' },
            { value: 'specialty1.specialtyName', label: 'Especialidad 1' },
            { value: 'specialty1.cedula', label: 'Cédula 1' },
            { value: 'specialty2.specialtyName', label: 'Especialidad 2' },
            { value: 'specialty2.cedula', label: 'Cédula 2' },
            { value: 'specialty3.specialtyName', label: 'Especialidad 3' },
            { value: 'specialty3.cedula', label: 'Cédula 3' },
            { value: 'specialty4.specialtyName', label: 'Especialidad 4' },
            { value: 'specialty4.cedula', label: 'Cédula 4' },
            { value: 'specialty5.specialtyName', label: 'Especialidad 5' },
            { value: 'specialty5.cedula', label: 'Cédula 5' }
          ];
        } else {
          fields = [
            { value: 'fullName', label: 'Nombre Completo' },
            { value: 'title', label: 'Título' },
            { value: 'dateOfCreation', label: 'Fecha de Registro' },
            { value: 'dateOfValidation', label: 'Fecha de Validación' },
            { value: 'firstName', label: 'Primer Nombre' },
            { value: 'secondName', label: 'Segundo Nombre' },
            { value: 'lastName1', label: 'Primer Apellido' },
            { value: 'lastName2', label: 'Segundo Apellido' },
            { value: 'address1.city', label: 'Ciudad' },
            { value: 'address1.state', label: 'Estado' },
            { value: 'address1.postalCode', label: 'Código Postal' },
            { value: 'mobile', label: 'Teléfono Móvil' },
            { value: "whyIsNotMedic", label: "¿Por qué no es Médico?" }
          ];
        }
      }

      fields = Array.from([]).concat([
        { value: 'uid', label: 'UID' },
        { value: 'email', label: 'Email' }
      ], fields);

      let collRef = db.collection('validated-user-data');
      let query;
      query = collRef;

      if (startDate && endDate) {
        query = query.where('dateOfCreation', '<=', endDate)
        query = query.where('dateOfCreation', '>=', startDate)
      }
      query = query.orderBy('dateOfCreation', 'desc');
      const RESP = await query.get();

      let formattedUsers = [];
      const countReasons = (array) => {
        return array.reduce((acc, obj) => {
          const reason = obj.whyIsNotMedic;
          acc[reason] = (acc[reason] || 0) + 1;
          return acc;
        }, {});
      };

      let users = RESP.docs.map(e => {
        const DATA = e.data();
        const ID = e.id;
        return { id: ID, ...DATA };
      });

      const MEDICOS = users.filter(e => e.isMedic === true);
      const NO_MEDICOS = users.filter(e => e.isMedic !== true);
      const counters = countReasons(NO_MEDICOS);

      let usersValidated;

      if (type === 'medicos') {
        usersValidated = MEDICOS;
        name = "medicos_validados";
      } else {
        usersValidated = NO_MEDICOS;
        name = "no_medicos_validados";
      }

      if (startDate && endDate) {
        name = `${name}-${moment(startDate).format('YYYY-MM-DD')}-${moment(endDate).format('YYYY-MM-DD')}`;
      } else {
        name = `${name}_todos`;
      }

      for (let item of usersValidated) {
        let formatDATA = {};
        let fechaDeRegistro = '';
        let fechaDeValidacion = '';

        try {
          fechaDeRegistro = item && item.dateOfCreation ? moment(item.dateOfCreation.toDate()).format('YYYY-MM-DD HH:mm:ss') : '';
        } catch (e) {
          console.error(e);
        }

        try {
          fechaDeValidacion = item && item.dateOfValidation ? moment(item.dateOfValidation.toDate()).format('YYYY-MM-DD HH:mm:ss') : '';
        } catch (e) {
          console.error(e);
        }

        let allFields = {
          'uid': item && item.id ? item.id : '',
          'email': item && item.email ? item.email : '',
          'fullName': item && item.fullName ? item.fullName : '',
          'firstName': item && item.firstName ? item.firstName : '',
          'secondName': item && item.secondName ? item.secondName : '',
          'lastName1': item && item.lastName1 ? item.lastName1 : '',
          'lastName2': item && item.lastName2 ? item.lastName2 : '',
          'dateOfCreation': fechaDeRegistro,
          'dateOfValidation': fechaDeValidacion,
          'mobile': item && item.mobile ? item.mobile : '',
          'notes': item && item.notes ? item.notes : '',
          'title': item && item.title && item.title === 'dr' ? 'Dr.' : (item && item.title && item.title === 'dra' ? 'Dra.' : ''),
          'whyIsNotMedic': item && item.whyIsNotMedic ? item.whyIsNotMedic : '',
          // specialty1
          'specialty1.specialtyName': item && item.specialty1 && item.specialty1.specialtyName ? item.specialty1.specialtyName : '',
          'specialty1.specialty': item && item.specialty1 && item.specialty1.specialty ? item.specialty1.specialty : '',
          'specialty1.cedula': item && item.specialty1 && item.specialty1.cedula ? item.specialty1.cedula : '',
          'specialty1.validCedula': item && item.specialty1 && Boolean(item.specialty1.validCedula) === true ? 'Sí' : 'No',
          'specialty1.yearOfRegistration': item && item.specialty1 && item.specialty1.yearOfRegistration ? item.specialty1.yearOfRegistration : '',
          // specialty2
          'specialty2.specialtyName': item && item.specialty2 && item.specialty2.specialtyName ? item.specialty2.specialtyName : '',
          'specialty2.specialty': item && item.specialty2 && item.specialty2.specialty ? item.specialty2.specialty : '',
          'specialty2.cedula': item && item.specialty2 && item.specialty2.cedula ? item.specialty2.cedula : '',
          'specialty2.validCedula': item && item.specialty2 && Boolean(item.specialty2.validCedula) === true ? 'Sí' : 'No',
          'specialty2.yearOfRegistration': item && item.specialty2 && item.specialty2.yearOfRegistration ? item.specialty2.yearOfRegistration : '',
          // specialty3
          'specialty3.specialtyName': item && item.specialty3 && item.specialty3.specialtyName ? item.specialty3.specialtyName : '',
          'specialty3.specialty': item && item.specialty3 && item.specialty3.specialty ? item.specialty3.specialty : '',
          'specialty3.cedula': item && item.specialty3 && item.specialty3.cedula ? item.specialty3.cedula : '',
          'specialty3.validCedula': item && item.specialty3 && Boolean(item.specialty3.validCedula) === true ? 'Sí' : 'No',
          'specialty3.yearOfRegistration': item && item.specialty3 && item.specialty3.yearOfRegistration ? item.specialty3.yearOfRegistration : '',
          // specialty4
          'specialty4.specialtyName': item && item.specialty4 && item.specialty4.specialtyName ? item.specialty4.specialtyName : '',
          'specialty4.specialty': item && item.specialty4 && item.specialty4.specialty ? item.specialty4.specialty : '',
          'specialty4.cedula': item && item.specialty4 && item.specialty4.cedula ? item.specialty4.cedula : '',
          'specialty4.validCedula': item && item.specialty4 && Boolean(item.specialty4.validCedula) === true ? 'Sí' : 'No',
          'specialty4.yearOfRegistration': item && item.specialty4 && item.specialty4.yearOfRegistration ? item.specialty4.yearOfRegistration : '',
          // specialty5
          'specialty5.specialtyName': item && item.specialty5 && item.specialty5.specialtyName ? item.specialty5.specialtyName : '',
          'specialty5.specialty': item && item.specialty5 && item.specialty5.specialty ? item.specialty5.specialty : '',
          'specialty5.cedula': item && item.specialty5 && item.specialty5.cedula ? item.specialty5.cedula : '',
          'specialty5.validCedula': item && item.specialty5 && Boolean(item.specialty5.validCedula) === true ? 'Sí' : 'No',
          'specialty5.yearOfRegistration': item && item.specialty5 && item.specialty5.yearOfRegistration ? item.specialty5.yearOfRegistration : '',
          // address1
          'address1.city': item && item.address1 && item.address1.city ? item.address1.city : '',
          'address1.colony': item && item.address1 && item.address1.colony ? item.address1.colony : '',
          'address1.delegation': item && item.address1 && item.address1.delegation ? item.address1.delegation : '',
          'address1.hospital': item && item.address1 && item.address1.hospital ? item.address1.hospital : '',
          'address1.interiorNumber': item && item.address1 && item.address1.interiorNumber ? item.address1.interiorNumber : '',
          'address1.outsideNumber': item && item.address1 && item.address1.outsideNumber ? item.address1.outsideNumber : '',
          'address1.postalCode': item && item.address1 && item.address1.postalCode ? item.address1.postalCode : '',
          'address1.remarksAddress': item && item.address1 && item.address1.remarksAddress ? item.address1.remarksAddress : '',
          'address1.state': item && item.address1 && item.address1.state ? item.address1.state : '',
          'address1.street': item && item.address1 && item.address1.street ? item.address1.street : '',
          'address1.tower': item && item.address1 && item.address1.tower ? item.address1.tower : '',
          'address1.typeOfVia': item && item.address1 && item.address1.typeOfVia ? item.address1.typeOfVia : '',
          // address2
          'address2.city': item && item.address2 && item.address2.city ? item.address2.city : '',
          'address2.colony': item && item.address2 && item.address2.colony ? item.address2.colony : '',
          'address2.delegation': item && item.address2 && item.address2.delegation ? item.address2.delegation : '',
          'address2.hospital': item && item.address2 && item.address2.hospital ? item.address2.hospital : '',
          'address2.interiorNumber': item && item.address2 && item.address2.interiorNumber ? item.address2.interiorNumber : '',
          'address2.outsideNumber': item && item.address2 && item.address2.outsideNumber ? item.address2.outsideNumber : '',
          'address2.postalCode': item && item.address2 && item.address2.postalCode ? item.address2.postalCode : '',
          'address2.remarksAddress': item && item.address2 && item.address2.remarksAddress ? item.address2.remarksAddress : '',
          'address2.state': item && item.address2 && item.address2.state ? item.address2.state : '',
          'address2.street': item && item.address2 && item.address2.street ? item.address2.street : '',
          'address2.tower': item && item.address2 && item.address2.tower ? item.address2.tower : '',
          'address2.typeOfVia': item && item.address2 && item.address2.typeOfVia ? item.address2.typeOfVia : '',
        }

        for (let field of fields) {
          formatDATA[field.label] = allFields[field.value];
        }

        formattedUsers.push(formatDATA);
      }
      const buffer = download(formattedUsers);
      const fileName = `validated-users-reports/${name}.xlsx`;
      const file = bucket.file(fileName);
      await file.save(buffer, {
        metadata: {
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      });
      const dataCounters = { countersNoMedicos: counters, medicosTotales: MEDICOS.length, date: admin.firestore.FieldValue.serverTimestamp(), fileName: fileName };
      return response.status(200).send(dataCounters);
    } catch (e) {
      console.error('Error capturado', e);
      return response.status(500).send(e);
    }
  } else {
    return response.status(405).send({ code: 405, message: `${request.method} Method Not Allowed` });
  }
};

function download(formattedUsers) {
  try {
    let wb = XLSX.utils.book_new();
    const aoa_to_sheet = [];
    let ws = XLSX.utils.aoa_to_sheet(aoa_to_sheet);
    XLSX.utils.sheet_add_json(ws, formattedUsers, { origin: -1 });
    XLSX.utils.book_append_sheet(wb, ws, String('Hoja 1').substring(0, 25));
    return XLSX.write(wb, { type: "buffer" });
  } catch (error) {
    console.error(error);
    return {}
  }
}

exports.onRun_usersInValidation = async function () {
  try {
    console.log(`'*** onRun_usersInValidation | ${moment().toDate()} ***`);
    await usersInValidation();
    return true;
  } catch (error) {
    console.error(error);
    return error;
  }
};


async function usersInValidation() {
  try {
    const now = moment().subtract(10, "minutes").toDate();
    console.log("=== NOW ===", now);
    const resp = await db.collection('users-in-validation').where('date', '<=', now).orderBy('date', 'desc').get();
    console.log(resp.docs.map(e=>e.data()));
    for (let user of resp.docs) {
      await user.ref.delete();
    }
    return true;
  } catch (e) {
    console.error(e);
    return e;
  }
}


/**
 * Request Contacts
 * @param {functions.https.Request} request - Https Request.
 * @param {functions.Response<any>} response - Response Any.
 * @returns {Promise<functions.Response<any>>}  Any
 */

exports.usersInValidation = async function (request, response) {
  response.header('Content-Type', 'application/json');
  response.header('Access-Control-Allow-Origin', '*');
  response.header('Access-Control-Allow-Headers', 'Content-Type');
  if (request.method === 'OPTIONS') {
    return response.status(204).send('');
  }
  if (request && request.method === 'GET') {
    try {
      await usersInValidation();
      return response.status(200).send({ success: true });
    } catch (e) {
      console.error('Error capturado', e);
      return response.status(500).send(e);
    }
  } else {
    return response.status(405).send({ code: 405, message: `${request.method} Method Not Allowed` });
  }
};
