const { HttpsError } = require('firebase-functions/v2/https');
const Tools = require('../Tools');

async function checkRepresentantiveCallable(request) {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated');
  }

  const data = request.data || {};
  if (!data.representantive) {
    throw new HttpsError(
      'invalid-argument',
      'El valor representantive es requerido para actualizar los parametros'
    );
  }

  await checkRepresentantive(data.representantive);

  return {
    sucess: true,
    message: `Datos actualizados correctamente: ${data.representantive}`
  };
}

async function checkRepresentantive(uid) {
  const admin = Tools.getFBAdminInstance();
  const db = admin.firestore();

  try {
    const repreDoc = await db.doc(`users/${uid}`).get();
    if (!repreDoc.exists) return;
    const repre = repreDoc.data();
    if (!repre.plan) return;

    const planDoc = await db.doc(`plans/${repre.plan}`).get();
    if (!planDoc.exists) return;
    const plan = planDoc.data();

    // PRODUCTS
    await myProducts(db, plan, uid);
    // CONTACTS
    await myContacts(db, plan, uid);
  } catch (e) {
    console.error('Error in checkRepresentantive:', e);
  }
}

async function updateProducts(db, products, data, uid) {
  let originalArray = Array.from(products).map(item => {
    const ref = db.doc(`products/${item.id}`);
    return { ref: ref, data: data };
  });
  let newArray = [];
  const LONG_ARRAY = 500;
  for (let i = 0; i < originalArray.length; i += LONG_ARRAY) {
    let piece = originalArray.slice(i, i + LONG_ARRAY);
    newArray.push(piece);
  }
  for (const array of newArray) {
    const batch = db.batch();
    for (const element of array) {
      batch.update(element.ref, element.data);
    }
    await batch.commit();
  }
  console.log(`********* Products updated: (${uid})*********`);
}

async function updateContacts(db, contacts, data, repID) {
  let originalArray = Array.from(contacts).map(uid => {
    const ref = db.doc(`friends/${repID}/friends/${uid}`);
    return { ref: ref, data: data };
  });
  let newArray = [];
  const LONG_ARRAY = 500;
  for (let i = 0; i < originalArray.length; i += LONG_ARRAY) {
    let piece = originalArray.slice(i, i + LONG_ARRAY);
    newArray.push(piece);
  }
  for (const array of newArray) {
    const batch = db.batch();
    for (const element of array) {
      batch.update(element.ref, element.data);
    }
    await batch.commit();
  }
  console.log(`********* Contacts updated: (${repID})*********`);
}

async function updateChats(db, chats, data, uid) {
  let originalArray = Array.from(chats).map(item => {
    const ref = db.doc(`chats/${item}`);
    return { ref: ref, data: data };
  });
  let newArray = [];
  const LONG_ARRAY = 500;
  for (let i = 0; i < originalArray.length; i += LONG_ARRAY) {
    let piece = originalArray.slice(i, i + LONG_ARRAY);
    newArray.push(piece);
  }
  for (const array of newArray) {
    const batch = db.batch();
    for (const element of array) {
      batch.update(element.ref, element.data);
    }
    await batch.commit();
  }
  console.log(`********* Chats updated: (${uid})*********`);
}

async function myProducts(db, plan, uid) {
  try {
    if (plan && plan.max_products_limit === true) {
      let products = (
        await db
          .collection('products')
          .where('status', '==', 'active')
          .where('uid', '==', uid)
          .orderBy('date', 'desc')
          .get()
      ).docs.map(item => {
        let data = item.data();
        data.id = item.id;
        return data;
      });

      await updateProducts(db, products, { status: 'inactive' }, uid);

      products = (
        await db
          .collection('products')
          .where('status', '==', 'inactive')
          .where('uid', '==', uid)
          .orderBy('date', 'desc')
          .limit(Number(plan.max_products))
          .get()
      ).docs.map(item => {
        let data = item.data();
        data.id = item.id;
        return data;
      });

      await updateProducts(db, products, { status: 'active' }, uid);
    } else {
      const PRODUCTS = (
        await db
          .collection('products')
          .where('status', '==', 'inactive')
          .where('uid', '==', uid)
          .orderBy('date', 'desc')
          .get()
      ).docs.map(item => {
        let data = item.data();
        data.id = item.id;
        return data;
      });
      await updateProducts(db, PRODUCTS, { status: 'active' }, uid);
    }
  } catch (e) {
    console.error(e);
  }
}

async function myContacts(db, plan, uid) {
  try {
    if (plan && plan.max_contacts_limit === true) {
      let chats = (
        await db
          .collection('chats')
          .where('initialized', '==', true)
          .where('participants', 'array-contains', uid)
          .orderBy('last_message.date', 'desc')
          .get()
      ).docs.map(item => {
        return item.id;
      });

      await updateChats(db, chats, { initialized: false }, uid);

      const RESP1 = await db
        .collection('chats')
        .where('initialized', '==', false)
        .where('participants', 'array-contains', uid)
        .orderBy('last_message.date', 'desc')
        .limit(Number(plan.max_contacts))
        .get();

      chats = RESP1.docs.map(item => {
        return item.id;
      });

      await updateChats(db, chats, { initialized: true }, uid);

      let contacts = (
        await db
          .collection(`friends/${uid}/friends`)
          .where('status', '==', 'active')
          .get()
      ).docs.map(item => {
        return item.id;
      });

      await updateContacts(db, contacts, { status: 'inactive' }, uid);

      contacts = (
        await db
          .collection(`friends/${uid}/friends`)
          .where('status', '==', 'inactive')
          .get()
      ).docs.map(item => {
        return item.id;
      });

      const RESP2 = await db
        .collection('chats')
        .where('initialized', '==', true)
        .where('participants', 'array-contains', uid)
        .orderBy('last_message.date', 'desc')
        .get();

      let repsInChats = RESP2.docs
        .map(item => {
          let data = item.data();
          let participants = Array.from(data.participants);
          const INDEX = participants.indexOf(uid);
          if (INDEX > -1) {
            participants.splice(INDEX, 1);
          }
          return participants[0];
        })
        .splice(0, Number(plan.max_contacts));

      let final = repsInChats.filter(repID => {
        return contacts.indexOf(repID) > -1;
      });

      await updateContacts(db, final, { status: 'active' }, uid);
    } else {
      const CONTACTS = (
        await db
          .collection(`friends/${uid}/friends`)
          .where('status', '==', 'inactive')
          .get()
      ).docs.map(item => {
        return item.id;
      });

      const CHATS = (
        await db
          .collection('chats')
          .where('initialized', '==', false)
          .where('participants', 'array-contains', uid)
          .orderBy('last_message.date', 'desc')
          .get()
      ).docs.map(item => {
        return item.id;
      });

      await updateContacts(db, CONTACTS, { status: 'active' }, uid);
      await updateChats(db, CHATS, { initialized: true }, uid);
    }
  } catch (e) {
    console.error(e);
  }
}

module.exports = {
  checkRepresentantiveCallable,
  checkRepresentantive
};
