const { stringSearch, getFBAdminInstance, decryptBack, updateUserSearch, filterMetaData } = require('../Tools');
const { FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

/**
 * 
 * @param { import('express').Request } req 
 * @param { import('express').Response } res 
 * @returns 
 */

async function registerHandler(req, res) {
    res.set("Content-Type", "application/json");
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    const admin = getFBAdminInstance();

    const db = admin.firestore();

    if (req.method === "OPTIONS") {
        return res.status(204).send("");
    }

    if (req.method !== "POST") {
        return res.status(405).json({ code: 405, message: `${req.method} Method Not Allowed` });
    }

    try {

        const data = req.body;

        const email = String(data?.email || "").trim().toLowerCase();
        const password = decryptBack(data?.password);

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
            const userMetaRef = db.collection("medico-meta").doc(resp.uid);

            await db.runTransaction(async (transaction) => {

                let address1 = {
                    city: data.city,
                    colony: data.colony,
                    delegation: data.delegation,
                    hospital: '',
                    interiorNumber: '',
                    outsideNumber: '',
                    postalCode: data.postal_code,
                    state: data.state,
                    strState: stringSearch(data.state),
                    street: '',
                    tower: ''
                }

                let metadata = {
                    address1,
                    specialty1: { id: null, cedula: null }
                }

                const search = await updateUserSearch({ name, lastName1, lastName2, email: resp.email }, metadata);
                const _filterMetaData = filterMetaData(metadata);

                let _data = {
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
                    personalInterests: data?.personalInterests || [],
                    newRegistration: true,
                    search: search || [],
                    'filter-meta-data': _filterMetaData || [],
                    status: 'new',
                    type: data?.type || 'medico',
                    updatedAt: FieldValue.serverTimestamp(),
                    metaType: data?.metaType,
                    validatedStatus: 'pending',
                    newConditionsOfUseAccepted: true
                }

                switch (data?.metaType) {
                    case 'medico-en-formacion':
                        _data.verificationFileUrl = data.verificationFileUrl;
                        _data.estimatedGraduationTime = data.estimatedGraduationTime;
                        break;
                    case 'profesional-de-la-salud':
                        _data.educationalLevel = data.educationalLevel;
                        if (_data.educationalLevel === 'estudiante') {
                            _data.verificationFileUrl = data.verificationFileUrl;
                            _data.estimatedGraduationTime = data.estimatedGraduationTime
                        } else if (_data.educationalLevel === 'tecnico') {
                            _data.verificationFileUrl = data.verificationFileUrl;
                        }
                        break;
                }
                console.log("=== ===== ==== === === === === ==== ===", _data);
                transaction.set(userRef, _data, { merge: true });

                // Elimina todas las propiedades de metadata que sean === null
                Object.keys(metadata).forEach(key => {
                    if (metadata[key] == null) {
                        delete metadata[key];
                    }
                });

                let _metaData = metadata;

                if (data?.metaType === 'medico' || (data?.metaType === 'profesional-de-la-salud' && data && data.educationalLevel === 'universitario')) {
                    _metaData.cedula = data.cedula;
                }

                transaction.set(userMetaRef, _metaData, { merge: true });
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

}

/**
 * 
 * @param { import('express').Request } req 
 * @param { import('express').Response } res 
 * @returns 
 */

async function updateHandler(req, res) {
    res.set("Content-Type", "application/json");
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    const admin = getFBAdminInstance();

    const db = admin.firestore();

    if (req.method === "OPTIONS") {
        return res.status(204).send("");
    }

    if (req.method !== "PUT") {
        return res.status(405).json({ code: 405, message: `${req.method} Method Not Allowed` });
    }

    try {

        let { type, data, uid } = req.body;

        if (!uid) {
            console.warn("Faltan parámetros requeridos");
            return res.status(400).json({ error: "Faltan parámetros requeridos" });
        }

        if (resp && resp.uid && resp.email) {
            //DATOS DEL USUARIO
            const nameStr = stringSearch(`${data?.lastName1 || ''} ${data?.lastName2 || ''} ${data?.name || ''}`, true);
            let name = String(data?.name || '').trim().replace(/\s{2,}/g, ' ');
            let lastName1 = String(data?.lastName1 || '').trim().replace(/\s{2,}/g, ' ');
            let lastName2 = String(data?.lastName2 || '').trim().replace(/\s{2,}/g, ' ');
            name = String(name).toLocaleLowerCase().replace(/\w\S*/g, w => w.replace(/^\w/, c => c.toUpperCase()));
            lastName1 = String(lastName1).toLocaleLowerCase().replace(/\w\S*/g, w => w.replace(/^\w/, c => c.toUpperCase()));
            lastName2 = String(lastName2).toLocaleLowerCase().replace(/\w\S*/g, w => w.replace(/^\w/, c => c.toUpperCase()));

            // Guardar el usuario en Firestore usando una transacción
            const userRef = db.collection("users").doc(resp.uid);
            const userMetaRef = db.collection("medico-meta").doc(resp.uid);

            const estimatedGraduationTime = data?.estimatedGraduationTime || undefined;
            const verificationFileUrl = data?.verificationFileUrl || undefined;

            await db.runTransaction(async (transaction) => {
                let metadata = {
                    specialty1: data?.specialty1 || null,
                    specialty2: data?.specialty2 || null,
                    specialty3: data?.specialty3 || null,
                    specialty4: data?.specialty4 || null,
                    specialty5: data?.specialty5 || null
                }

                const search = await updateUserSearch({ name, lastName1, lastName2, email: resp.email }, metadata);

                let _data = {
                    personalInterests: data?.personalInterests || [],
                    search: search || [],
                    updatedAt: FieldValue.serverTimestamp(),
                }

                if (estimatedGraduationTime !== undefined && verificationFileUrl !== null) {
                    _data.estimatedGraduationTime = estimatedGraduationTime;
                    _data.verificationFileUrl = verificationFileUrl;
                }

                transaction.set(userRef, _data, { merge: true });

                //Elimina todas las propiedades de metadata que sean === null

                Object.keys(metadata).forEach(key => {
                    if (metadata[key] == null) {
                        delete metadata[key];
                    }
                });

                transaction.set(userMetaRef, {
                    ...metadata,
                    cedulaProfesional: data?.cedula || '',
                    address1: data?.address1 || {},
                }, { merge: true });

            });

            // Obtener custom token para el usuario

            return res.status(200).json({
                status: "success",
                message: "Usuario creado exitosamente",
                user: {
                    uid: resp.uid,
                    email: resp.email
                }
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

}

module.exports = { registerHandler, updateHandler };