const admin = require('firebase-admin');
const functions = require('firebase-functions');
const INCREMENT = admin.firestore.FieldValue.increment(1);
const DECREMENT = admin.firestore.FieldValue.increment(-1);
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

if (!admin.apps.length) {
  admin.initializeApp();
  const settings = { timestampsInSnapshots: true };
  admin.firestore().settings(settings);
}

const db = admin.firestore();

// Users Handlers

exports.createUserHandler = async (change, context) => {
  try {
    const data = change.data();
    const id = change.id;
    if (data && data.firstCharacter && data.type) {
      await setUserAction(data, id, undefined);
      const ref = db
        .collection('friends')
        .doc(id)
        .collection('friends');
      const collection = await ref.get();
      for (const element of collection.docs) {
        await setUserAction(data, id, element.id);
      }
      console.log('✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓ Fin Set (createUserHandler) ✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓');
    } else {
      console.log('xxxxxxxxxxxxxxxxxxxx Fin Set (createUserHandler) xxxxxxxxxxxxxxxxxxxx');
    }
    return true;
  } catch (error) {
    console.error('### ' + context.eventType + ' ###', error);
    return error;
  }
};

exports.updateUserHandler = async (change, context) => {
  try {
    const beforeData = change.before.data();
    const afterData = change.after.data();
    const deleteId = change.before.id;
    const setId = change.after.id;
    const a1 = Array.from(beforeData['filter-meta-data']);
    const a2 = Array.from(afterData['filter-meta-data']);
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
        await deleteUserAction(beforeData, deleteId, undefined);
        const ref = db
          .collection('friends')
          .doc(deleteId)
          .collection('friends');
        const collection = await ref.get();
        for (const element of collection.docs) {
          await deleteUserAction(beforeData, deleteId, element.id);
        }
        console.log('✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓ Fin Delete (updateUserHandler) ✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓');
      } else {
        console.log('xxxxxxxxxxxxxxxxxxxx Fin Delete (updateUserHandler) xxxxxxxxxxxxxxxxxxxx');
      }
      if (afterData && afterData.firstCharacter && afterData.type) {
        await setUserAction(afterData, setId, undefined);
        const ref = db
          .collection('friends')
          .doc(setId)
          .collection('friends');
        const collection = await ref.get();
        for (const element of collection.docs) {
          await setUserAction(afterData, setId, element.id);
        }
        console.log('✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓ Fin Set (updateUserHandler) ✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓');
      } else {
        console.log('xxxxxxxxxxxxxxxxxxxx Fin Set (updateUserHandler) xxxxxxxxxxxxxxxxxxxx');
      }
    } else {
      console.log('xxxxxxxxxxxxxxxxxxxx updateUserHandler not triggered xxxxxxxxxxxxxxxxxxxx');
    }
    return true;
  } catch (error) {
    console.error('### ' + context.eventType + ' ###', error);
    return error;
  }
};

exports.deleteUserHandler = async (change, context) => {
  try {
    const data = change.data();
    const id = change.id;
    if (data && data.firstCharacter && data.type) {
      await deleteUserAction(data, id, undefined);
      const ref = db
        .collection('friends')
        .doc(id)
        .collection('friends');
      const collection = await ref.get();
      for (const element of collection.docs) {
        await deleteUserAction(data, id, element.id);
      }
      console.log('✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓ Fin Delete (deleteUserHandler) ✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓');
    } else {
      console.log('xxxxxxxxxxxxxxxxxxxx Fin Delete (deleteUserHandler) xxxxxxxxxxxxxxxxxxxx');
    }
    return true;
  } catch (error) {
    console.error('### ' + context.eventType + ' ###', error);
    return error;
  }
};

// Contacts Handlers

exports.createContactHandler = async (change, context) => {
  try {
    const data = change.data();
    if (
      data.initiator !== '' &&
      data.requested !== '' &&
      data.status === 'accepted' &&
      ((data.from === 'admin' && data.updated === true) || data.from !== 'admin')
    ) {
      const initiator = data.initiator;
      const requested = data.requested;
      await setContactAction(initiator, requested);
      console.log('✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓ Fin Set (createContactHandler) ✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓');
    } else {
      console.log('xxxxxxxxxxxxxxxxxxxx Fin Set (createContactHandler) xxxxxxxxxxxxxxxxxxxx');
    }
    return true;
  } catch (error) {
    console.error('### ' + context.eventType + ' ###', error);
    return error;
  }
};

