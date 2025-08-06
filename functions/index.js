const { onRequest } = require("firebase-functions/v2/https");
const Stripe = require("stripe");
const { defineSecret } = require('firebase-functions/params');
// ************************* Vars ************************* 
//Stripe
const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');
//Stripe
const clickMeetingApi = defineSecret('CLICK_MEETING_API');
const clickMeetingURLAccount = defineSecret('CLICK_MEETING_URL_ACCOUNT');
const clickMeetingXApiKey = defineSecret('CLICK_MEETING_X_API_KEY');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue, Filter } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const admin = require('firebase-admin');
const XLSX = require('xlsx');
const { parseISO, toDate, format: formatDate, isValid, getTime, format } = require('date-fns');
const { toZonedTime } = require('date-fns-tz');

const runtimeOpts = {
    timeoutSeconds: 540,
    memory: '8GB',
    cors: true
};

// Rate limit en memoria
const rateLimits = new Map();
const MAX_REQUESTS = 10;
const WINDOW_MS = 60 * 1000; // 60 segundos

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

// var serviceAccount = require("./account/conectimed-9d22c-firebase-adminsdk-b27ow-02e6691ac6.json");

initializeApp(
    //     {
    //     credential: admin.credential.cert(serviceAccount),
    //     databaseURL: "https://conectimed-9d22c.firebaseio.com"
    // }
);

const db = getFirestore();

exports.infoDBF = onRequest(runtimeOpts, async (req, res) => {
    // 🔥 Configurar CORS manualmente
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Content-Type", "application/json");

    // Manejar preflight request (CORS OPTIONS)
    if (req.method === "OPTIONS") {
        return res.status(204).send("");
    }

    if (req.method !== "GET") {
        return res.status(405).json({ code: 405, message: `${req.method} Method Not Allowed` });
    }

    try {
        // const db = getFirestore();

        const collections = await db.listCollections();
        //  let colls = [];

        // for (const collectionRef of collections) {
        //     const resp = await collectionRef.limit(10).get();
        //     const schema = {};

        //     for (const doc of resp.docs) {
        //         const data = doc.data();

        //         Object.keys(data).forEach((key) => {
        //             const type = typeof data[key];
        //             if (!schema[key]) {
        //                 schema[key] = type;
        //             }
        //         });

        //         // Obtener subcolecciones dentro del documento
        //         const subcollections = await doc.ref.listCollections();
        //         const schema2 = {};

        //         for (let subCol of subcollections) {
        //             const resp1 = await subCol.get();

        //             for (const subDoc of resp1.docs) {
        //                 const subData = subDoc.data();

        //                 Object.keys(subData).forEach((key) => {
        //                     const type = typeof subData[key];
        //                     if (!schema2[key]) {
        //                         schema2[key] = type;
        //                     }
        //                 });
        //             }
        //         }

        //         schema.subcollections = schema2;
        //     }

        //     colls.push({ collection: collectionRef.id, schema });
        // }

        return res.status(200).json(collections.map(e => e.id));
    } catch (error) {
        console.error("Error obteniendo la información de Firestore", error);
        return res.status(500).json({ code: 500, message: "Internal Server Error", error: error.message });
    }
});

/////////////////////////// STRIPE /////////////////////////////

exports.stripe_customer_create = onRequest(runtimeOpts, async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Content-Type", "application/json");

    const { email, name, uid } = req.body;

    if (req.method === "OPTIONS") {
        return res.status(204).send("");
    }

    if (req.method !== "POST") {
        return res.status(405).json({ code: 405, message: `${req.method} Method Not Allowed` });
    }

    if (!email || !name) {
        return res.status(400).json({ error: "Faltan parámetros requeridos" });
    }

    try {
        // Crear la sesión de pago en Stripe
        const stripe = Stripe(stripeSecretKey.value(), { apiVersion: '2024-04-10' });
        const { id } = await stripe.customers.create({
            email: email,
            name: name,
            metadata: {
                uid: uid
            },
        });
        return res.status(200).json({
            customerId: id,
            env: stripeSecretKey.value().substring(0, 7)
        });
    } catch (error) {
        return res.status(500).json(error);
    }
});

