const Tools = require('../Tools');
const functions = require('firebase-functions');
const moment = require('moment');

async function updateUser(params) {
  const admin = Tools.getFBAdminInstance();
  const db = admin.firestore();
  const limit = 150;

  let resp = undefined;

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
    await updateUserSearch(item.id);
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

async function updateUserSearch(uid) {
  const admin = Tools.getFBAdminInstance();
  const db = admin.firestore();

  try {
    const userData = await db.doc(`users/${uid}`).get();
    let search = [];
    if (userData.get('type') === 'medico') {
      const data = await db.doc(`medico-meta/${uid}`).get();
      if (data.exists === true) {
        const user = data.data();
        const metaData = {
          state1: '',
          state2: '',
          specialty1: '',
          specialty2: ''
        };
        if (user && user.address1 && user.address1.state && user.address1.state !== '') {
          metaData.state1 = user.address1.state;
        }
        if (user && user.address2 && user.address2.state && user.address2.state !== '') {
          metaData.state2 = user.address2.state;
        }
        if (user && user.specialty1) {
          const num = Number(user.specialty1.id);
          if (num > 0) {
            const response = Tools.getSpecialty(num);

            if (response && response.name) {
              metaData.specialty1 = response.name;
            } else {
              metaData.specialty1 = '';
            }
          }
        }
        if (user && user.specialty2) {
          const num = Number(user.specialty2.id);
          if (num > 0) {
            const response = Tools.getSpecialty(num);
            if (response && response.name) {
              metaData.specialty2 = response.name;
            } else {
              metaData.specialty2 = '';
            }
          }
        }
        for (let element of Object.values(metaData)) {
          if (element && element !== '') {
            const _search = Tools.arraySearch(element) || [];
            search = search.concat(_search);
          }
        }
      }
    } else if (userData.get('type') === 'profesional-de-la-salud') {
      const data = await db.doc(`profesional-de-la-salud-meta/${uid}`).get();
      if (data.exists === true) {
        const user = data.data();
        const metaData = {
          state1: '',
          state2: '',
          specialty1: '',
          specialty2: '',
          healthProfessionalType:'',
        };
        if (user && user.address1 && user.address1.state && user.address1.state !== '') {
          metaData.state1 = user.address1.state;
        }
        if (user && user.address2 && user.address2.state && user.address2.state !== '') {
          metaData.state2 = user.address2.state;
        }
        if (user && user.healthProfessionalType && user.healthProfessionalType.id) {
          const respHpt = await db.collection('types-of-health-professionals').doc(user.healthProfessionalType.id).get();
          metaData.healthProfessionalType = respHpt.get('name') || '';
        }
        for (let element of Object.values(metaData)) {
          if (element && element !== '') {
            const _search = Tools.arraySearch(element) || [];
            search = search.concat(_search);
          }
        }
      }
    } else if (userData.get('type') === 'representante-medico') {
      const data = await db.doc(`representante-meta/${uid}`).get();
      if (data.exists === true) {
        if (data.get('company')) {
          const company = await data.get('company').get();
          const name = company.get('name') ? company.get('name') : '';
          if (name && name !== '') {
            const _search = Tools.arraySearch(name) || [];
            search = search.concat(_search);
          }
        }
      }
    }
    let name = '';
    let lastName1 = '';
    let lastName2 = '';
    let email = '';

    if (userData && userData.get('name')) {
      name = userData.get('name');
    }

    if (userData && userData.get('lastName1')) {
      lastName1 = userData.get('lastName1');
    }

    if (userData && userData.get('lastName2')) {
      lastName2 = userData.get('lastName2');
    }

    if (userData && userData.get('email')) {
      email = String(userData.get('email'))
        .toLocaleLowerCase()
        .trim();
    }

    const _search = Tools.arraySearch(`${name} ${lastName1} ${lastName2} ${lastName1} ${lastName2} ${name}`);

    search = search.concat(_search);
    await db.doc(`users/${uid}`).update({ search: search, email: email });
    return;
  } catch (error) {
    console.error(error);
    return;
  }
}

exports.handlerCallable = async (data, context) => {
  if (context.auth && context.auth.uid) {
    try {
      await updateUser();
    } catch (error) {
      throw new functions.https.HttpsError(
        'unexpected error',
        'The function was called and an unexpected error occurred'
      );
    }
    return { success: true };
  } else {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated');
  }
};

exports.updateSearchArrayCallable = async (data, context) => {
  if (context.auth && context.auth.uid) {
    try {
      if (!data.user_id) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated');
      }
      await updateUserSearch(data.user_id);
    } catch (error) {
      throw new functions.https.HttpsError(
        'unexpected error',
        'The function was called and an unexpected error occurred'
      );
    }
    return { success: true };
  } else {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated');
  }
};

exports.handlerOnUpdate = async (change, context) => {
  const admin = Tools.getFBAdminInstance();
  const db = admin.firestore();

  try {
    const data = change.after.data();
    const setId = change.after.id;

    if (data && data.status && data.status === 'pending') {
      await updateUser({ startAfter: data.pivot });

      await db
        .collection('users-tasks')
        .doc(setId)
        .update({ status: 'complete' });
    }
    return true;
  } catch (error) {
    console.error('### ' + context.eventType + ' ###', error);
    return error;
  }
};

exports.handlerRequest = function(request, response) {
  response.header('Content-Type', 'application/json');
  response.header('Access-Control-Allow-Origin', '*');
  response.header('Access-Control-Allow-Headers', 'Content-Type');
  if (request.method === 'OPTIONS') {
    return response.status(204).send('');
  }
  if (request && request.method === 'POST') {
    try {
      if (request && request.body && request.body.text) {
        return response.status(200).send({ search_array: Tools.arraySearch(request.body.text) });
      } else {
        return response.status(401).send({ message: 'missing parameters' });
      }
    } catch (e) {
      console.error('Error capturado', e);
      return response.status(500).send(e);
    }
  } else {
    return response.status(405).send({ code: 405, message: `${request.method} Method Not Allowed` });
  }
};