exports.updateContactHandler = async (change, context) => {
  try {
    const beforeData = change.before.data();
    const afterData = change.after.data();
    if (
      beforeData.initiator !== '' &&
      beforeData.requested !== '' &&
      beforeData.status === 'accepted' &&
      ((beforeData.from === 'admin' && beforeData.updated === true) || beforeData.from !== 'admin')
    ) {
      const initiator = beforeData.initiator;
      const requested = beforeData.requested;
      await deleteContactAction(initiator, requested);
      console.log('✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓ Fin Delete (updateContactHandler) ✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓');
    } else {
      console.log('xxxxxxxxxxxxxxxxxxxx Fin Delete (updateContactHandler) xxxxxxxxxxxxxxxxxxxx');
    }
    if (
      afterData.initiator !== '' &&
      afterData.requested !== '' &&
      afterData.status === 'accepted' &&
      ((afterData.from === 'admin' && afterData.updated === true) || afterData.from !== 'admin')
    ) {
      const initiator = afterData.initiator;
      const requested = afterData.requested;
      await setContactAction(initiator, requested);
      console.log('✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓ Fin Set (updateContactHandler) ✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓');
    } else {
      console.log('xxxxxxxxxxxxxxxxxxxx Fin Set (updateContactHandler) xxxxxxxxxxxxxxxxxxxx');
    }
    return true;
  } catch (error) {
    console.error('### ' + context.eventType + ' ###', error);
    return error;
  }
};

exports.deleteContactHandler = async (change, context) => {
  try {
    const data = change.data();
    if (
      data.initiator !== '' &&
      data.requested !== '' &&
      data.attribute !== 'duplicated' &&
      ((data.from === 'admin' && data.updated === true) || data.from !== 'admin')
    ) {
      const initiator = data.initiator;
      const requested = data.requested;
      await deleteContactAction(initiator, requested);
      console.log('✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓ Fin Delete (deleteContactHandler) ✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓');
    } else {
      console.log('xxxxxxxxxxxxxxxxxxxx Fin Delete (deleteContactHandler) xxxxxxxxxxxxxxxxxxxx');
    }
    return true;
  } catch (error) {
    console.error('### ' + context.eventType + ' ###', error);
    return error;
  }
};

// Functions

async function deleteContactAction(initiator, requested) {
  let initiatorData;
  let requestedData;

  //Get data from both users

  try {
    const resp = await db
      .collection('users')
      .doc(initiator)
      .get();
    initiatorData = resp.data();
  } catch (error) {
    console.error(error);
  }

  try {
    const resp = await db
      .collection('users')
      .doc(requested)
      .get();
    requestedData = resp.data();
  } catch (error) {
    console.error(error);
  }

  // Initiator Friends

  const ref1 = db.collection('friends').doc(initiator);

  try {
    const ref = await ref1.collection('friends').doc(requested);
    const doc = await ref.get();
    if (doc.exists === true) {
      await ref.delete();
      await ref1.set({ count: DECREMENT }, { merge: true });
    }
  } catch (error) {
    console.error(error);
  }

  // Requested Friends

  const ref2 = db.collection('friends').doc(requested);

  try {
    const ref = await ref2.collection('friends').doc(initiator);
    const doc = await ref.get();
    if (doc.exists === true) {
      await ref.delete();
      await ref2.set({ count: DECREMENT }, { merge: true });
    }
  } catch (error) {
    console.error(error);
  }

  // Initiator Alphabet & filters Count
  const path1 = 'friends/' + initiator + '/information';
  try {
    await alphabetCountDelete(requested, path1, requestedData);
    await filtersCountDelete(requested, path1, requestedData);
  } catch (error) {
    console.error(error);
  }

  // Requested Alphabet & filters Count
  const path2 = 'friends/' + requested + '/information';
  try {
    await alphabetCountDelete(initiator, path2, initiatorData);
    await filtersCountDelete(initiator, path2, initiatorData);
  } catch (error) {
    console.error(error);
  }

  return true;
}

