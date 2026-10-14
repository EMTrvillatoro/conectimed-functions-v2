const Tools = require('../Tools');

async function updateHandler(req, res) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  const admin = Tools.getFBAdminInstance();
  const db = admin.firestore();

  const body = req.body || {};
  const { idPreregistro } = body;

  if (!idPreregistro) {
    return res.status(404).json({ msg: 'El ID del pre-registro es requerido para hacer la actualización' });
  }

  try {
    await db
      .collection('preregistro')
      .doc(idPreregistro)
      .update({ inWP: true });

    return res.status(200).json({ msg: 'Pre-registro actualizado', id: idPreregistro });
  } catch (error) {
    console.error('Error en updateHandler:', error);
    return res.status(500).json({ msg: error.message || error });
  }
}

module.exports = {
  updateHandler
};
