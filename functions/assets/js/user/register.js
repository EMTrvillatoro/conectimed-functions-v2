const { stringSearch, getFBAdminInstance, decryptBack, updateUserSearch } = require('../Tools');
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

        let { email, password, type, data } = req.body;

        email = String(email || "").trim().toLowerCase();

        if (!email || !password) {
            console.warn("Faltan parámetros requeridos");
            return res.status(400).json({ error: "Faltan parámetros requeridos" });
        }

        const resp = await getAuth().createUser({
            email,
            password: decryptBack(password)
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

            const estimatedGraduationTime = data?.estimatedGraduationTime || undefined;
            const studentVerificationFileUrl = data?.studentVerificationFileUrl || undefined;

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
                    status: 'new',
                    type: type || 'medico',
                    updatedAt: FieldValue.serverTimestamp(),
                    newConditionsOfUseAccepted: true
                }

                if (estimatedGraduationTime !== undefined && studentVerificationFileUrl !== null) {
                    _data.estimatedGraduationTime = estimatedGraduationTime;
                    _data.studentVerificationFileUrl = studentVerificationFileUrl;
                }

                transaction.set(userRef, _data, { merge: true });

                // Elimina todas las propiedades de metadata que sean === null
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
            const studentVerificationFileUrl = data?.studentVerificationFileUrl || undefined;

           /*  await db.runTransaction(async (transaction) => {
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

                if (estimatedGraduationTime !== undefined && studentVerificationFileUrl !== null) {
                    _data.estimatedGraduationTime = estimatedGraduationTime;
                    _data.studentVerificationFileUrl = studentVerificationFileUrl;
                }

                transaction.set(userRef, _data, { merge: true });

                // Elimina todas las propiedades de metadata que sean === null
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

            }); */

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