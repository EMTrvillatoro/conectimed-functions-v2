const admin = require('firebase-admin');
const moment = require('moment');

if (!admin.apps.length) {
    admin.initializeApp();
    const settings = { timestampsInSnapshots: true };
    admin.firestore().settings(settings);
}

const db = admin.firestore();

/**
 * Example request:
 * http://localhost:5000/conectimed-production/us-central1/chatBatch
 * 
 * @param { import('express').Request } request 
 * @param { import('express').Response } response 
 * @returns 
 */

async function chatBatchRequestHandler(request, response) {
    try {
        let body = request.body;

        if (body && body.messages && body.userid && body.repid) {
            await createChat(body.userid, body.messages, body.repid);
            return response.status(200).send({ success: true, message: 'Chat Enviado correctamente' });
        } else {
            return response.status(500).send({ msg: 'Faltan parámetros' });
        }
    } catch (error) {
        return response.status(500).send({ msg: 'error', error: error });
    }
}

async function createChatHandler(userId, messages, repid, senderData, existingChatDoc) {
    return await createChat(userId, messages, repid, senderData, existingChatDoc);
};

async function createChat(userId, messages, maskedID, senderData, existingChatDoc) {
    const myID = maskedID ? maskedID : undefined;
    const ids = [String(myID) + String(userId), String(userId) + String(myID)];

    let response;
    if (existingChatDoc) {
        // If we have a pre-fetched doc, wrap it to mimic the query snapshot structure if simple, 
        // or just use it directly. The logic below expects 'response.empty' and 'response.docs'.
        // Let's standardize on existingChatDoc being a DocumentSnapshot or null/undefined.
        response = {
            empty: false,
            docs: [existingChatDoc]
        };
    } else {
        response = await ifChatExists(ids);
    }

    // Determine sender data (use passed data or fetch if missing)
    let member1 = senderData;
    if (!member1) {
        member1 = await getUserData(myID);
    }

    if (response.empty === false) {
        // Chat exists, use the existing doc data to avoid re-reading in sendChatMessage
        const existingChatDoc = response.docs[0];
        const existingChatData = existingChatDoc.data();

        messages.forEach(element => {
            sendChatMessage(
                existingChatDoc.id,
                element.message,
                element.convert,
                element.isFile,
                element.url,
                myID,
                element.sendMail,
                element.label,
                existingChatData // Pass existing data
            );
        });
    } else {
        const viewers = {};
        viewers[myID] = {
            seen: true,
            news: 0
        };
        viewers[userId] = {
            seen: false,
            news: 0
        };

        const member2 = await getUserData(userId);

        // If we still don't have member1 (sender) or member2 (receiver), we might have issues, but assuming they exist.

        const currentDate = moment().toDate();
        const data = {
            identifier: ids[0],
            date: currentDate,
            last_message_date: currentDate,
            last_message_user_id: String(myID),
            last_message: {
                message: '',
                date: currentDate,
                user: userId,
                receiver: myID,
                viewers
            },
            initialized: false,
            participants: [String(myID), String(userId)],
            members: [member1, member2]
        };
        const newChat = await createNewChat(data);

        // Use the data we just created
        messages.forEach(element => {
            sendChatMessage(
                newChat.id,
                element.message,
                element.convert,
                element.isFile,
                element.url,
                myID,
                element.sendMail,
                element.label,
                data // Pass the new chat data
            );
        });
    }
}

async function ifChatExists(ids) {
    return await db
        .collection('chats')
        .where('identifier', 'in', ids)
        .limit(1)
        .get();
}

/**
 * Checks for existing chats for a batch of identifiers.
 * @param {string[]} identifiers - Array of identifier strings to check.
 * @returns {Promise<FirebaseFirestore.QuerySnapshot>}
 */
async function checkExistingChats(identifiers) {
    if (!identifiers || identifiers.length === 0) return { empty: true, docs: [] };
    // Firestore 'in' query limit is 10.
    // We assume the caller handles batching or we handle it here if array is small.
    // But safely, let's just run the query.
    return await db
        .collection('chats')
        .where('identifier', 'in', identifiers)
        .get();
}

