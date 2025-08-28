const { onRequest } = require("firebase-functions/v2/https");
const functions = require('firebase-functions');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const admin = require('firebase-admin');
const XLSX = require('xlsx');
const { parseISO, toDate, format: formatDate, isValid, getTime, format } = require('date-fns');
const { toZonedTime } = require('date-fns-tz');
// files
const { sendEmail, runtimeOpts } = require('./assets/js/Tools');
const { stripeCustomerCreateHandler, stripeCustomerDeleteHandler, stripeCustomerRetrieveHandler, stripeCustomerUpdateHandler, stripePaymentIntentHandler, stripePaymentIntentUpdateHandler } = require('./assets/js/stripe/stripe');
const { infoDBFHandler } = require('./assets/js/experimental/experimental');
const { clickMeetingHandler } = require('./assets/js/click-meeting/click-meeting');
const { registerHandler } = require('./assets/js/user/register');
const { generatePDFHandler } = require('./assets/js/pdf/pdf');
const { generateHtmlCertificateHandler } = require('./assets/js/pdf/html');

// functions
exports.infoDBF = onRequest(runtimeOpts, async (req, res) => await infoDBFHandler(req, res));
/////////////////////////// STRIPE /////////////////////////////
exports.stripe_customer_create = onRequest(async (req, res) => await stripeCustomerCreateHandler(req, res));
exports.stripe_customer_update = onRequest(runtimeOpts, async (req, res) => await stripeCustomerUpdateHandler(req, res));
exports.stripe_customer_retrieve = onRequest(runtimeOpts, async (req, res) => await stripeCustomerRetrieveHandler(req, res));
exports.stripe_customer_delete = onRequest(runtimeOpts, async (req, res) => await stripeCustomerDeleteHandler(req, res));
exports.stripe_payment_intent = onRequest(runtimeOpts, async (req, res) => await stripePaymentIntentHandler(req, res));
exports.stripe_payment_intent_update = onRequest(runtimeOpts, async (req, res) => await stripePaymentIntentUpdateHandler(req, res));
/////////////////////////// Click Meeting /////////////////////////////
exports.clickMeeting = onRequest(async (req, res) => await clickMeetingHandler(req, res));
/////////////////////////// Validated Users /////////////////////////////
exports.getValidatedUsers = onRequest(runtimeOpts, async (req, res) => {
    res.set('Content-Type', 'application/json');
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.status(204).send('');
    }
    const bucket = admin.storage().bucket();

    if (req.method === 'POST') {
        try {
            let name = "";
            let { type, start, end, fields, timeZone } = req.body;

            type = type || 'medicos';
            fields = fields || [];
            let startDate = start ? parseISO(start) : undefined;
            let endDate = end ? parseISO(end) : undefined;
            timeZone = timeZone ? String(timeZone) : 'America/Mexico_City'; // 'America/Mexico_City' || '-06:00'


            let startDateStr = undefined;
            let endDateStr = undefined;

            if (!fields || fields.length === 0) {
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

            fields = [
                { value: 'uid', label: 'UID' },
                { value: 'email', label: 'Email' },
                ...fields
            ];

            const RESP = await saveAndGetData();

            let formattedUsers = [];
            const countReasons = (array) => {
                return array.reduce((acc, obj) => {
                    const reason = obj.whyIsNotMedic;
                    acc[reason] = (acc[reason] || 0) + 1;
                    return acc;
                }, {});
            };
            let users = [];
            if (startDate && endDate) {
                const _startDate = startDate && isValid(startDate)
                    ? toDate(formatDate(toZonedTime(startDate, timeZone), 'yyyy-MM-dd'))
                    : undefined;

                // Ajustar _endDate para incluir el final del día (23:59:59.999)
                const _endDate = endDate && isValid(endDate)
                    ? (() => {
                        const d = toDate(formatDate(toZonedTime(endDate, timeZone), 'yyyy-MM-dd'));
                        d.setHours(23, 59, 59, 999);
                        return d;
                    })()
                    : undefined;

                // Obtener fechas en milisegundos
                const startDateMs = _startDate ? _startDate.getTime() : undefined;
                const endDateMs = _endDate ? _endDate.getTime() : undefined;

                startDateStr = _startDate ? formatDate(_startDate, 'yyyy-MM-dd') : undefined;
                endDateStr = _endDate ? formatDate(_endDate, 'yyyy-MM-dd') : undefined;

                users = RESP.filter((item) => {
                    const _dateOfCreation = toZonedTime(item._dateOfCreation, timeZone).getTime();
                    const dateOfCreation = Number(_dateOfCreation);
                    return startDateMs <= dateOfCreation && endDateMs >= dateOfCreation;
                });

            } else {
                users = RESP;
            }

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



            if (startDateStr && endDateStr) {
                name = `${name}-${startDateStr}-${endDateStr}`;
            } else {
                name = `${name}_todos`;
            }

            for (let item of usersValidated) {
                let formatDATA = {};
                let fechaDeRegistro = '';
                let fechaDeValidacion = '';

                try {
                    if (item && item?.dateOfCreation) {
                        fechaDeRegistro = format(toZonedTime(toDate(item.dateOfCreation), timeZone), 'yyyy-MM-dd HH:mm:ss');
                    }
                } catch (e) {
                    console.error(e);
                }

                try {
                    if (item && item?.dateOfValidation) {
                        fechaDeValidacion = format(toZonedTime(toDate(item.dateOfValidation), timeZone), 'yyyy-MM-dd HH:mm:ss');
                    }
                } catch (e) {
                    console.error(e);
                }

                let allFields = {
                    'uid': item?.id || '',
                    'email': item?.email || '',
                    'fullName': item?.fullName || '',
                    'firstName': item?.firstName || '',
                    'secondName': item?.secondName || '',
                    'lastName1': item?.lastName1 || '',
                    'lastName2': item?.lastName2 || '',
                    'dateOfCreation': fechaDeRegistro,
                    '_dateOfCreation': item?._dateOfCreation || 0,
                    'dateOfValidation': fechaDeValidacion,
                    '_dateOfValidation': item?._dateOfValidation || 0,
                    'mobile': item?.mobile || '',
                    'notes': item?.notes || '',
                    'title': item?.title === 'dr' ? 'Dr.' : (item?.title === 'dra' ? 'Dra.' : ''),
                    'whyIsNotMedic': item?.whyIsNotMedic || '',
                    // specialty1
                    'specialty1.specialtyName': item?.specialty1?.specialtyName || '',
                    'specialty1.specialty': item?.specialty1?.specialty || '',
                    'specialty1.cedula': item?.specialty1?.cedula || '',
                    'specialty1.validCedula': item?.specialty1 && Boolean(item.specialty1.validCedula) === true ? 'Sí' : 'No',
                    'specialty1.yearOfRegistration': item?.specialty1?.yearOfRegistration || '',
                    // specialty2
                    'specialty2.specialtyName': item?.specialty2?.specialtyName || '',
                    'specialty2.specialty': item?.specialty2?.specialty || '',
                    'specialty2.cedula': item?.specialty2?.cedula || '',
                    'specialty2.validCedula': item?.specialty2 && Boolean(item.specialty2.validCedula) === true ? 'Sí' : 'No',
                    'specialty2.yearOfRegistration': item?.specialty2?.yearOfRegistration || '',
                    // specialty3
                    'specialty3.specialtyName': item?.specialty3?.specialtyName || '',
                    'specialty3.specialty': item?.specialty3?.specialty || '',
                    'specialty3.cedula': item?.specialty3?.cedula || '',
                    'specialty3.validCedula': item?.specialty3 && Boolean(item.specialty3.validCedula) === true ? 'Sí' : 'No',
                    'specialty3.yearOfRegistration': item?.specialty3?.yearOfRegistration || '',
                    // specialty4
                    'specialty4.specialtyName': item?.specialty4?.specialtyName || '',
                    'specialty4.specialty': item?.specialty4?.specialty || '',
                    'specialty4.cedula': item?.specialty4?.cedula || '',
                    'specialty4.validCedula': item?.specialty4 && Boolean(item.specialty4.validCedula) === true ? 'Sí' : 'No',
                    'specialty4.yearOfRegistration': item?.specialty4?.yearOfRegistration || '',
                    // specialty5
                    'specialty5.specialtyName': item?.specialty5?.specialtyName || '',
                    'specialty5.specialty': item?.specialty5?.specialty || '',
                    'specialty5.cedula': item?.specialty5?.cedula || '',
                    'specialty5.validCedula': item?.specialty5 && Boolean(item.specialty5.validCedula) === true ? 'Sí' : 'No',
                    'specialty5.yearOfRegistration': item?.specialty5?.yearOfRegistration || '',
                    // address1
                    'address1.city': item?.address1?.city || '',
                    'address1.colony': item?.address1?.colony || '',
                    'address1.delegation': item?.address1?.delegation || '',
                    'address1.hospital': item?.address1?.hospital || '',
                    'address1.interiorNumber': item?.address1?.interiorNumber || '',
                    'address1.outsideNumber': item?.address1?.outsideNumber || '',
                    'address1.postalCode': item?.address1?.postalCode || '',
                    'address1.remarksAddress': item?.address1?.remarksAddress || '',
                    'address1.state': item?.address1?.state || '',
                    'address1.street': item?.address1?.street || '',
                    'address1.tower': item?.address1?.tower || '',
                    'address1.typeOfVia': item?.address1?.typeOfVia || '',
                    // address2
                    'address2.city': item?.address2?.city || '',
                    'address2.colony': item?.address2?.colony || '',
                    'address2.delegation': item?.address2?.delegation || '',
                    'address2.hospital': item?.address2?.hospital || '',
                    'address2.interiorNumber': item?.address2?.interiorNumber || '',
                    'address2.outsideNumber': item?.address2?.outsideNumber || '',
                    'address2.postalCode': item?.address2?.postalCode || '',
                    'address2.remarksAddress': item?.address2?.remarksAddress || '',
                    'address2.state': item?.address2?.state || '',
                    'address2.street': item?.address2?.street || '',
                    'address2.tower': item?.address2?.tower || '',
                    'address2.typeOfVia': item?.address2?.typeOfVia || '',
                }

                for (let field of fields) {
                    formatDATA[field.label] = allFields[field.value];
                }
                formattedUsers.push(formatDATA);
            }

            const buffer = getExcelBuffer(formattedUsers);
            const fileName = `validated-users-reports/${name}.xlsx`;
            const file = bucket.file(fileName);
            await file.save(buffer, {
                metadata: {
                    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                },
            });
            const dataCounters = {
                countersNoMedicos: counters,
                medicosTotales: MEDICOS.length,
                date: format(toZonedTime(toDate(new Date()), timeZone), 'yyyy-MM-dd HH:mm:ss'),
                fileName: fileName
            };
            return res.status(200).send(dataCounters);
        } catch (e) {
            console.error('Error capturado', e);
            return res.status(500).send(e);
        }
    } else {
        return res.status(405).send({ code: 405, message: `${req.method} Method Not Allowed` });
    }
});

