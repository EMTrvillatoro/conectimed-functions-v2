const { defineSecret } = require('firebase-functions/params');
const { BigQuery } = require("@google-cloud/bigquery");

const bigquery = new BigQuery({
    projectId: "conectimed-9d22c",
});

const zohoIntegrationURL = defineSecret('ZOHO_INTEGRATION_URL');
const CURSOR_TABLE = "conectimed-9d22c.Users.cursor_zoho_users";
const SOURCE_TABLE = "conectimed-9d22c.Users.medicosData";
const DESTINATION_TABLE = "conectimed-9d22c.Users.zoho_users_results";
const LIMIT = 50;

/**
 * Controlador HTTP principal
 * @param { import('express').Request } req 
 * @param { import('express').Response } res 
 */

async function getUsersBQ(req, res) {
    res.header('Content-Type', 'application/json');
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(204).send('');
    }

    if (req.method !== 'GET') {
        return res.status(405).send({ code: 405, message: `${req.method} Method Not Allowed` });
    }

    try {
        const result = await processUsersToZoho();
        res.status(200).json(result);
    } catch (error) {
        console.error("❌ Error ejecutando BigQuery:", error);
        res.status(500).json({ error: error.message });
    }
}

/**
 * Procesa usuarios desde BigQuery y los envía a Zoho
 */

async function processUsersToZoho() {
    // 1️⃣ Asegurar que la tabla del cursor exista
    await ensureCursorTableExists();

    // 2️⃣ Leer el cursor actual
    const [cursorRows] = await bigquery.query(`
        SELECT COALESCE(MAX(lastCursor), TIMESTAMP("1970-01-01")) AS lastCursor
        FROM \`${CURSOR_TABLE}\``);
    const lastCursor = cursorRows[0].lastCursor;
    console.log(`Último cursor leído: ${lastCursor}`);

    // 3️⃣ Obtener resultados desde BigQuery (respetando el cursor)
    const results = await bigqueryConection(lastCursor);

    if (!results.length) {
        return { success: true, message: "No hay nuevos registros para enviar." };
    }

    // 4️⃣ Enviar resultados a Zoho <========================== CAMBIAR EN EJERCICIO REAL
    // const response = await saveToZoho(results);
    const response = await saveResultsToBigQuery(results);

    // 5️⃣ Guardar nuevo cursor en BigQuery
    const newCursor = results[results.length - 1].createdAtFB;

    const insertQuery = `
        INSERT INTO \`${CURSOR_TABLE}\` (lastCursor, updatedAt)
        VALUES (@newCursor, CURRENT_TIMESTAMP())`;

    await bigquery.query({
        query: insertQuery,
        params: { newCursor },
    });

    console.log(`Nuevo cursor guardado: ${newCursor}`);

    return {
        success: true,
        sent: results.length,
        results,
        newCursor,
        //  zohoStatus: response.status,
    };
}

/**
 * Obtiene registros de BigQuery desde un cursor en adelante
 * @param {string | null} lastCursor
 */

async function bigqueryConection(lastCursor) {
    const query = `
        SELECT *
        FROM \`${SOURCE_TABLE}\`
        WHERE createdAtFB > @cursor
        ORDER BY createdAtFB ASC
        LIMIT @limit`;

    const [rows] = await bigquery.query({
        query,
        params: { cursor: lastCursor, limit: LIMIT },
    });

    return rows.map(row => ({
        First_Name: row.name || '',
        Last_Name: `${row.lastName1 || ''} ${row.lastName2 || ''}`.trim(),
        Email: row.email || '',
        createdAtFB: row.createdAtFB ? row.createdAtFB.value || row.createdAtFB : null,
    }));
}

/**
 * Verifica si la tabla de cursor existe; si no, la crea.
 */

async function ensureCursorTableExists() {
    const [datasetId, tableId] = CURSOR_TABLE.split('.').slice(1);
    const dataset = bigquery.dataset(datasetId);
    const table = dataset.table(tableId);

    const [exists] = await table.exists();
    if (exists) return;

    console.log(`⚙️ Tabla ${CURSOR_TABLE} no existe, creando...`);

    await table.create({
        schema: [
            { name: 'lastCursor', type: 'TIMESTAMP', mode: 'NULLABLE' },
            { name: 'updatedAt', type: 'TIMESTAMP', mode: 'NULLABLE' },
        ],
    });
    console.log(`✅ Tabla ${CURSOR_TABLE} creada exitosamente.`);
}

async function saveToZoho(results) {
    const response = await fetch(zohoIntegrationURL.value(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: results }),
    });

    console.log(`Respuesta de Zoho: ${response.status} ${response.statusText}`);

    if (!response.ok) {
        throw new Error(`Error al enviar datos a Zoho: ${response.statusText}`);
    }
    return response;
}

/**
 * Inserta un array de registros en BigQuery
 * Crea la tabla si no existe
 * @param {Array<Object>} results - Array de registros a insertar
 */
async function saveResultsToBigQuery(results) {
    if (!results || !results.length) {
        console.log("⚠️ No hay datos para insertar en BigQuery");
        return { success: false, message: "No hay datos para insertar" };
    }

    try {
        // 1️⃣ Asegurar que la tabla exista
        await ensureDestinationTableExists();

        // 2️⃣ Mapear datos para que coincidan con las columnas de BigQuery
        const rows = results.map(row => ({
            first_name: row.First_Name || '',
            last_name: row.Last_Name || '',
            email: row.Email || '',
            created_at_fb: row.createdAtFB || null,
        }));

        // 3️⃣ Insertar registros en BigQuery
        const [insertResponse] = await bigquery
            .dataset("Users")
            .table("zoho_users_results")
            .insert(rows);

        console.log(`✅ Se insertaron ${rows.length} registros en BigQuery`);
        return { success: true, inserted: rows.length, response: insertResponse };

    } catch (error) {
        console.error("❌ Error insertando datos en BigQuery:", error);
        throw error;
    }
}

/**
 * Verifica si la tabla existe, y si no, la crea
 */

async function ensureDestinationTableExists() {
    const dataset = bigquery.dataset("Users");
    const table = dataset.table("zoho_users_results");

    const [exists] = await table.exists();
    if (exists) return;

    console.log(`⚙️ Tabla ${DESTINATION_TABLE} no existe, creando...`);

    await table.create({
        schema: [
            { name: 'first_name', type: 'STRING', mode: 'NULLABLE' },
            { name: 'last_name', type: 'STRING', mode: 'NULLABLE' },
            { name: 'email', type: 'STRING', mode: 'NULLABLE' },
            { name: 'created_at_fb', type: 'TIMESTAMP', mode: 'NULLABLE' },
        ],
    });

    console.log(`✅ Tabla ${DESTINATION_TABLE} creada exitosamente.`);
}

module.exports = {
    getUsersBQ
};
