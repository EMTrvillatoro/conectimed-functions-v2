const Tools = require('../Tools');

const EQUAL_ARRAYS = (a, b) => {
  if (a.length !== b.length) return false;
  const uniqueValues = new Set([...a, ...b]);
  for (const v of uniqueValues) {
    const aCount = a.filter(e => e === v).length;
    const bCount = b.filter(e => e === v).length;
    if (aCount !== bCount) return false;
  }
  return true;
};

async function onUsersCreateHandler(event) {
  const admin = Tools.getFBAdminInstance();
  const db = admin.firestore();

  try {
    const snapshot = event.data;
    if (!snapshot) return true;

    const data = snapshot.data();
    const id = event.params.userId || snapshot.id;

    if (data && data.firstCharacter && data.type) {
      await setUserAction(db, admin, data, id, undefined);
      const ref = db.collection('friends').doc(id).collection('friends');
      const collection = await ref.get();
      for (const element of collection.docs) {
        await setUserAction(db, admin, data, id, element.id);
      }
      console.log('✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓ Fin Set (onUsersCreateHandler) ✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓');
    }
    return true;
  } catch (error) {
    console.error('Error in onUsersCreateHandler:', error);
    return error;
  }
}

async function onUsersUpdateHandler(event) {
  const admin = Tools.getFBAdminInstance();
  const db = admin.firestore();

  try {
    const snapshot = event.data;
    if (!snapshot || !snapshot.before || !snapshot.after) return true;

    const beforeData = snapshot.before.data();
    const afterData = snapshot.after.data();
    const deleteId = snapshot.before.id;
    const setId = snapshot.after.id;

    const a1 = Array.from(beforeData['filter-meta-data'] || []);
    const a2 = Array.from(afterData['filter-meta-data'] || []);

    if (
      !EQUAL_ARRAYS(a1, a2) ||
      beforeData.firstCharacter !== afterData.firstCharacter ||
      beforeData.lastName1 !== afterData.lastName1 ||
      beforeData.lastName2 !== afterData.lastName2 ||
      beforeData.name !== afterData.name ||
      beforeData.nameStr !== afterData.nameStr ||
      beforeData.status !== afterData.status ||
      beforeData.type !== afterData.type
    ) {
      if (beforeData && beforeData.firstCharacter && beforeData.type) {
        await deleteUserAction(db, admin, beforeData, deleteId, undefined);
        const ref = db.collection('friends').doc(deleteId).collection('friends');
        const collection = await ref.get();
        for (const element of collection.docs) {
          await deleteUserAction(db, admin, beforeData, deleteId, element.id);
        }
      }
      if (afterData && afterData.firstCharacter && afterData.type) {
        await setUserAction(db, admin, afterData, setId, undefined);
        const ref = db.collection('friends').doc(setId).collection('friends');
        const collection = await ref.get();
        for (const element of collection.docs) {
          await setUserAction(db, admin, afterData, setId, element.id);
        }
      }
    }
    return true;
  } catch (error) {
    console.error('Error in onUsersUpdateHandler:', error);
    return error;
  }
}

async function onUsersDeleteHandler(event) {
  const admin = Tools.getFBAdminInstance();
  const db = admin.firestore();

  try {
    const snapshot = event.data;
    if (!snapshot) return true;

    const data = snapshot.data();
    const id = event.params.userId || snapshot.id;

    if (data && data.firstCharacter && data.type) {
      await deleteUserAction(db, admin, data, id, undefined);
      const ref = db.collection('friends').doc(id).collection('friends');
      const collection = await ref.get();
      for (const element of collection.docs) {
        await deleteUserAction(db, admin, data, id, element.id);
      }
    }
    return true;
  } catch (error) {
    console.error('Error in onUsersDeleteHandler:', error);
    return error;
  }
}

async function onUserUpdateHandler(event) {
  try {
    const snapshot = event.data;
    if (!snapshot || !snapshot.before || !snapshot.after) return true;

    const beforeData = snapshot.before.data();
    const afterData = snapshot.after.data();

    const first = Array.from(beforeData && beforeData['filter-meta-data'] ? beforeData['filter-meta-data'] : []).sort();
    const second = Array.from(afterData && afterData['filter-meta-data'] ? afterData['filter-meta-data'] : []).sort();

    if (
      (beforeData && beforeData.email && beforeData.email !== afterData.email) ||
      (beforeData && beforeData.lastName1 && beforeData.lastName1 !== afterData.lastName1) ||
      (beforeData && beforeData.lastName2 && beforeData.lastName2 !== afterData.lastName2) ||
      (beforeData && beforeData.mobile && beforeData.mobile !== afterData.mobile) ||
      (beforeData && beforeData.name && beforeData.name !== afterData.name) ||
      (beforeData && beforeData.phone && beforeData.phone !== afterData.phone) ||
      JSON.stringify(first) !== JSON.stringify(second)
    ) {
      if (snapshot.after && snapshot.after.id) {
        await snapshot.after.ref.update({ validatedStatus: 'pending' });
        console.log("¡User successfully updated!");
      }
    }
    return true;
  } catch (error) {
    console.error('Error in onUserUpdateHandler:', error);
    return error;
  }
}

