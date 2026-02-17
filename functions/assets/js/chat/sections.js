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
        const sectionData = event.data.after.data();
        let repid = sectionData.repid;
        let messages = sectionData.messages;
        let senderData = sectionData.senderData;
        const _array = Array.from(sectionData.data) || [];
        const next_page = sectionData.next_page || null;

        // Fallback if redundant data is missing (for older batches)
        if (!repid || !messages || !senderData) {
            const message_request = await db.doc('chats-batch/' + event.params.id_batch).get();
            const message = message_request.data();
            repid = repid || message.repid;
            messages = messages || message.messages;

            if (!senderData) {
                try {
                    const senderDoc = await db.collection('users').doc(repid).get();
                    if (senderDoc.exists) {
                        senderData = senderDoc.data();
                        senderData.uid = senderDoc.id;
                    }
                } catch (e) {
                    console.error('Error fetching sender data:', e);
                }
            }
        }

        // 1. Process users in chunks to batch "existence checks"
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

            // Batch check chats existence
            let foundChatsMap = {}; // userId -> chatDoc
            let usersToFetch = []; // UIDs of users whose data we need (chat missing or missing members)

            try {
                const querySnapshot = await checkExistingChats(identifiersToCheck);
                const foundIdentifiers = new Set();

                if (!querySnapshot.empty) {
                    querySnapshot.docs.forEach(doc => {
                        const data = doc.data();
                        const identifier = data.identifier;
                        foundIdentifiers.add(identifier);

                        // Find which user this identifier belongs to
                        for (const userId of chunk) {
                            if (userMap[userId].includes(identifier)) {
                                foundChatsMap[userId] = doc;
                                // If chat exists but missing members, we'll still want to fetch user data to fix it
                                if (!data.members || data.members.length < 2) {
                                    usersToFetch.push(userId);
                                }
                                break;
                            }
                        }
                    });
                }

                // Any user in chunk that didn't have a chat found also needs fetching
                chunk.forEach(userId => {
                    const [id1, id2] = userMap[userId];
                    if (!foundIdentifiers.has(id1) && !foundIdentifiers.has(id2)) {
                        usersToFetch.push(userId);
                    }
                });

            } catch (e) {
                console.error('Error batch checking chats:', e);
                // Fallback: try to fetch all in chunk if query failed
                usersToFetch = chunk;
            }

            // 2. Fetch ONLY necessary receiver data in BATCH
            let receiversMap = {};
            if (usersToFetch.length > 0) {
                try {
                    const userRefs = usersToFetch.map(uid => db.collection('users').doc(String(uid)));
                    const userDocs = await db.getAll(...userRefs);
                    userDocs.forEach(doc => {
                        if (doc.exists) {
                            const data = doc.data();
                            data.uid = doc.id;
                            receiversMap[doc.id] = data;
                        }
                    });
                } catch (e) {
                    console.error('Error fetching necessary receiver data:', e);
                }
            }

            // 3. Create/Send for each user in chunk
            for (let user_id of chunk) {
                try {
                    const existingDoc = foundChatsMap[user_id];
                    const receiverData = receiversMap[user_id] || null;
                    await createChatHandler(user_id, messages, repid, senderData, existingDoc, receiverData);
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