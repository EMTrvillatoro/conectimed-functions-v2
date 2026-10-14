const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
  const settings = { timestampsInSnapshots: true };
  admin.firestore().settings(settings);
}

const db = admin.firestore();

exports.handler = async function(id) {
  try {
    let members = (
      await db
        .doc(`queues-of-representatives/${id}`)
        .collection('representatives')
        .get()
    ).docs.map(item => {
      return item.id;
    });

    for (const uid of members) {
      await checkRepresentantive(uid);
      await db.doc(`queues-of-representatives/${id}/representatives/${uid}`).delete();
    }

    await db.doc(`queues-of-representatives/${id}`).delete();
  } catch (error) {
    console.log(error);
  } finally {
    if (admin.apps.length) {
      admin.database().goOffline();
    }
  }
  return;
};

async function checkRepresentantive(uid) {
  try {
    const repre = (await db.doc(`users/${uid}`).get()).data();
    const plan = (await db.doc(`plans/${repre.plan}`).get()).data();
    //PRODUCTS
    await myProducts(plan, uid);
    //CONTACTS
    await myContacts(plan, uid);
    return;
  } catch (e) {
    console.error(e);
    return;
  }
}

async function updateProducts(products, data, uid) {
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
  return;
}

async function updateContacts(contacts, data, repID) {
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
  return;
}

async function updateChats(chats, data, uid) {
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
  return;
}

async function myProducts(plan, uid) {
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

      await updateProducts(products, { status: 'inactive' }, uid);

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

      await updateProducts(products, { status: 'active' }, uid);
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
      await updateProducts(PRODUCTS, { status: 'active' }, uid);
    }
  } catch (e) {
    console.error(e);
  }
}

async function myContacts(plan, uid) {
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

      await updateChats(chats, { initialized: false }, uid);

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

      await updateChats(chats, { initialized: true }, uid);

      // contacts

      let contacts = (
        await db
          .collection(`friends/${uid}/friends`)
          .where('status', '==', 'active')
          .get()
      ).docs.map(item => {
        return item.id;
      });

      await updateContacts(contacts, { status: 'inactive' }, uid);

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
        const INDEX = contacts.indexOf(repID);
        if (INDEX > -1) {
          return true;
        } else {
          return false;
        }
      });

      await updateContacts(final, { status: 'active' }, uid);
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

      await updateContacts(CONTACTS, { status: 'active' }, uid);
      await updateChats(CHATS, { initialized: true }, uid);
    }
  } catch (e) {
    console.error(e);
  }
}

exports.handlerCallable = async (data, context) => {
  const body = data;

  if (context.auth && context.auth.uid) {
    if (!body.representantive) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'El valor representantive es requerido para actualizar los parametros'
      );
    }

    await checkRepresentantive(body.representantive);

    return {
      sucess: true,
      message: `Datos actualizados correctamente: ${body.representantive}`
    };
  } else {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated');
  }
};
