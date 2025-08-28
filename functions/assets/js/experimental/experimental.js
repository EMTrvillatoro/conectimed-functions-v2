const { getFBAdminInstance } = require('../Tools');

/**
 * 
 * @param { import('express').Request } req 
 * @param { import('express').Response } res 
 * @returns 
 */

async function infoDBFHandler(req, res) {
    // 🔥 Configurar CORS manualmente
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Content-Type", "application/json");

    const admin = getFBAdminInstance();

    const db = admin.firestore();

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
}

module.exports = {
    infoDBFHandler
};