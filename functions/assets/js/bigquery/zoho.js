const { BigQuery } = require("@google-cloud/bigquery");
const bigquery = new BigQuery({
    projectId: "conectimed-9d22c", // opcional si ya está configurado en GOOGLE_CLOUD_PROJECT
});

/**
 * 
 * @param { import('express').Request } req 
 * @param { import('express').Response } res 
 * @returns 
 */

async function getUsersFromBigquery(req, res) {
    res.header('Content-Type', 'application/json');
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.status(204).send('');
    }
    if (req && req.method === 'GET') {
        try {
            const query = `SELECT * FROM \`conectimed-9d22c.Users.medicosData\` ORDER BY createdAtFB ASC LIMIT 50`;

            // Ejecutar consulta
            const [rows] = await bigquery.query({ query });

            // Formatear resultados

            const results = rows.map(row => ({
                First_Name: row.name || '',
                Last_Name: `${row.lastName1 || ''} ${row.lastName2 || ''}` || '',
                Email: row.email || ''
            }));

            res.status(200).json({ data: results });
        } catch (error) {
            console.error("Error ejecutando BigQuery:", error);
            res.status(500).json({ error: error.message });
        }
    } else {
        return res.status(405).send({ code: 405, message: `${req.method} Method Not Allowed` });
    }
}


module.exports = {
    getUsersFromBigquery
};