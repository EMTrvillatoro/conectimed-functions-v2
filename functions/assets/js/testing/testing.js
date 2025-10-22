const { getFBAdminInstance } = require('../Tools');

/**
 * Example request:
 * http://localhost:5000/conectimed-production/us-central1/getVirtualSessionsAttendanceConfirmation?id=HEY4af8F6FBUNJJATAKY&info=true
 * 
 * @param { import('express').Request } req 
 * @param { import('express').Response } res 
 * @returns 
 */

async function getVirtualSessionsAttendanceConfirmation(req, res) {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Content-Type", "application/json");

    if (req.method === "OPTIONS") {
        return res.status(204).send("");
    }

    if (req.method !== "GET") {
        return res.status(405).json({ code: 405, message: `${req.method} Method Not Allowed` });
    }

    try {

        let { id, info } = req.query;

        id = String(id || '');
        info = info === 'true' ? true : false;

        if (id) {

            const admin = getFBAdminInstance();

            const db = admin.firestore();

            const resp = await db.collection("posts").doc(id).get();

            const resp1 = await db.collection("posts").doc(id).collection('assistance').get();

            let assistances = [];

            if (info === true) {
                for (const doc of resp1.docs) {
                    try {
                        const resp2 = await db.collection("users").doc(doc.id).get();
                        assistances.push({
                            "type": resp2.get("type"),
                            "uid": resp2.get("uid"),
                            "email": resp2.get("email"),
                            "nameStr": resp2.get("nameStr"),
                            "mobile": resp2.get("mobile"),
                            "status": resp2.get("status"),
                            "phone": resp2.get("phone")
                        });
                    } catch (e) {
                        console.error(e);
                    }
                }
            } else {
                assistances = resp1.docs.map(doc => doc.id);
            }

            return res.status(200).json({ status: "success", sesion_virtual_id: id, sesion_virtual_title: resp.get("title"), size: resp1.size, data: assistances });
        } else {
            return res.status(401).send({ message: 'missing parameters' });
        }
    } catch (error) {
        return res.status(500).json(error);
    }
}

module.exports = {
    getVirtualSessionsAttendanceConfirmation
};