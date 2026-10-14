const Tools = require('../Tools');

async function searchHandler(req, res) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  const admin = Tools.getFBAdminInstance();
  const db = admin.firestore();

  const body = req.body || {};
  const { email, telefono } = body;

  if (!email) {
    return res.status(404).json({ msg: 'El parámetro email es requerido para la búsqueda' });
  }
  if (!telefono) {
    return res.status(404).json({ msg: 'El parámetro teléfono es requerido para la búsqueda' });
  }

  try {
    const bdresult = await db
      .collection('preregistro')
      .where('email', '==', email)
      .where('telmovil', '==', telefono)
      .get();

    if (bdresult.empty) {
      return res.status(404).json({ msg: 'No se encontraron resultados' });
    }

    let idPreregistro;
    bdresult.forEach((doc) => {
      idPreregistro = doc.data();
      idPreregistro.id = doc.id;
    });

    return res.status(200).json({ msg: 'Pre-registro econtrado', data: idPreregistro });
  } catch (error) {
    console.error('Error en searchHandler:', error);
    return res.status(500).json({ msg: error.message || error });
  }
}

module.exports = {
  searchHandler
};
