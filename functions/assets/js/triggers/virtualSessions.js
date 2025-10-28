const { defineSecret } = require('firebase-functions/params');
const { FieldPath } = require('firebase-admin/firestore');
const { BigQuery } = require("@google-cloud/bigquery");
const { getFBAdminInstance } = require('../Tools');

const databaseName = defineSecret('CONFIGFB_DATABASE_NAME');
const datasetId = "Posts";
const tableId = "sesiones_virtuales_assistance";


async function exportAssistanceToBigQueryHandler(batchSize = 500) {
    const bigquery = new BigQuery({
        projectId: databaseName.value()
    });

    const admin = getFBAdminInstance();
    const db = admin.firestore();

    console.log("Iniciando exportación de Firestore → BigQuery...");

    let lastDoc = null;
    let total = 0;
    let hasMore = true;

    const dataset = bigquery.dataset(datasetId);
    const table = dataset.table(tableId);

    while (hasMore) {
        // 1. Consulta Firestore con paginación
        let query = db.collectionGroup("assistance").orderBy(FieldPath.documentId()).limit(batchSize);
        if (lastDoc) query = query.startAfter(lastDoc);

        const snapshot = await query.get();
        if (snapshot.empty) break;

        const rows = [];

        snapshot.docs.forEach((doc) => {
            const data = doc.data();
            const assistance = data.assistance ?? null;
            const date = data.date ? data.date.toDate().toISOString() : null;
            const pathParts = doc.ref.path.split("/");
            const postId = pathParts[1];
            const userId = doc.id;

            rows.push({
                postId,
                userId,
                assistance,
                date,
                eventType: "migration",
                updatedAt: new Date().toISOString(),
            });
        });

        // 2. Inserta en BigQuery
        try {
            await table.insert(rows);
            console.log(`Exportadas ${rows.length} filas (total acumulado: ${total + rows.length})`);
            total += rows.length;
        } catch (err) {
            if (err.name === "PartialFailureError") {
                console.error("Error parcial al insertar:", JSON.stringify(err.errors));
            } else {
                console.error("Error general en inserción:", JSON.stringify(err));
                throw err;
            }
        }

        // 3. siguiente página
        lastDoc = snapshot.docs[snapshot.docs.length - 1];
        hasMore = snapshot.size === batchSize;

    }

    console.log(`Exportación completada. Total de registros exportados: ${total}`);
}

async function insertToBigQuery(data) {

    const bigquery = new BigQuery({
        projectId: databaseName.value()
    });

    const {
        postId,
        userId,
        assistance,
        date,
        eventType,
        updatedAt
    } = data;

    const query = `
        INSERT INTO \`${datasetId}.${tableId}\`
        (postId, userId, assistance, date, eventType, updatedAt)
        VALUES
        (@postId, @userId, @assistance, @date, @eventType, @updatedAt)
    `;

    const options = {
        query,
        params: { postId, userId, assistance, date, eventType, updatedAt },
    };

    try {
        await bigquery.query(options);
        console.log("Registro insertado en BigQuery:", data);
    } catch (error) {
        console.error("Error insertando en BigQuery:", error);
        throw error;
    }
}

async function updateBigQueryRecord(data) {

    const bigquery = new BigQuery({
        projectId: databaseName.value()
    });

    const {
        postId,
        userId,
        assistance,
        date,
        eventType,
        updatedAt
    } = data;

    const query = `
        UPDATE \`${datasetId}.${tableId}\`
        SET 
            assistance = @assistance,
            date = @date,
            eventType = @eventType,
            updatedAt = @updatedAt
        WHERE postId = @postId AND userId = @userId
    `;

    const options = {
        query,
        params: { postId, userId, assistance, date, eventType, updatedAt },
    };

    try {
        await bigquery.query(options);
        console.log("Registro actualizado en BigQuery:", data);
    } catch (error) {
        console.error("Error actualizando en BigQuery:", error);
        throw error;
    }
}

async function deleteFromBigQuery(postId, userId) {

    const bigquery = new BigQuery({
        projectId: databaseName.value()
    });

    const query = `
    DELETE FROM \`${datasetId}.${tableId}\`
    WHERE postId = @postId AND userId = @userId
  `;
    const options = {
        query,
        params: { postId, userId },
    };
    await bigquery.query(options);
    console.log(`Registro eliminado de BigQuery para postId=${postId}, userId=${userId}`);
}

/** 
 * posts/{postId}/assistance/{userId} - Trigger para asistencia a sesiones virtuales docuemento creado
 * @param {import('firebase-functions/v2').CloudEvent<import('firebase-admin/firestore').QueryDocumentSnapshot>} event
 * @returns {Promise<void>}
 */

async function handleAssistanceCreated(event) {
    const snapshot = event.data;
    if (!snapshot) return;

    const { postId, userId } = event.params;
    const { assistance, date } = snapshot.data();

    const row = {
        postId,
        userId,
        assistance,
        date: date ? date.toDate().toISOString() : null,
        eventType: "create",
        updatedAt: new Date().toISOString(),
    };

    await insertToBigQuery(row);
}

/** 
 * posts/{postId}/assistance/{userId} - Trigger para asistencia a sesiones virtuales documento actualizado
 * @param {import('firebase-functions/v2').CloudEvent<import('firebase-admin/firestore').QueryDocumentSnapshot>} event
 * @returns {Promise<void>}
 */

async function handleAssistanceUpdated(event) {
    const after = event.data?.after.data();
    if (!after) return;

    const { postId, userId } = event.params;
    const { assistance, date } = after;

    const row = {
        postId,
        userId,
        assistance,
        date: date ? date.toDate().toISOString() : null,
        eventType: "update",
        updatedAt: new Date().toISOString(),
    };

    await updateBigQueryRecord(row);
}

/** 
 * posts/{postId}/assistance/{userId} - Trigger para asistencia a sesiones virtuales documento eliminado
 * @param {import('firebase-functions/v2').CloudEvent<import('firebase-admin/firestore').QueryDocumentSnapshot>} event
 * @returns {Promise<void>}
 */

async function handleAssistanceDeleted(event) {
    const { postId, userId } = event.params;
    await deleteFromBigQuery(postId, userId);
}

/**
 * 
 * @param { import('express').Request } req 
 * @param { import('express').Response } res 
 * @returns 
 */

async function exportAssistanceToBigQuery(req, res) {
    res.header('Content-Type', 'application/json');
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(204).send('');
    }
    if (req && req.method === 'GET') {
        const resp = await exportAssistanceToBigQueryHandler();
        return res.status(200).json({ status: 'Success', data: resp, message: 'Exportación iniciada' });
    } else {
        return res.status(405).json({ code: 405, message: `${req.method} Method Not Allowed` });
    }
}

module.exports = {
    handleAssistanceCreated,
    handleAssistanceUpdated,
    handleAssistanceDeleted,
    exportAssistanceToBigQuery
};

