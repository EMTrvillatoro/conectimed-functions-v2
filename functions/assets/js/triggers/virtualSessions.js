const { defineSecret } = require('firebase-functions/params');
const { BigQuery } = require("@google-cloud/bigquery");

const databaseName = defineSecret('CONFIGFB_DATABASE_NAME');
const datasetId = "Posts";
const tableId = "sesiones_virtuales_assistance";

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

module.exports = {
    handleAssistanceCreated,
    handleAssistanceUpdated,
    handleAssistanceDeleted
};

