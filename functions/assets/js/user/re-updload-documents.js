
const { randomUUID } = require('crypto');
const { getFBAdminInstance } = require('../Tools');

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = {
  'application/pdf': {
    extension: 'pdf',
    validate: buffer =>
      buffer.length >= 5 &&
      buffer.subarray(0, 5).toString() === '%PDF-'
  },
  'image/jpeg': {
    extension: 'jpg',
    validate: buffer =>
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
  },
  'image/png': {
    extension: 'png',
    validate: buffer =>
      buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(
        Buffer.from([
          0x89, 0x50, 0x4e, 0x47,
          0x0d, 0x0a, 0x1a, 0x0a
        ])
      )
  }
};

async function updateUserDocumentHandler(req, res) {
  res.set('Content-Type', 'application/json');
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Allow-Methods', 'PUT, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'PUT') {
    return res.status(405).json({
      status: 'error',
      message: 'Método no permitido.'
    });
  }

  let storageFile;
  let objectPath;

  try {
    const { uid, file: uploadedFile } = req.body || {};

    if (
      typeof uid !== 'string' ||
      !uid.trim() ||
      uid.length > 128 ||
      /[\\/]/.test(uid)
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'Se requiere un UID válido.'
      });
    }

    if (
      !uploadedFile ||
      typeof uploadedFile !== 'object' ||
      Array.isArray(uploadedFile) ||
      typeof uploadedFile.base64 !== 'string' ||
      !uploadedFile.base64.trim()
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'Se requiere un archivo válido en formato Base64.'
      });
    }

    const contentType = uploadedFile.type;
    const typeInfo = ALLOWED_TYPES[contentType];

    if (!typeInfo) {
      return res.status(400).json({
        status: 'error',
        message: 'Solo se permiten documentos PDF, JPG o PNG.'
      });
    }

    const base64 = uploadedFile.base64.trim();

    // Limitar el tamaño antes de convertir Base64 a Buffer.
    if (
      base64.length > Math.ceil(MAX_FILE_SIZE / 3) * 4 ||
      base64.length % 4 !== 0 ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64)
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'El documento es inválido o supera los 5 MB.'
      });
    }

    const buffer = Buffer.from(base64, 'base64');

    if (
      buffer.length === 0 ||
      buffer.length > MAX_FILE_SIZE ||
      buffer.toString('base64') !== base64
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'El documento debe tener un tamaño mayor a 0 y no superar los 5 MB.'
      });
    }

    if (!typeInfo.validate(buffer)) {
      return res.status(400).json({
        status: 'error',
        message: 'El contenido no corresponde al formato del documento.'
      });
    }

    const admin = getFBAdminInstance();
    const firestore = admin.firestore();

    const userRef = firestore.collection('users').doc(uid);
    const userSnapshot = await userRef.get();

    if (!userSnapshot.exists) {
      return res.status(404).json({
        status: 'error',
        message: 'No se encontró la cuenta asociada.'
      });
    }

    // Usar un nombre generado por el servidor.
    const bucket = admin.storage().bucket();

    objectPath =
      `register-files/${uid}/${randomUUID()}.${typeInfo.extension}`;

    storageFile = bucket.file(objectPath);

    const downloadToken = randomUUID();
    await storageFile.save(buffer, {
      resumable: false,
      validation: 'crc32c',
      metadata: {
        contentType,
        metadata: {
          ownerUid: uid,
          firebaseStorageDownloadTokens: downloadToken
        }
      }
    });

    const downloadURL =
      `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(objectPath)}?alt=media&token=${downloadToken}`;

    try {
      await userRef.update({
        validatedFileRequestStatus: 'pending',
        validatedStatus: 'pending',
        verificationFileUrl: downloadURL
      });
    } catch (error) {
      await storageFile.delete().catch(deleteError => {
        console.error(
          'Error al limpiar el archivo:',
          deleteError.message
        );
      });

      throw error;
    }

    return res.status(200).json({
      status: 'success',
      message: 'Documento recibido correctamente.'
    });

  } catch (error) {
    console.error(
      'Error al actualizar la documentación:',
      error
    );

    return res.status(500).json({
      status: 'error',
      message: 'No fue posible guardar el documento. Inténtelo más tarde.'
    });
  }
}

module.exports = {
  updateUserDocumentHandler
};
