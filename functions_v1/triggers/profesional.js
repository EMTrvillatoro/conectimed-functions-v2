const functions = require('firebase-functions');
const Tools = require('../Tools');
const admin = Tools.getFBAdminInstance();
const db = admin.firestore();

/**
 * profesional-de-la-salud-meta Document write handler
 * @param {functions.Change<functions.firestore.DocumentSnapshot>} change - DocumentSnapshot.
 * @param {functions.EventContext} context - Context.
 * @returns {Promise<any>} Promise any
 */

exports.handler = async (change, context) => {
  const currentDocument = change && change.after && change.after.exists && change.after.exists === true ? change.after.data() : undefined;
  const oldDocument = change && change.before && change.before.exists && change.before.exists === true ? change.before.data() : undefined;

  const oldState = oldDocument && oldDocument.address1 && oldDocument.address1.state ? oldDocument.address1.state : undefined;
  const oldHealthProfessionalType = oldDocument && oldDocument.healthProfessionalType && oldDocument.healthProfessionalType.id ? oldDocument.healthProfessionalType.id : undefined;

  const currentState = currentDocument && currentDocument.address1 && currentDocument.address1.state ? currentDocument.address1.state : undefined;
  const currentHealthProfessionalType = currentDocument && currentDocument.healthProfessionalType && currentDocument.healthProfessionalType.id ? currentDocument.healthProfessionalType.id : undefined;

  if (currentDocument && oldDocument) {
    /**
     * DOCUMENT UPDATED ✅✅✅
     */

    // State 🌐🌐🌐
    if (!(oldState === currentState)) {
      //DECREMENT ➖➖➖
      await decrement(oldState, 'states-in-use-hp', 'name');
      // INCREMENT ➕➕➕
      await increment(currentState, 'states-in-use-hp', 'name', null);
    }
    // Health Professional Type 👨‍⚕️👨‍⚕️👨‍⚕️
    if (!(oldHealthProfessionalType === currentHealthProfessionalType)) {
      // DECREMENT ➖➖➖
      await decrement(oldHealthProfessionalType, 'types-of-health-professionals-in-use', 'id');
      // INCREMENT ➕➕➕
      await increment(currentHealthProfessionalType, 'types-of-health-professionals-in-use', 'id', { path: 'types-of-health-professionals', keys: ['name', 'value'] });
    }
    await setMetaData(currentDocument, change.after.id);
    console.log("=== DOCUMENT UPDATED ✅✅✅ ===");
  } else if (currentDocument && (!oldDocument)) {
    /**
     * DOCUMENT CREATED ✨✨✨
     */

    // State 🌐🌐🌐
    if (!(oldState === currentState)) {
      // INCREMENT ➕➕➕
      await increment(currentState, 'states-in-use-hp', 'name', null);
    }
    // Health Professional Type 👨‍⚕️👨‍⚕️👨‍⚕️
    if (!(oldHealthProfessionalType === currentHealthProfessionalType)) {
      // INCREMENT ➕➕➕
      await increment(currentHealthProfessionalType, 'types-of-health-professionals-in-use', 'id', { path: 'types-of-health-professionals', keys: ['name', 'value'] });
    }
    await setMetaData(currentDocument, change.after.id);
    console.log("=== DOCUMENT CREATED ✨✨✨ ===");
  } else if ((!currentDocument) && oldDocument) {
    /**
     * DOCUMENT DELETED ❌❌❌
     */

    // State 🌐🌐🌐
    if (!(oldState === currentState)) {
      //DECREMENT ➖➖➖
      await decrement(oldState, 'states-in-use-hp', 'name');
    }
    // Health Professional Type 👨‍⚕️👨‍⚕️👨‍⚕️
    if (!(oldHealthProfessionalType === currentHealthProfessionalType)) {
      // DECREMENT ➖➖➖
      await decrement(oldHealthProfessionalType, 'types-of-health-professionals-in-use', 'id');
    }
    console.log("=== DOCUMENT DELETED ❌❌❌ ===");
  } else {
    /**
     * NO ACTION 🙊🙉🙈
     */

    console.log("=== NO ACTION 🙊🙉🙈 ===");
  }
  return true;
}

/**
 * decrement
 * @param {string} oldValue old field value
 * @param {string} collection collection name
 * @param {string} searchField name of search field
 * @returns {Promise<any>}
 */

async function decrement(oldValue, collection, searchField) {
  try {
    const query = await db
      .collection(collection)
      .where(`${searchField}`, '==', oldValue)
      .get();

    if (!(query.empty === true)) {
      // EXIST
      const ref = query.docs[0].ref;
      await ref.update({ count: admin.firestore.FieldValue.increment(-1) });
    }
  } catch (e) {
    console.error("=== ERROR DECREMENT ===", e);
  }
  return true;
}

/**
 * increment
 * @param {string} currentValue current field value
 * @param {string} collection collection name
 * @param {string} searchField name of search field
 * @param {{path:string; keys:string[]}} AdditionalData keys of values to save
 * @returns {Promise<any>}
 */

async function increment(currentValue, collection, searchField, AdditionalData) {
  try {
    const query = await db
      .collection(collection)
      .where(`${searchField}`, '==', currentValue)
      .get();

    if (query.empty === true) {
      // NOT EXIST
      let data = {};
      data[searchField] = currentValue;
      data.count = 1;
      if (AdditionalData && AdditionalData.path && AdditionalData.keys) {
        const _resp = await db.collection(AdditionalData.path).doc(currentValue).get();
        const _data = _resp.data();
        for (const key of AdditionalData.keys) {
          if (_data[key]) {
            data[key] = _data[key];
          }
        }
        console.log("=== ADDING ADDITIONAL DATA 📎📄📎📄📎📄 ➕➕➕ ===",JSON.stringify(data));
      }
      await db.collection(collection).add(data);
    } else {
      // EXIST
      const ref = query.docs[0].ref;
      await ref.update({ count: admin.firestore.FieldValue.increment(1) });
    }
  } catch (e) {
    console.error("=== ERROR INCREMENT ===", e);
  }
  return true;
}

/**
 * setMetaData
 * @param {any} document document data 
 * @param {string} key document id
 * @returns {Promise<any>}
 */

async function setMetaData(document, key) {
  try {
    const unique = (value, index, self) => {
      return self.indexOf(value) === index;
    };
    const user = document;
    let filterMetaData = [];
    let metaData = {
      state1: '',
      healthProfessionalType: '',
    };
    if (user && user.address1 && user.address1.state && user.address1.state !== '') {
      filterMetaData.push(user.address1.state);
      metaData.state1 = user.address1.state;
    }
    if (user && user.healthProfessionalType) {
      const id = user.healthProfessionalType.id;
      if (id) {
        filterMetaData.push(id);
        metaData.healthProfessionalType = id;
      }
    }
    filterMetaData.push(String(metaData.state1) + metaData.healthProfessionalType);
    filterMetaData = filterMetaData.filter(unique);

    await db
      .collection('users')
      .doc(key)
      .update({
        'filter-meta-data': filterMetaData
      });
  } catch (e) {
    console.error("=== ERROR SET METADATA ===", e);
  }
  return true;
}
