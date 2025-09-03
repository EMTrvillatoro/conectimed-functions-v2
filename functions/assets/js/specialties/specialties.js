const { getFBAdminInstance } = require('../Tools');

/**
 * 
 * @param { import('express').Request } req 
 * @param { import('express').Response } res 
 * @returns 
 */

async function getSpecialties(req, res) {
    res.header('Content-Type', 'application/json');
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.status(204).send('');
    }
    if (req && req.method === 'GET') {
        const admin = getFBAdminInstance();
        const db = admin.firestore();
        const _resp = await db.collection('specialties').where('status', '==', 'active').orderBy('nameStr', 'asc').get();
        const specialties = _resp.docs.map(e => {
            return {
                id: e.id,
                name: e.get('name'),
            };
        });
        return res.status(200).send({ specialties });
    } else {
        return res.status(405).send({ code: 405, message: `${req.method} Method Not Allowed` });
    }
}

/**
 * 
 * @param { import('express').Request } req 
 * @param { import('express').Response } res 
 * @returns 
 */

async function getSpecialty(req, res) {
    res.header('Content-Type', 'application/json');
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.status(204).send('');
    }
    if (req && req.method === 'POST') {
        if (req && req.body && req.body.id) {
            const admin = getFBAdminInstance();
            const db = admin.firestore();
            const _resp = await db.collection('specialties').doc(String(req.body.id)).get();
            const specialty = {
                id: _resp.id,
                name: _resp.get('name')
            }
            return res.status(200).send(specialty);
        } else {
            return res.status(401).send({ message: 'missing parameters' });
        }
    } else {
        return res.status(405).send({ code: 405, message: `${req.method} Method Not Allowed` });
    }
}

module.exports = {
    getSpecialties,
    getSpecialty
};