exports.stripe_customer_update = onRequest(runtimeOpts, async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Content-Type", "application/json");

    const { customerId, data } = req.body;

    if (req.method === "OPTIONS") {
        return res.status(204).send("");
    }

    if (req.method !== "POST") {
        return res.status(405).json({ code: 405, message: `${req.method} Method Not Allowed` });
    }

    if (!customerId) {
        return res.status(400).json({ error: "Faltan parámetros requeridos" });
    }

    try {
        // Crear la sesión de pago en Stripe
        const stripe = Stripe(stripeSecretKey.value(), { apiVersion: '2024-04-10' });
        const { id } = await stripe.customers.update(
            customerId,
            {
                email: data.email,
                name: data.name,
                metadata: {
                    uid: data.uid
                },
            });
        return res.status(200).json({
            customerId: id,
            env: stripeSecretKey.value().substring(0, 7)
        });
    } catch (error) {
        return res.status(500).json(error);
    }
});

exports.stripe_customer_retrieve = onRequest(runtimeOpts, async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Content-Type", "application/json");

    const { customerId } = req.body;

    if (req.method === "OPTIONS") {
        return res.status(204).send("");
    }

    if (req.method !== "POST") {
        return res.status(405).json({ code: 405, message: `${req.method} Method Not Allowed` });
    }

    if (!customerId) {
        return res.status(400).json({ error: "Faltan parámetros requeridos" });
    }

    try {
        // Crear la sesión de pago en Stripe
        const stripe = Stripe(stripeSecretKey.value(), { apiVersion: '2024-04-10' });
        const { id } = await stripe.customers.retrieve(customerId);
        return res.status(200).json({
            customerId: id,
            env: stripeSecretKey.value().substring(0, 7)
        });
    } catch (error) {
        return res.status(500).json(error);
    }
});

exports.stripe_customer_delete = onRequest(runtimeOpts, async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Content-Type", "application/json");

    const { customerId } = req.body;

    if (req.method === "OPTIONS") {
        return res.status(204).send("");
    }

    if (req.method !== "POST") {
        return res.status(405).json({ code: 405, message: `${req.method} Method Not Allowed` });
    }

    if (!customerId) {
        return res.status(400).json({ error: "Faltan parámetros requeridos" });
    }

    try {
        // Crear la sesión de pago en Stripe
        const stripe = Stripe(stripeSecretKey.value(), { apiVersion: '2024-04-10' });
        await stripe.customers.del(customerId);
        return res.status(200).json({
            deleted: "ok",
            env: stripeSecretKey.value().substring(0, 7)
        });
    } catch (error) {
        return res.status(500).json(error);
    }
});

exports.stripe_payment_intent = onRequest(runtimeOpts, async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Content-Type", "application/json");

    const { currency, amount, customerId } = req.body;

    if (req.method === "OPTIONS") {
        return res.status(204).send("");
    }

    if (req.method !== "POST") {
        return res.status(405).json({ code: 405, message: `${req.method} Method Not Allowed` });
    }

    if (!amount) {
        return res.status(400).json({ error: "Faltan parámetros requeridos" });
    }

    try {
        // Crear la sesión de pago en Stripe
        const stripe = Stripe(stripeSecretKey.value(), { apiVersion: '2024-04-10' });
        const { id, client_secret } = await stripe.paymentIntents.create({
            amount: amount * 100,  // El monto en centavos
            currency: currency || 'usd', // Moneda, ajusta según corresponda,
            customer: customerId
        });
        return res.status(200).json({
            clientSecret: client_secret,
            paymentIntentId: id,
            env: stripeSecretKey.value().substring(0, 7)
        });
    } catch (error) {
        return res.status(500).json(error);
    }
});

exports.stripe_payment_intent_update = onRequest(runtimeOpts, async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Content-Type", "application/json");

    const { currency, amount, paymentIntentId } = req.body;

    if (req.method === "OPTIONS") {
        return res.status(204).send("");
    }

    if (req.method !== "POST") {
        return res.status(405).json({ code: 405, message: `${req.method} Method Not Allowed` });
    }

    if (!amount || !paymentIntentId) {
        return res.status(400).json({ error: "Faltan parámetros requeridos" });
    }

    try {
        // Crear la sesión de pago en Stripe
        const stripe = Stripe(stripeSecretKey.value(), { apiVersion: '2024-04-10' });
        const { client_secret } = await stripe.paymentIntents.update(paymentIntentId,
            {
                amount: amount * 100,
                currency
            });
        return res.status(200).json({
            clientSecret: client_secret,
            env: stripeSecretKey.value().substring(0, 7)
        });
    } catch (error) {
        return res.status(500).json(error);
    }
});

/////////////////////////// Click Meeting /////////////////////////////

