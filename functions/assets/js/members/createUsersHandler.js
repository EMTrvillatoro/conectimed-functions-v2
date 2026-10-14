const { HttpsError } = require('firebase-functions/v2/https');
const { getFBAdminInstance } = require('../Tools');

function randomChain(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

async function createUsersHandler(req, res) {
  res.set('Content-Type', 'application/json');
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  const admin = getFBAdminInstance();
  const db = admin.firestore();

  try {
    const body = req.body || {};
    if (!body.users || !Array.isArray(body.users)) {
      return res.status(401).json({ message: 'Usuario no válido' });
    }

    const userData = body.users;
    const auth = [];

    // Crear usuarios en Auth
    for (let i = 0; i < userData.length; i++) {
      let resp;
      try {
        resp = await admin.auth().createUser({ email: userData[i].email, password: randomChain(8) });
      } catch (error) {
        console.error('Error creating auth user:', error);
      }
      auth.push({
        email: String(userData[i].email).toLowerCase(),
        uid: resp && resp.uid ? resp.uid : undefined,
        data: resp && resp.uid ? userData[i] : undefined,
        created: resp && resp.uid ? true : false
      });
    }

    // Crear usuarios en Firestore
    for (let i = 0; i < auth.length; i++) {
      if (auth[i].created === true) {
        const data = {
          uid: auth[i].uid,
          avatar: auth[i].data.avatar,
          wp_id: auth[i].data.wp_id,
          createdAt: auth[i].data.createdAt,
          email: auth[i].data.email,
          lastName1: auth[i].data.lastName1,
          lastName2: auth[i].data.lastName2,
          mobile: auth[i].data.mobile,
          name: auth[i].data.name,
          nameStr: auth[i].data.nameStr,
          phone: auth[i].data.phone,
          search: auth[i].data.search,
          type: auth[i].data.type,
          status: 'active',
          updatedAt: auth[i].data.updatedAt
        };

        try {
          await db.collection('users').doc(data.uid).set(data);
        } catch (error) {
          console.error('Error writing user doc:', error);
        }

        if (data.type === 'representante-medico') {
          let metaData = auth[i]['data']['meta-data'] || {};
          try {
            if (metaData.company) {
              const _company = await db.doc(metaData.company).get();
              metaData.company = _company.ref;
              try {
                await db.collection('users').doc(data.uid).update({
                  'filter-meta-data': [_company.id]
                });
              } catch (error) {
                console.error('Error updating filter-meta-data:', error);
              }
            }
          } catch (error) {
            console.error('Error getting company doc:', error);
          }

          try {
            await db.collection('representante-meta').doc(data.uid).set(metaData);
          } catch (error) {
            console.error('Error setting representante-meta:', error);
          }
        } else {
          const metaData = auth[i]['data']['meta-data'] || {};
          try {
            await db.collection('medico-meta').doc(data.uid).set(metaData);
          } catch (error) {
            console.error('Error setting medico-meta:', error);
          }
        }
      }
    }

    return res.status(200).json(auth);
  } catch (e) {
    console.error('Error capturado en createUsersHandler:', e);
    return res.status(500).json({ message: e.message || e });
  }
}

async function createAuthUserCallable(request) {
  if (!request || !request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated');
  }

  const data = request.data || {};
  if (!data.email || !data.password) {
    throw new HttpsError('invalid-argument', 'Missing parameters: email and password are required');
  }

  const admin = getFBAdminInstance();
  return await admin.auth().createUser({ email: data.email, password: data.password });
}

module.exports = {
  createUsersHandler,
  createAuthUserCallable
};
