const { HttpsError } = require('firebase-functions/v2/https');
const Tools = require('../Tools');
const moment = require('moment');

async function getSearchArrayHandlerRequest(req, res) {
  res.set('Content-Type', 'application/json');
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method === 'POST') {
    try {
      if (req.body && req.body.text) {
        return res.status(200).json({ search_array: Tools.arraySearch(req.body.text) });
      } else {
        return res.status(401).json({ message: 'missing parameters' });
      }
    } catch (e) {
      console.error('Error in getSearchArrayHandlerRequest:', e);
      return res.status(500).json(e);
    }
  } else {
    return res.status(405).json({ code: 405, message: `${req.method} Method Not Allowed` });
  }
}

async function updateSeachUserObjectCallable(request) {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated');
  }

  try {
    await updateUserMain();
    return { success: true };
  } catch (error) {
    console.error('Error in updateSeachUserObjectCallable:', error);
    throw new HttpsError('internal', error.message || 'Error updating user search');
  }
}

async function onUsersTasksHandler(event) {
  const admin = Tools.getFBAdminInstance();
  const db = admin.firestore();

  try {
    const snapshot = event.data;
    if (!snapshot || !snapshot.after) return true;

    const data = snapshot.after.data();
    const setId = snapshot.after.id;

    if (data && data.status === 'pending') {
      await updateUserMain({ startAfter: data.pivot });

      await db
        .collection('users-tasks')
        .doc(setId)
        .update({ status: 'complete' });
    }
    return true;
  } catch (error) {
    console.error('Error in onUsersTasksHandler:', error);
    return error;
  }
}

async function updateUserMain(params) {
  const admin = Tools.getFBAdminInstance();
  const db = admin.firestore();
  const limit = 150;

  let resp;
  if (params && params.startAfter) {
    const doc = await db
      .collection('users')
      .doc(params.startAfter)
      .get();
    resp = await db
      .collection('users')
      .orderBy('createdAt', 'asc')
      .startAfter(doc)
      .limit(limit)
      .get();
  } else {
    resp = await db
      .collection('users')
      .orderBy('createdAt', 'asc')
      .limit(limit)
      .get();
  }

  const docs = resp.docs;

  for (let item of docs) {
    await updateUserSearchDoc(item.id);
  }

  if (resp.size === limit) {
    const pivot = docs[resp.size - 1];
    const doc = await db
      .collection('users-tasks')
      .add({ pivot: pivot.id, date: moment().toDate(), status: 'complete' });

    await doc.update({ status: 'pending' });
  }

  return true;
}

async function updateUserSearchDoc(uid) {
  const admin = Tools.getFBAdminInstance();
  const db = admin.firestore();

  try {
    const userData = await db.doc(`users/${uid}`).get();
    let search = [];
    if (userData.get('type') === 'medico') {
      const data = await db.doc(`medico-meta/${uid}`).get();
      if (data.exists) {
        const user = data.data();
        const metaData = {
          state1: '',
          state2: '',
          specialty1: '',
          specialty2: ''
        };
        if (user && user.address1 && user.address1.state) {
          metaData.state1 = user.address1.state;
        }
        if (user && user.address2 && user.address2.state) {
          metaData.state2 = user.address2.state;
        }
        if (user && user.specialty1) {
          const num = Number(user.specialty1.id);
          if (num > 0) {
            const response = Tools.getSpecialty(num);
            if (response && response.name) {
              metaData.specialty1 = response.name;
            }
          }
        }
        if (user && user.specialty2) {
          const num = Number(user.specialty2.id);
          if (num > 0) {
            const response = Tools.getSpecialty(num);
            if (response && response.name) {
              metaData.specialty2 = response.name;
            }
          }
        }
        for (let element of Object.values(metaData)) {
          if (element) {
            const _search = Tools.arraySearch(element) || [];
            search = search.concat(_search);
          }
        }
      }
    } else if (userData.get('type') === 'profesional-de-la-salud') {
      const data = await db.doc(`profesional-de-la-salud-meta/${uid}`).get();
      if (data.exists) {
        const user = data.data();
        const metaData = {
          state1: '',
          state2: '',
          healthProfessionalType: ''
        };
        if (user && user.address1 && user.address1.state) {
          metaData.state1 = user.address1.state;
        }
        if (user && user.address2 && user.address2.state) {
          metaData.state2 = user.address2.state;
        }
        if (user && user.healthProfessionalType && user.healthProfessionalType.id) {
          const respHpt = await db.collection('types-of-health-professionals').doc(user.healthProfessionalType.id).get();
          metaData.healthProfessionalType = respHpt.get('name') || '';
        }
        for (let element of Object.values(metaData)) {
          if (element) {
            const _search = Tools.arraySearch(element) || [];
            search = search.concat(_search);
          }
        }
      }
    } else if (userData.get('type') === 'representante-medico') {
      const data = await db.doc(`representante-meta/${uid}`).get();
      if (data.exists && data.get('company')) {
        const company = await data.get('company').get();
        const name = company.get('name') || '';
        if (name) {
          const _search = Tools.arraySearch(name) || [];
          search = search.concat(_search);
        }
      }
    }

    let name = userData.get('name') || '';
    let lastName1 = userData.get('lastName1') || '';
    let lastName2 = userData.get('lastName2') || '';
    let email = userData.get('email') ? String(userData.get('email')).toLowerCase().trim() : '';

    const _search = Tools.arraySearch(`${name} ${lastName1} ${lastName2} ${lastName1} ${lastName2} ${name}`);
    search = search.concat(_search);

    await db.doc(`users/${uid}`).update({ search: search, email: email });
  } catch (error) {
    console.error('Error in updateUserSearchDoc:', error);
  }
}

module.exports = {
  getSearchArrayHandlerRequest,
  updateSeachUserObjectCallable,
  onUsersTasksHandler
};