exports.clickMeeting = onRequest(async (req, res) => {
    res.set("Content-Type", "application/json");
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    const _clickMeetingApi = clickMeetingApi.value();
    const _clickMeetingURLAccount = clickMeetingURLAccount.value();
    const _clickMeetingXApiKey = clickMeetingXApiKey.value();
    let callsToCMApi = 0;

    if (req.method === "OPTIONS") {
        return res.status(204).send("");
    }

    let url_alternative_webinar = _clickMeetingURLAccount;

    try {
        let { room } = req.body;
        room = String(room || "").trim();

        const resp = await db.collection("posts").where("video_url", "==", room).limit(1).get();

        if (!resp.empty) {
            const doc = resp.docs[0];
            if (doc.get("url_alternative_webinar")) {
                url_alternative_webinar = doc.get("url_alternative_webinar");
            }
        }
    } catch (e) {
        console.error("Respuesta inválida del firestore", e);
    }

    const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0] || req.socket.remoteAddress || "unknown";

    if (isRateLimited(ip)) {
        console.warn(`Rate limit excedido para IP: ${ip}`);
        return res.status(200).json({
            message: "Demasiadas solicitudes. Intente más tarde.",
            url: url_alternative_webinar,
            status: "error"
        });
    }

    try {
        let { room, email, nickname, forceUpdate } = req.body;

        room = String(room || "").trim();
        email = String(email || "").trim().toLowerCase();
        forceUpdate = Boolean(forceUpdate) || false;

        if (!room || !email) {
            console.warn("Faltan parámetros requeridos");
            return res.status(200).json({
                message: "Faltan parámetros requeridos",
                url: url_alternative_webinar,
                status: "error"
            });
        }

        const userNickname = nickname || "Usuario de Conectimed";

        let roomInfo;

        const headers = {
            "Content-Type": "application/json",
            "X-Api-Key": _clickMeetingXApiKey
        };

        const firebaseRoom = await db.doc(`clickMeetingRoomInfo/${room}`).get();

        if (firebaseRoom.exists === true && forceUpdate !== true) {
            roomInfo = firebaseRoom.data() || {};
        } else {
            const roomInfoResponse = await fetch(`${_clickMeetingApi}conferences/${room}`, {
                method: "GET",
                headers
            });
            callsToCMApi++;

            let roomInfoText = await roomInfoResponse.text();

            try {
                roomInfo = JSON.parse(roomInfoText)?.conference || {};
                let _data = {
                    autologin_hash: roomInfo?.autologin_hash || "",
                    id: roomInfo?.id || "",
                    name: roomInfo?.name || "",
                    name_url: roomInfo?.name_url || "",
                    room_type: roomInfo?.room_type || "",
                    room_pin: roomInfo?.room_pin || "",
                    status: roomInfo?.status || "",
                    timezone: roomInfo?.timezone || "",
                    // DATE STRING
                    created_at: roomInfo?.created_at || "",
                    updated_at: roomInfo?.updated_at || "",
                    starts_at: roomInfo?.starts_at || "",
                    ends_at: roomInfo?.ends_at || "",
                    // DATE TIMESTAMP
                    _created_at: new Date(roomInfo?.created_at || ""),
                    _updated_at: new Date(roomInfo?.updated_at || ""),
                    _starts_at: new Date(roomInfo?.starts_at || ""),
                    _ends_at: new Date(roomInfo?.ends_at || ""),
                };
                await db.doc(`clickMeetingRoomInfo/${room}`).set(_data);
            } catch (e) {
                console.error("Respuesta inválida del servidor (room info no es JSON)", e);
                return res.status(200).json({
                    message: "Respuesta inválida del servidor (room info no es JSON) ",
                    url: url_alternative_webinar,
                    status: "error"
                });
            }
        }

        if (!roomInfo?.name_url) {
            console.warn("No se encontró la sala o falta name_url");
            return res.status(200).json({
                message: "No se encontró la sala o falta name_url",
                url: url_alternative_webinar,
                status: "error"
            });
        }

        const name_url = roomInfo.name_url;

        const autologinUrl = `${_clickMeetingApi}conferences/${room}/room/autologin_hash?email=${encodeURIComponent(email)}&nickname=${encodeURIComponent(userNickname)}`;
        const autologinResponse = await fetch(autologinUrl, {
            method: "POST",
            headers
        });

        callsToCMApi++;

        console.info("====== Response autologin_hash ======", autologinResponse);

        const autologinText = await autologinResponse.text();

        let autologinData;
        try {
            autologinData = JSON.parse(autologinText);
        } catch (e) {
            console.error("Respuesta inválida del servidor (autologin no es JSON)", e);
            return res.status(200).json({
                message: "Respuesta inválida del servidor (autologin no es JSON)",
                url: url_alternative_webinar,
                status: "error"
            });
        }

        if (!autologinData?.autologin_hash) {
            console.warn("No se pudo obtener autologin_hash");
            return res.status(200).json({
                message: "No se pudo obtener autologin_hash",
                url: url_alternative_webinar,
                status: "error"
            });
        }

        const autologin_hash = autologinData.autologin_hash;
        const finalUrl = `${_clickMeetingURLAccount}${name_url}?l=${autologin_hash}&skipPlatformChoice=1`;

        console.log("*** Correcto ***", JSON.stringify({ finalUrl, room, email, nickname }));

        return res.status(200).json({
            message: "Acceso exitoso",
            url: finalUrl,
            url_alternative: url_alternative_webinar,
            callsToCMApi,
            status: "success"
        });

    } catch (e) {
        console.error("Error en clickMeeting:", e);
        return res.status(200).json({
            message: e.message || "Error desconocido",
            url: url_alternative_webinar,
            status: "error"
        });
    }
});