async function getUserData(uid) {
    try {
        const response = await db
            .collection('users')
            .doc(uid)
            .get();
        if (response.exists) {
            var ret = response.data();
            ret.uid = response.id;
            return ret;
        } else {
            return false;
        }
    } catch (error) {
        return error;
    }
}

async function createNewChat(data) {
    return db.collection('chats').add(data);
}

async function sendChatMessage(chatId, message, convert, isFile, url, user, sendMail, label, chatDataOpt) {
    if (message && message !== '') {
        try {
            if (convert === true) {
                message = urlify(message, true);
            }

            let chatData = chatDataOpt;
            if (!chatData) {
                const chatDoc = await db.collection('chats').doc(chatId).get();
                chatData = chatDoc.data();
            }

            const participants = Array.from(chatData.members || []).map(item => String(item.uid));
            const viewers =
                chatData && chatData.last_message && chatData.last_message.viewers ? chatData.last_message.viewers : {};
            const newViewers = {};
            const ArrayViewers = Object.keys(viewers);
            let otherUser;
            ArrayViewers.forEach(item => {
                let data = viewers[item];
                if (String(item) === String(user ? user : undefined)) {
                    data = {
                        news: 0,
                        seen: true
                    };
                } else {
                    const news = Number(data.news) + 1;
                    data = {
                        news,
                        seen: false
                    };
                    otherUser = item;
                }
                newViewers[item] = data;
            });
            const CURRENT_DATE = moment().toDate();
            const last_message = {
                date: CURRENT_DATE,
                message,
                user: String(user ? user : undefined),
                receiver: otherUser,
                viewers: newViewers,
                sendMail: sendMail ? sendMail : false
            };
            // Check send Email

            // Avoid re-reading chatData again here, use what we have
            const lastMessage = chatData.last_message;
            if (lastMessage && lastMessage.sendMail === true && lastMessage.user && !user) {
                const dataUser = await getUserData(lastMessage.user);
                // send mail handler
                productInfo(
                    dataUser.email,
                    `${dataUser && dataUser.name ? dataUser.name : ''} ${dataUser && dataUser.lastName1 ? dataUser.lastName1 : ''
                    } ${dataUser && dataUser.lastName2 ? dataUser.lastName2 : ''}`,
                    chatId
                );
            }
            // !=

            await db
                .collection('chats')
                .doc(chatId)
                .update({
                    initialized: true,
                    last_message_date: CURRENT_DATE,
                    last_message_user_id: String(user ? user : undefined),
                    last_message,
                    participants
                });

            let dataMessage = {
                date: moment().toDate(),
                message,
                isFile: isFile ? isFile : false,
                url: url ? url : '',
                sender: String(user ? user : undefined)
            };
            if (label !== undefined && label !== null && label !== '') {
                let myParticipants = Array.from(participants);
                const index = myParticipants.indexOf(String(user ? user : undefined));
                const userID = myParticipants[0];
                if (index > -1) {
                    myParticipants.splice(index, 1);
                }
                let docData = {
                    chatID: chatId,
                    label: label,
                    sender: String(user ? user : undefined),
                    to: userID,
                    viewed: false,
                    date: moment().toDate()
                };
                const resp = await db.collection('chat-metrics').add(docData);
                dataMessage.chat_metric_doc_id = resp.id;
                dataMessage.metric_label = label;
            }
            await db
                .collection('chats')
                .doc(chatId)
                .collection('messages')
                .add(dataMessage);

            return chatData;
        } catch (error) {
            console.error(error);
        }
    }
    return undefined;
}

function urlify(text, noIab) {
    var urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, url => {
        if (noIab === true) {
            return '<a href="' + url + '" target="_blank">' + url + '</a>';
        } else {
            return '<a href="' + url + '" class="iab-disabled">' + url + '</a>';
        }
    });
}

