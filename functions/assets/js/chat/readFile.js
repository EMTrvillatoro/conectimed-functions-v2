const admin = require('firebase-admin');
const { unique, arrayPaginator } = require('../Tools');
const XLSX = require('xlsx');

if (!admin.apps.length) {
    admin.initializeApp();
    const settings = { timestampsInSnapshots: true };
    admin.firestore().settings(settings);
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

async function updateError(id) {
    try {
        await db.doc(`chats-batch/${id}`).update({ error: 'file_error' });
    }
    catch (error) {
        console.log('Error capturado', error);
        return { success: false };
    }
}

/** 
 * chats-batch/{id} - Trigger para documento creado en la colecion de chats-batch, se encarga de leer el archivo subido a storage, procesar los datos y crear los documentos necesarios para el proceso de envio de mensajes masivos.
 * @param {import('firebase-functions/v2').CloudEvent<import('firebase-admin/firestore').QueryDocumentSnapshot>} event
 * @returns {Promise<void>}
 */

async function readFileHandler(event, context) {
    const main_id = event.id;
    try {
        const route_file = event.get('fullPath');

        const file = await bucket.file(route_file).get();

        // const exist = await file[0].exists();

        const download = await file[0].download();

        const workBook = XLSX.read(download[0].buffer, { type: 'buffer' });

        const jsonData = workBook.SheetNames.reduce((initial, name) => {
            const sheet = workBook.Sheets[name];
            initial[name] = XLSX.utils.sheet_to_json(sheet);
            return initial;
        }, {});

        const name = Object.keys(jsonData)[0];

        let uids = [];

        if (name) {
            uids = Array.from(jsonData[name]).map(item => {
                return item.uid;
            });
            uids = uids.filter(unique);
        }

        if (!(uids && uids[0] && uids.length > 0)) {
            await updateError(main_id);
            return { success: false };
        }

        console.log("============ uids ============", uids);

        const size = 100;

        const pagination = arrayPaginator(uids, 1, size);

        console.log("============ pagination ============", pagination);

        let originalArray = [];

        for (let i = 1; i <= pagination.total_pages; i++) {
            const page = arrayPaginator(uids, i, size);
            originalArray.push({ ref: db.doc('chats-batch/' + main_id + '/sections/' + page.page), data: page });
        }

        console.log("============ originalArray ============", originalArray);

        let newArray = [];
        const LONG_ARRAY = 500;
        for (let i = 0; i < originalArray.length; i += LONG_ARRAY) {
            let piece = originalArray.slice(i, i + LONG_ARRAY);
            newArray.push(piece);
        }

        if (!(newArray && newArray[0] && newArray.length > 0)) {
            await updateError(main_id);
            return { success: false };
        }

        console.log("============ newArray ============", newArray);

        for (const array of newArray) {
            const batch = db.batch();
            for (const element of array) {
                let data = element.data;
                data.status = 'pending';
                batch.set(element.ref, data, { merge: true });
            }
            await batch.commit();
        }

        await originalArray[0].ref.update({ status: 'in_progress' });

        return { success: true };
    } catch (e) {
        await updateError(main_id);
        console.error('Error capturado', e);
        return { success: false };
    }
};

module.exports = {
    readFileHandler
};