async function setContactAction(initiator, requested) {
  let initiatorData;
  let requestedData;

  //Get data from both users

  try {
    const resp = await db
      .collection('users')
      .doc(initiator)
      .get();
    initiatorData = resp.data();
  } catch (error) {
    console.error(error);
  }

  try {
    const resp = await db
      .collection('users')
      .doc(requested)
      .get();
    requestedData = resp.data();
  } catch (error) {
    console.error(error);
  }

  // Initiator Friends

  const ref1 = db.collection('friends').doc(initiator);

  try {
    await ref1
      .collection('friends')
      .doc(requested)
      .set(requestedData);
    await ref1.set({ count: INCREMENT }, { merge: true });
  } catch (error) {
    console.error(error);
  }

  // Requested Friends

  const ref2 = db.collection('friends').doc(requested);

  try {
    await ref2
      .collection('friends')
      .doc(initiator)
      .set(initiatorData);
    await ref2.set({ count: INCREMENT }, { merge: true });
  } catch (error) {
    console.error(error);
  }

  // Initiator Alphabet & filters Count
  const path1 = 'friends/' + initiator + '/information';
  try {
    await alphabetCountSet(requested, path1, requestedData);
    await filtersCountSet(requested, path1, requestedData);
  } catch (error) {
    console.error(error);
  }

  // Requested Alphabet & filters Count
  const path2 = 'friends/' + requested + '/information';
  try {
    await alphabetCountSet(initiator, path2, initiatorData);
    await filtersCountSet(initiator, path2, initiatorData);
  } catch (error) {
    console.error(error);
  }

  return true;
}

async function deleteUserAction(docData, id, uid) {
  const path = uid ? 'friends/' + uid + '/information' : 'information';
  if (uid) {
    const ref = db.doc('friends/' + uid);

    try {
      await db
        .collection('friends')
        .doc(uid)
        .collection('friends')
        .doc(id)
        .delete();
    } catch (error) {
      console.error(error);
    }

    try {
      await ref.set({ count: DECREMENT }, { merge: true });
    } catch (error) {
      console.error(error);
    }
  }

  // Alphabet Count
  await alphabetCountDelete(id, path, docData);

  // Filters Count
  await filtersCountDelete(id, path, docData);
  return;
}

async function setUserAction(docData, id, uid) {
  const path = uid ? 'friends/' + uid + '/information' : 'information';
  if (uid) {
    const ref = db.doc('friends/' + uid);

    try {
      await db
        .collection('friends')
        .doc(uid)
        .collection('friends')
        .doc(id)
        .set(docData);
    } catch (error) {
      console.error(error);
    }

    try {
      await ref.set({ count: INCREMENT }, { merge: true });
    } catch (error) {
      console.error(error);
    }
  }

  // Alphabet Count
  await alphabetCountSet(id, path, docData);

  // Filters Count

  await filtersCountSet(id, path, docData);

  return;
}

//Shared functions

async function alphabetCountSet(id, path, docData) {
  // Alphabet Count

  const ref1 = db
    .collection(path)
    .doc('counters')
    .collection('alphabet')
    .doc(docData.type)
    .collection('letters')
    .doc(docData.firstCharacter);

  try {
    await ref1
      .collection('users')
      .doc(id)
      .set(docData);
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

async function filtersCountSet(id, path, docData) {
  // Filters Count
  let filters = [];

  if (docData['filter-meta-data']) {
    filters = Array.from(docData['filter-meta-data']);
  }

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
        ref
          .collection('users')
          .doc(id)
          .set(docData);
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

async function alphabetCountDelete(id, path, docData) {
  // Alphabet Count
  const ref1 = db
    .collection(path)
    .doc('counters')
    .collection('alphabet')
    .doc(docData.type)
    .collection('letters')
    .doc(docData.firstCharacter);

  try {
    await ref1
      .collection('users')
      .doc(id)
      .delete();
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

async function filtersCountDelete(id, path, docData) {
  // Filters Count
  let filters = [];

  if (docData['filter-meta-data']) {
    filters = Array.from(docData['filter-meta-data']);
  }

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
        await ref
          .collection('users')
          .doc(id)
          .delete();
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

/**
 * updateUserHandler
 * @param {functions.Change<functions.firestore.QueryDocumentSnapshot>} change - Change.
 * @param {functions.EventContext} context - Context.
 * @returns {Promise<void>} Promise void
 */

exports.onUserUpdateHandler = async (change, context) => {
  try {
    const beforeData = change.before.data();
    const afterData = change.after.data();
    const first = Array.from(
      beforeData && beforeData['filter-meta-data'] ? beforeData['filter-meta-data'] : []
    ).sort();
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
      if (change && change.after && change.after.id) {
        await change.after.ref.update({ validatedStatus: 'pending' });
        console.log("¡User successfully updated!");
      }
    }
    return true;
  } catch (error) {
    console.error('### ' + context.eventType + ' ###', error);
    return error;
  }
};