function share(route) {
    // let parameter = `${DEEPLINK_URL}${route}`;
    // parameter = btoa(parameter);
    // return `${APP_URL}/sharing/${parameter}`;
    return;
}

async function productInfo(email, name, chatID) {
    try {
        let otherName = '';
        const urlButton = share(`/home/chat/${chatID}`);
        const data = await getUserData(undefined);
        otherName = `${data && data.name ? data.name : ''} ${data && data.lastName1 ? data.lastName1 : ''} ${data && data.lastName2 ? data.lastName2 : ''
            }`;
        const text = `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional //EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html>

    <head>
        <title>¡Solicitud de información de productos!</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
        <style type="text/css">
            * {
                font-family: 'Lucida Sans', 'Lucida Sans Regular', 'Lucida Grande', 'Lucida Sans Unicode', Geneva, Verdana, sans-serif;
            }

            body {
                background-color: #f2f2f2;
            }

            table {
                font-size: 24px;
            }

            #tdtoshowinmobile {
                display: none;
            }

            @media screen and (max-device-width: 767px),
            screen and (max-width: 767px) {
                table {
                    font-size: 32px !important;
                }

                #tdtoshowinmobile {
                    display: block !important;
                }
            }
        </style>
    </head>

    <body>

        <div
            style="display: block;position: relative;margin: 0 auto;max-width: 600px;background: #ffffff;border-radius: 10px;padding: 20px;box-shadow: 1px 1px 5px #b0b0b0;margin-top: 20px;">
            <div><img style="display: block; position: relative;margin: 0 auto; width: 250px;"
                    src="https://app.conectimed.com/assets/img/logo-horizontal.png" /></div>
            <hr style="border: 1px ridge;" />
            <h2><strong>Estimado(a) ${name}:</strong></h2>
            <p style="text-align: left;">El medico <strong>${otherName}</strong> est&aacute; en l&iacute;nea en el chat para solicitarle
                informaci&oacute;n de sus productos.</p>
            <p style="text-align: center;"><span style="background-color: #236fa1; color: #ffffff;"><strong><a
                            style="background-color: #2c8ecf;color: #ffffff;display: inline-block;padding: 10px;text-decoration: none;border-radius: 5px;border: 2px solid #1773b1;"
                            title="Responda a este Chat" href="${urlButton}" rel="noopener">Responda este
                            chat</a></strong></span></p>
            <p style="text-align: center;">Para cualquier duda o comentario escribanos a <a
                    href="mailto:contacto@conectimed.com">contacto@conectimed.com</a> donde con gusto lo
                atenderemos.<br />En
                <strong>Conectimed </strong>trabajamos todos los d&iacute;as buscando la satisfacci&oacute;n de nuestros
                usuarios.<br /><br />Descarga la App
            </p>
            <table style="border-collapse: collapse; width: 100%;" border="0">
                <tbody>
                    <tr>
                        <td style="width: 48.0441%;" align="center">
                            <a href="https://apps.apple.com/mx/app/conectimed-app/id1488809696">
                                <img width="153"
                                    src="https://developer.apple.com/app-store/marketing/guidelines/images/badge-example-alternate_2x.png" />
                            </a>
                        </td>
                        <td style="width: 48.1543%;" align="center">
                            <a href="https://play.google.com/store/apps/details?id=com.enacment.conectimed&hl=es_MX&gl=US">
                                <img width="153"
                                    src="https://lh3.googleusercontent.com/cjsqrWQKJQp9RFO7-hJ9AfpKzbUb_Y84vXfjlP0iRHBvladwAfXih984olktDhPnFqyZ0nu9A5jvFwOEQPXzv7hr3ce3QVsLN8kQ2Ao=s0" />
                            </a>
                        </td>
                    </tr>
                </tbody>
            </table>
            <p style="text-align: center;">&nbsp;</p>
        </div>

    </body>

    </html>`;

        //awai email(email, '¡Solicitud de información de productos!', text, name);
    } catch (error) {
        console.error(error);
    }
}

module.exports = {
    chatBatchRequestHandler,
    createChatHandler,
    checkExistingChats
};
