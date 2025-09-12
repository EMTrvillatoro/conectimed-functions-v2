const { HttpsError } = require('firebase-functions/v2/https');
const { sendEmail } = require('../Tools');

/**
 * 
 * @param { CallableRequest<any> } data 
 * @param { CallableResponse<unknown> | undefined } context 
 * @returns 
*/

async function sendMailHandler(data, context) {
    // name, text!, subject!, recipient!, bcc, cc, attach, sender
    const body = data;
    // console.log(JSON.stringify(body));
    // Authentication / user information is automatically added to the request.
    if (context.auth && context.auth.uid) {
        if (!body.recipient) {
            throw new HttpsError(
                'invalid-argument',
                'El valor recipient es requerido para el envío de correos'
            );
        }
        await sendEmail(body);
        return {
            sucess: true,
            message: `Email successfully sent to ${body.recipient} ${body.bcc ? body.bcc : ''} ${body.cc ? body.cc : ''}`
        };
    } else {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated');
    }
}

module.exports = { sendMailHandler };