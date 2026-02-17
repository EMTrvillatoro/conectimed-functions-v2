const admin = require('firebase-admin');
const { createChatHandler, checkExistingChats } = require('./chatBatch');
const { arrayPaginator } = require('../Tools'); // Assuming arrayPaginator is available here

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

        // 1. Fetch Sender Data ONCE
        let senderData = null;
        try {
            const senderDoc = await db.collection('users').doc(repid).get();
            if (senderDoc.exists) {
                senderData = senderDoc.data();
                senderData.uid = senderDoc.id;
            }
        } catch (e) {
            console.error('Error fetching sender data:', e);
        }

        // 2. Process users in chunks to batch "existence checks"
        // We need to check existence for 5 users at a time (5 * 2 = 10 identifiers, limit of 'in' query)
        const CHUNK_SIZE = 5;
        const userChunks = [];
        for (let i = 0; i < _array.length; i += CHUNK_SIZE) {
            userChunks.push(_array.slice(i, i + CHUNK_SIZE));
        }

        for (const chunk of userChunks) {
            // Prepare identifiers for this chunk
            const identifiersToCheck = [];
            const userMap = {}; // Map userId -> [identifier1, identifier2]

            chunk.forEach(userId => {
                const id1 = String(repid) + String(userId);
                const id2 = String(userId) + String(repid);
                identifiersToCheck.push(id1, id2);
                userMap[userId] = [id1, id2];
            });

            // Batch check
            let foundChatsMap = {}; // userId -> chatDoc
            try {
                const querySnapshot = await checkExistingChats(identifiersToCheck);
                if (!querySnapshot.empty) {
                    querySnapshot.docs.forEach(doc => {
                        const data = doc.data();
                        const identifier = data.identifier;
                        // Find which user this identifier belongs to
                        // We can't easily map back from identifier to user without parsing, 
                        // but we know our map: userMap[userId] has the identifiers.
                        for (const userId of chunk) {
                            if (userMap[userId].includes(identifier)) {
                                foundChatsMap[userId] = doc;
                                break;
                            }
                        }
                    });
                }
            } catch (e) {
                console.error('Error batch checking chats:', e);
            }

            // Create/Send for each user in chunk
            for (let user_id of chunk) {
                try {
                    const existingDoc = foundChatsMap[user_id];
                    await createChatHandler(user_id, messages, repid, senderData, existingDoc);
                } catch (error) {
                    console.log(JSON.stringify(error));
                }
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