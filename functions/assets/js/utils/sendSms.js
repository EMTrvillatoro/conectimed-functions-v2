const functions = require("firebase-functions/v2");
const { logger } = require("firebase-functions");
const { HttpsError } = functions.https;

const { sendSMS } = require("../Tools");

async function sendSmsHandler(request) {

  const body = request.data;

  logger.info("Ejecutando sendSMS", {
    hasAuth: !!request.auth,
    recipientLength: body?.recipient?.length ?? 0,
  });

  // ✔ Validar autenticación
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError(
      "unauthenticated",
      "La función debe ser llamada por un usuario autenticado."
    );
  }

  // ✔ Validaciones de parámetros
  if (!body.content) {
    throw new HttpsError(
      "invalid-argument",
      "El campo 'content' es requerido para el envío de SMS."
    );
  }

  if (!body.recipient) {
    throw new HttpsError(
      "invalid-argument",
      "El campo 'recipient' es obligatorio para enviar SMS."
    );
  }

  try {
    await sendSMS(body);

    return {
      success: true,
      message: `SMS enviado correctamente a ${body.recipient}`,
    };

  } catch (err) {
    logger.error("Error al enviar SMS", err);

    throw new HttpsError(
      "internal",
      "No se pudo enviar el SMS. Revise los datos o intente más tarde."
    );
  }
}

module.exports = { sendSmsHandler };