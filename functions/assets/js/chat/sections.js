const admin = require('firebase-admin');
const { createChatHandler } = require('./chatBatch');

if (!admin.apps.length) {
    admin.initializeApp();
    const settings = { timestampsInSnapshots: true };
    admin.firestore().settings(settings);
}

const db = admin.firestore();

/** 
 * chats-batch/{id_batch}/sections/{id} - Trigger
 * @param {import('firebase-functions/v2').CloudEvent<import('firebase-admin/firestore').QueryDocumentSnapshot>} event
 * @returns {Promise<void>}
 */

async function sectionsHandler(event) {
    if (event && event.data && event.data.after && event.data.after.get('status') === 'in_progress') {
        const message_request = await db.doc('chats-batch/' + event.params.id_batch).get();
        const message = message_request.data();
        const repid = message.repid;
        const messages = message.messages;
        const _array = Array.from(event.data.after.get('data')) || [];
        const next_page = event.data.after.get('next_page') || null;

        for (let user_id of _array) {
            try {
                await createChatHandler(user_id, messages, repid);
            } catch (error) {
                console.log(JSON.stringify(error));
            }
        }

        try {
            await event.data.after.ref.update({ status: 'complete' });
        } catch (error) {
            console.log(JSON.stringify(error));
        }

        if (next_page && next_page !== null) {
            try {
                await db
                    .doc('chats-batch/' + event.params.id_batch + '/sections/' + next_page)
                    .update({ status: 'in_progress' });
            } catch (error) {
                console.log(JSON.stringify(error));
            }
        } else {
            try {
                await db.doc('chats-batch/' + event.params.id_batch).update({ status: 'complete' });
            } catch (error) {
                console.log(JSON.stringify(error));
            }
        }
        console.log('====== CHAT BATCH PAGE: ' + event.data.after.id + ' ======');
        return true;
    } else {
        return false;
    }
};

module.exports = {
    sectionsHandler
};