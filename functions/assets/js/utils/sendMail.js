const functions = require("firebase-functions/v2");
const { logger } = require("firebase-functions");
const { HttpsError } = functions.https;

// Su función real para enviar correo
const { sendEmail } = require('../Tools');

/**
 * Callable Function v2 para enviar correos.
 * Sigue buenas prácticas:
 * - Validaciones claras
 * - Manejo de errores con HttpsError
 * - enforceAppCheck y CORS
 * - Logging seguro
 */

async function sendMailHandler(request) {
    const body = request.data;

    logger.info("Ejecutando sendMail", {
        hasAuth: !!request.auth,
        recipient: body?.recipient ? "provided" : "missing",
    });

    // ✔ Validar autenticación
    if (!request.auth || !request.auth.uid) {
        throw new HttpsError(
            "unauthenticated",
            "La función debe ser llamada por un usuario autenticado."
        );
    }

    // ✔ Validación de parámetros requeridos
    if (!body.recipient) {
        throw new HttpsError(
            "invalid-argument",
            "El campo 'recipient' es obligatorio para enviar correos."
        );
    }

    try {
        await sendEmail(body);

        return {
            success: true,
            message: `Email enviado a ${body.recipient}${body.bcc ? `, BCC: ${body.bcc}` : ""}${body.cc ? `, CC: ${body.cc}` : ""}`,
        };

    } catch (err) {
        logger.error("Error enviando correo", err);

        throw new HttpsError(
            "internal",
            "No se pudo enviar el correo. Verifique los parámetros o intente más tarde."
        );
    }
}

module.exports = { sendMailHandler };