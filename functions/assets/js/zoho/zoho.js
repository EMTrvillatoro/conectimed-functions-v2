const { getFBAdminInstance, capitalizeText, normalizeMxMobile, sendRequest } = require('../Tools');
const { defineSecret } = require('firebase-functions/params');
const { FieldValue } = require('firebase-admin/firestore');
const zohoIntegrationURL = defineSecret('ZOHO_INTEGRATION_URL');
const batchSize = 25;
/*
    firebase deploy --only functions:zohoExportRequest
    firebase deploy --only functions:zohoExportmarkAllUsersPendingRequest
    firebase deploy --only functions:zohoExportPaginationTrigger
    firebase deploy --only functions:zohoExportScheduled
*/

/**
 * 
 * @returns a JSON success object
 */

async function processUsersToZohoHandler() {
    const admin = getFBAdminInstance();
    const db = admin.firestore();
    let total = 0;

    // ============================================================
    // 1. OBTENER EL ÚLTIMO PIVOTE (si existe)
    // ============================================================
    const pivotQuery = await db
        .collection("validated-user-data-pivot")
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();

    let startAfterSnapshot = null;

    if (!pivotQuery.empty) {
        const pivotDoc = pivotQuery.docs[0];
        const pivotId = pivotDoc.get("pivot");

        if (pivotId) {
            const pivotRef = db.doc(`validated-user-data/${pivotId}`);
            const pivotSnap = await pivotRef.get();

            if (pivotSnap.exists) {
                startAfterSnapshot = pivotSnap;
            }
        }
    }

    // ============================================================
    // 2. ARMAR QUERY BASE
    // ============================================================
    let query = db
        .collection("validated-user-data")
        .where("zoho_migration_status", "==", "pending")
        //.where("dateOfCreation", ">=", new Date("2000-01-01"))
        .orderBy("dateOfCreation", "asc")
        .limit(batchSize);

    if (startAfterSnapshot) {
        query = query.startAfter(startAfterSnapshot);
    }

    // ============================================================
    // 3. EJECUTAR CONSULTA
    // ============================================================
    const snapshot = await query.get();

    // Si ya no hay documentos → FIN
    if (snapshot.empty) {
        console.log("No hay más documentos por procesar.");
        return {
            status: "finished",
            message: "No hay más usuarios pendientes para exportar."
        };
    }

    // ============================================================
    // 4. PROCESAR DOCUMENTOS
    // ============================================================
    const users = snapshot.docs.map((e) => {
        const ID = e.id;
        const DATA = e.data() || {};

        return {
            // IDENTIDAD
            "First_Name": String(capitalizeText(String(DATA.firstName || '') + " " + String(DATA.secondName || ''))).trim(),
            "Last_Name": String(capitalizeText(String(DATA.lastName1 || '') + " " + String(DATA.lastName2 || ''))).trim() || "-",
            "Email": DATA && DATA.email ? String(DATA.email).trim().toLocaleLowerCase() : '',
            "Mobile": DATA && DATA.mobile ? normalizeMxMobile(String(DATA.mobile).trim()) : '',
            "ID_Usuario": ID,
            // UBICACIÓN / DIRECCIÓN
            "Mailing_Street": String((DATA && DATA.address1 && DATA.address1.street ? String(capitalizeText(DATA.address1.street)).trim() : '') + ' ' + (DATA && DATA.address1 && DATA.address1.outsideNumber ? String(capitalizeText(DATA.address1.outsideNumber)).trim() : '')).trim(),
            "Mailing_City": (DATA && DATA.address1 && DATA.address1.city ? String(capitalizeText(DATA.address1.city)).trim() : ''),
            "Mailing_State": (DATA && DATA.address1 && DATA.address1.state ? String(capitalizeText(DATA.address1.state)).trim() : ''),
            "Mailing_Zip": (DATA && DATA.address1 && DATA.address1.postalCode ? String(capitalizeText(DATA.address1.postalCode)).trim() : ''),
            "Mailing_Country": "Mexico",
            // PROFESIÓN / DATOS MÉDICOS
            "Tipo_de_usuario": DATA && DATA.metaType ? String(DATA.metaType).trim() : '',
            "Especialidad": (DATA && DATA.specialty1 && DATA.specialty1.specialtyName ? String(capitalizeText(DATA.specialty1.specialtyName)).trim() : ''),
            "reas_de_inter_s": DATA && DATA.personalInterests ? Array.from(DATA.personalInterests) : [],
            "Tipo_de_profesional_OPS": DATA && DATA.metaType === 'Otros profesionales de la salud' ? (DATA && DATA.whyIsNotMedic ? String(DATA.whyIsNotMedic).trim() : '') : '',
            "C_dula_profesional": DATA && DATA.cedula ? String(DATA.cedula).trim() : '',
            "C_dula_profesional_especialidad": (DATA && DATA.specialty1 && DATA.specialty1.cedula ? String(capitalizeText(DATA.specialty1.cedula)).trim() : ''),
            "Tiempo_restante_para_titulaci_n": DATA && DATA.estimatedGraduationTime ? String(DATA.estimatedGraduationTime).trim() : '',
            // VALIDACIONES ACADÉMICAS / DOCUMENTACIÓN
            "URL_documento_validador_academico": DATA && DATA.verificationFileUrl ? String(DATA.verificationFileUrl).trim() : '',
            "Verificado_para_distribuci_n": "verdadero",
            // REGISTRO / ORIGEN
            "Medio_de_Registro": "Conectimed",
            "Tipo_de_Contacto": "Plataformas",
            "Fecha_de_registro": DATA && DATA.dateOfCreation ? new Date(DATA.dateOfCreation.toDate()).toISOString().split('T')[0] : '',
            // METADATA / OTROS
            "Description": DATA && DATA.notes ? String(DATA.notes).trim() : ''
        };
    });

    // ============================================================
    // 5. ENVIAR A ZOHO
    // ============================================================
    try {
        users.forEach(u => console.log("Procesado:", u.ID_Usuario));
        await saveToZoho(users);
        console.log(`Exportadas ${users.length} filas.`);
        total += users.length;

    } catch (err) {
        console.error("Error enviando a Zoho:", err);
        throw err;
    }

    // ============================================================
    // 🔥 6. ACTUALIZAR DOCUMENTOS A "complete"
    // ============================================================
    try {
        const batch = db.batch();

        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { zoho_migration_status: "complete" });
        });

        await batch.commit();
        console.log("Batch actualizado: todos marcados como 'complete'.");
    } catch (error) {
        console.log("========= Error en batch =========", error);
    }

    // ============================================================
    // 7. GUARDAR NUEVO PIVOTE
    // ============================================================
    const lastProcessedDoc = snapshot.docs[snapshot.docs.length - 1];

    await db.collection("validated-user-data-pivot").add({
        pivot: lastProcessedDoc.id,
        createdAt: FieldValue.serverTimestamp(),
        total,
        status: "pending"
    });

    // ============================================================
    // 8. ACTUALIZAR EL PIVOTE ANTERIOR A "complete"
    // ============================================================
    if (!pivotQuery.empty) {
        const previousPivotRef = pivotQuery.docs[0].ref;
        await previousPivotRef.update({
            status: "complete"
        });
    }

    return {
        status: "success",
        exported: users.length,
        lastPivot: lastProcessedDoc.id
    };
}