async function deleteUserAction(db, admin, docData, id, uid) {
  const DECREMENT = admin.firestore.FieldValue.increment(-1);
  const path = uid ? 'friends/' + uid + '/information' : 'information';

  if (uid) {
    const ref = db.doc('friends/' + uid);
    try {
      await db.collection('friends').doc(uid).collection('friends').doc(id).delete();
    } catch (error) {
      console.error(error);
    }
    try {
      await ref.set({ count: DECREMENT }, { merge: true });
    } catch (error) {
      console.error(error);
    }
  }

  await alphabetCountDelete(db, admin, id, path, docData);
  await filtersCountDelete(db, admin, id, path, docData);
}

async function setUserAction(db, admin, docData, id, uid) {
  const INCREMENT = admin.firestore.FieldValue.increment(1);
  const path = uid ? 'friends/' + uid + '/information' : 'information';

  if (uid) {
    const ref = db.doc('friends/' + uid);
    try {
      await db.collection('friends').doc(uid).collection('friends').doc(id).set(docData);
    } catch (error) {
      console.error(error);
    }
    try {
      await ref.set({ count: INCREMENT }, { merge: true });
    } catch (error) {
      console.error(error);
    }
  }

  await alphabetCountSet(db, admin, id, path, docData);
  await filtersCountSet(db, admin, id, path, docData);
}

async function alphabetCountSet(db, admin, id, path, docData) {
  const INCREMENT = admin.firestore.FieldValue.increment(1);
  const ref1 = db
    .collection(path)
    .doc('counters')
    .collection('alphabet')
    .doc(docData.type)
    .collection('letters')
    .doc(docData.firstCharacter);

  try {
    await ref1.collection('users').doc(id).set(docData);
  } catch (error) {
    console.error(error);
  }

  try {
    await ref1.set({ count: INCREMENT }, { merge: true });
  } catch (error) {
    console.error(error);
  }
  return true;
}

async function filtersCountSet(db, admin, id, path, docData) {
  const INCREMENT = admin.firestore.FieldValue.increment(1);
  let filters = docData['filter-meta-data'] ? Array.from(docData['filter-meta-data']) : [];

  for (const filter of filters) {
    if (docData && docData.type && filter) {
      const ref = db
        .collection(path)
        .doc('counters')
        .collection('filters')
        .doc('type')
        .collection(docData.type)
        .doc(filter);

      try {
        ref.collection('users').doc(id).set(docData);
      } catch (error) {
        console.error(error);
      }

      try {
        let countJSON = { count: INCREMENT };
        if (docData && docData.type === 'representante-medico') {
          try {
            const resp = await db.doc('companies/' + filter).get();
            let company = resp.data();
            company.count = INCREMENT;
            countJSON = company;
          } catch (error) {
            console.error(error);
          }
        }
        await ref.set(countJSON, { merge: true });
      } catch (error) {
        console.error(error);
      }
    }
  }
  return true;
}

async function alphabetCountDelete(db, admin, id, path, docData) {
  const DECREMENT = admin.firestore.FieldValue.increment(-1);
  const ref1 = db
    .collection(path)
    .doc('counters')
    .collection('alphabet')
    .doc(docData.type)
    .collection('letters')
    .doc(docData.firstCharacter);

  try {
    await ref1.collection('users').doc(id).delete();
  } catch (error) {
    console.error(error);
  }

  try {
    await ref1.set({ count: DECREMENT }, { merge: true });
  } catch (error) {
    console.error(error);
  }

  return true;
}

async function filtersCountDelete(db, admin, id, path, docData) {
  const DECREMENT = admin.firestore.FieldValue.increment(-1);
  let filters = docData['filter-meta-data'] ? Array.from(docData['filter-meta-data']) : [];

  for (const filter of filters) {
    if (docData && docData.type && filter) {
      const ref = db
        .collection(path)
        .doc('counters')
        .collection('filters')
        .doc('type')
        .collection(docData.type)
        .doc(filter);

      try {
        await ref.collection('users').doc(id).delete();
      } catch (error) {
        console.error(error);
      }

      try {
        await ref.set({ count: DECREMENT }, { merge: true });
      } catch (error) {
        console.error(error);
      }
    }
  }
  return true;
}

module.exports = {
  onUsersCreateHandler,
  onUsersUpdateHandler,
  onUsersDeleteHandler,
  onUserUpdateHandler
};