async function saveAndGetData() {
    try {
        const db = getFirestore();
        const bucket = admin.storage().bucket();
        const operationDate = FieldValue.serverTimestamp();
        const _fileName = 'validated-users-reports/all-validated-users.json';
        const exist = await bucket.file(_fileName).exists();

        if (exist[0]) {
            // si existe, se obtiene y actualiza
            const respRecord1 = await db.collection('validated-user-data-update-record').orderBy('date', 'desc').limit(1).get();
            let lastDateRecord;
            if (!respRecord1.empty) {
                lastDateRecord = respRecord1.docs[0].get('date');
            } else {
                const respCreationRecord = await db.collection('validated-user-data-update-record').add({
                    date: operationDate
                });
                const respRecord2 = await respCreationRecord.get();
                lastDateRecord = respRecord2.get('date');
            }

            let collRef = db.collection('validated-user-data');
            let query = collRef;

            query = query.where('dateOfCreation', '>=', lastDateRecord.toDate())

            query = query.orderBy('dateOfCreation', 'desc');

            const RESP = await query.get();

            if (!RESP.empty) {
                // si hay datos nuevos, se actualiza el archivo
                let users = RESP.docs.map(e => mapRawUserDoc(e));
                console.log("USERS: ", users);


                // Obtener el archivo JSON existente en el bucket
                const file = bucket.file(_fileName);
                const [contents] = await file.download();
                const existingUsers = JSON.parse(contents.toString('utf-8'));

                const newUserIds = new Set(users.map(u => u.id));
                const combinedUsers = [
                    ...existingUsers.filter(u => !newUserIds.has(u.id)),
                    ...users
                ];

                const sorted = combinedUsers.sort((a, b) => (b._dateOfCreation || 0) - (a._dateOfCreation || 0));

                const buffer = jsonToBuffer(sorted);

                await file.save(buffer, {
                    metadata: {
                        contentType: 'application/json',
                    },
                });

                await db.collection('validated-user-data-update-record').add({
                    date: operationDate
                });

            } else {
                console.log("No hay datos nuevos para actualizar el archivo JSON.");
            }

        } else {
            // si no existe, se crea
            let collRef = db.collection('validated-user-data');
            let query = collRef;

            query = query.orderBy('dateOfCreation', 'desc');
            const RESP = await query.get();

            let users = RESP.docs.map(e => mapRawUserDoc(e));

            const buffer = jsonToBuffer(users);
            const file = bucket.file(_fileName);
            await file.save(buffer, {
                metadata: {
                    contentType: 'application/json',
                },
            });
            await db.collection('validated-user-data-update-record').add({
                date: operationDate
            });
        }

        const file = bucket.file(_fileName);
        const [contents] = await file.download();
        const existingUsers = JSON.parse(contents.toString('utf-8'));

        const sorted = existingUsers.sort((a, b) => (b._dateOfCreation || 0) - (a._dateOfCreation || 0));

        return sorted;

    } catch (error) {
        console.error(error);
        return []
    }
}
function getExcelBuffer(formattedUsers) {
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
function jsonToBuffer(data) {
    try {
        const jsonString = JSON.stringify(data, null, 2); // con indentación opcional
        const buffer = Buffer.from(jsonString, "utf-8");
        return buffer;
    } catch (error) {
        console.error("Error convirtiendo JSON a Buffer:", error);
        return {};
    }
}
function mapRawUserDoc(e) {
    const DATA = e.data();
    const ID = e.id;

    try {
        DATA._dateOfCreation = getTime(DATA.dateOfCreation.toDate());
        DATA.dateOfCreation = format(DATA.dateOfCreation.toDate(), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
    } catch (e) {
        console.error(`Error al convertir dateOfCreation a fecha (${ID})`, e);
    }

    try {
        DATA._dateOfValidation = getTime(DATA.dateOfValidation.toDate());
        DATA.dateOfValidation = format(DATA.dateOfValidation.toDate(), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
    } catch (e) {
        console.error(`Error al convertir dateOfValidation a fecha (${ID})`, e);
    }

    return { id: ID, ...DATA };
}
/// User Creation Function Auth and Firebase
exports.userAppRegister = onRequest(runtimeOpts, async (req, res) => await registerHandler(req, res));
/******Sección de Miguel******/

/************función getAllAuthUsers*************/
exports.getAllAuthUsers = onRequest(runtimeOpts, async (req, res) => {
    res.header('Content-Type', 'application/json');
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.status(204).send('');
    }
    try {
        let { pageToken } = req.body;
        console.log(`pageToken: ${pageToken}`)
        const _resp = await listAllUsers(pageToken);
        return res.status(200).json(_resp);
    } catch (e) {
        console.error('Error capturado', e);
        return res.status(500).json(e);
    }
});

/***********función listAllUsers*************/
async function listAllUsers(pageToken) {
    try {
        return await admin.auth().listUsers(500, pageToken);
    } catch (e) {
        console.log("***** ERROR ", e);
        return [];
    }
}

/******** función sendMail ****************/
exports.sendMail = async (data, context) => {
    const body = data;
    //destructuring del objeto body
    const { recipient, bcc, cc } = body
    // console.log(JSON.stringify(body));
    // Authentication / user information is automatically added to the request.
    if (context.auth && context.auth.uid) {
        if (!recipient) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'El valor recipient es requerido para el envío de correos'
            );
        }
        await sendEmail(body);

        return {
            sucess: true,
            message: `Email successfully sent to ${recipient} ${bcc ? bcc : ''} ${cc ? cc : ''}`
        };
    } else {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated');
    }
};

/******* función generateHtmlCertificate ******/
exports.generateHtmlCertificate = onRequest(runtimeOpts, async (req, res) => await generateHtmlCertificateHandler(req, res));

/*************función generatePDF*******************/
exports.generatePDF = onRequest(runtimeOpts, async (req, res) => await generatePDFHandler(req, res));