/**
 * 
 * @param { import('express').Request } req 
 * @param { import('express').Response } res 
 * @returns 
 */

async function _onRequest(req, res) {
    res.header('Content-Type', 'application/json');
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(204).send('');
    }
    if (req && req.method === 'GET') {
        const resp = await processUsersToZohoHandler();
        return res.status(200).json({ status: 'Success', data: resp, message: 'Exportación iniciada' });
    } else {
        return res.status(405).json({ code: 405, message: `${req.method} Method Not Allowed` });
    }
}

/**
 * 
 * @param { import('express').Request } req 
 * @param { import('express').Response } res 
 * @returns 
 */

async function _onRequest_2(req, res) {
    res.header('Content-Type', 'application/json');
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(204).send('');
    }

    if (req && req.method === 'GET') {

        // ================================
        // 🔥 OBTENER action DEL QUERY
        // ================================
        const action = req.query.action;

        // ================================
        // PASAR action A setZohoStatusForAllUsers
        // ================================
        await setZohoStatusForAllUsers(action);

        return res.status(200).json({ status: 'Success' });
    } else {
        return res.status(405).json({ code: 405, message: `${req.method} Method Not Allowed` });
    }
}


/**
 * @param {import('firebase-functions/v2/firestore').FirestoreEvent<
 *          import('firebase-functions/v2/firestore').Change<
 *              import('firebase-admin').firestore.DocumentData
 *          >
 *       >} event
 * @returns {Promise<boolean|Error>}
 */

async function _onDocumentWritten(event) {
    try {
        const beforeData = event.data?.before?.data() || null;
        const afterData = event.data?.after?.data() || null;

        // Si no hay datos (borrado o error), salir
        if (!afterData) return;

        // Solo ejecutar si status === "pending"
        // Y además evitar re-ejecutar si ya era pending antes
        const wasPending = beforeData?.status === "pending";
        const isPending = afterData?.status === "pending";

        if (!isPending || wasPending) {
            console.log("Ignorado: no es un nuevo estado pending.");
            return;
        }

        console.log("Pivote pending detectado:", event.params.pivotId);

        // Ejecutar su proceso principal
        await processUsersToZohoHandler();
    } catch (error) {
        console.log(error);
        return error;
    }
    return true;
};

/**
 * 
 *@param { any [] } results  users results array
 * @returns Response from Zoho API
 */

async function saveToZoho(results) {
    const response = await sendRequest(zohoIntegrationURL.value(), { "Content-Type": "application/json" }, 'POST', { data: results });
    return { code: response && response.data && response.data.code ? response.data.code : 'undefined', data: response && response.data ? response.data : [] };
}

/**
 * 
 * @param {import("firebase-functions/v2/scheduler").ScheduledEvent} event
 */

async function _onSchedule(event) {
    console.log(event && event.jobName ? event.jobName : 'processUsersToZohoHandler_onSchedule')
    return await processUsersToZohoHandler();
}

/**
 * 
 * @returns void
 */

async function setZohoStatusForAllUsers(action) {
    const admin = getFBAdminInstance();
    const db = admin.firestore();
    const statusValue = action || "pending";

    const snapshot = await db.collection("validated-user-data").get();
    if (snapshot.empty) {
        console.log("No hay documentos para actualizar.");
        return;
    }

    const batch = db.batch();

    snapshot.forEach(doc => {
        batch.update(doc.ref, {
            zoho_migration_status: statusValue
        });
    });

    await batch.commit();
    console.log(`Batch completado: todos los usuarios marcados como ${statusValue}.`);
}

module.exports = {
    _onRequest,
    _onRequest_2,
    _onDocumentWritten,
    _onSchedule
};