/////////////////////////// Validated Users /////////////////////////////

exports.getValidatedUsers = onRequest({
    memory: "8GiB",
    cpu: "gcf_gen1",
    timeoutSeconds: 540,
}, async (req, res) => {
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

exports.userAppRegister = onRequest(runtimeOpts, async (req, res) => {
    res.set("Content-Type", "application/json");
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        return res.status(204).send("");
    }

    if (req.method !== "POST") {
        return res.status(405).json({ code: 405, message: `${req.method} Method Not Allowed` });
    }

    try {

        let { email, password, type, data } = req.body;

        email = String(email || "").trim().toLowerCase();

        if (!email || !password) {
            console.warn("Faltan parámetros requeridos");
            return res.status(400).json({ error: "Faltan parámetros requeridos" });
        }

        const resp = await getAuth().createUser({
            email,
            password
        });

        if (resp && resp.uid && resp.email) {
            //DATOS DEL USUARIO
            const nameStr = stringSearch(`${data?.lastName1 || ''} ${data?.lastName2 || ''} ${data?.name || ''}`, true);
            let name = String(data?.name || '').trim().replace(/\s{2,}/g, ' ');
            let lastName1 = String(data?.lastName1 || '').trim().replace(/\s{2,}/g, ' ');
            let lastName2 = String(data?.lastName2 || '').trim().replace(/\s{2,}/g, ' ');
            name = String(name).toLocaleLowerCase().replace(/\w\S*/g, w => w.replace(/^\w/, c => c.toUpperCase()));
            lastName1 = String(lastName1).toLocaleLowerCase().replace(/\w\S*/g, w => w.replace(/^\w/, c => c.toUpperCase()));
            lastName2 = String(lastName2).toLocaleLowerCase().replace(/\w\S*/g, w => w.replace(/^\w/, c => c.toUpperCase()));
            const mobile = String(`${String(data?.mobileLada || '').trim()}${String(data?.mobile || '').trim()}`);
            // Guardar el usuario en Firestore usando una transacción
            const userRef = db.collection("users").doc(resp.uid);

            await db.runTransaction(async (transaction) => {
                transaction.set(userRef, {
                    uid: resp.uid,
                    uuid: resp.uid,
                    avatar: {},
                    createdAt: FieldValue.serverTimestamp(),
                    email: resp.email,
                    lastName1,
                    lastName2,
                    mobile,
                    mobileLada: {
                        number: String(data?.mobile || '').trim(),
                        lada: String(data?.mobileLada || '').trim(),
                        country: data?.phoneCountry || ''
                    },
                    name,
                    nameStr,
                    firstCharacter: nameStr.charAt(0) || '',
                    phone: '',
                    search: [],
                    status: 'new',
                    type: type || 'medico',
                    updatedAt: FieldValue.serverTimestamp(),
                    newConditionsOfUseAccepted: true
                });
            });

            // Obtener custom token para el usuario
            const token = await getAuth().createCustomToken(resp.uid);

            return res.status(200).json({
                status: "success",
                message: "Usuario creado exitosamente",
                user: {
                    uid: resp.uid,
                    email: resp.email
                },
                token // Devuelve el token para que pueda logearse
            });

        } else {
            return res.status(400).json({
                status: "error",
                message: "No se pudo crear el usuario",
                error: resp
            });
        }

    } catch (e) {
        console.error("Error en userAppRegister:", e);
        return res.status(200).json({
            message: e.message || "Error desconocido",
            code: e.code || "unknown_error",
            status: "error"
        });
    }
});

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