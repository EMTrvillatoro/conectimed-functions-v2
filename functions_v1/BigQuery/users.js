const { BigQuery } = require('@google-cloud/bigquery');
const functions = require('firebase-functions');
const Tools = require('../Tools');
const admin = Tools.getFBAdminInstance();
const db = admin.firestore();
const datasetId = 'Users';
const bigqueryClient = new BigQuery();
const dataset = bigqueryClient.dataset(datasetId);
const medTable = 'medicosData';
const repTable = 'representantesData';

/**
 * updateUserHandler
 * @param {functions.Change<functions.firestore.QueryDocumentSnapshot>} change - Change.
 * @param {functions.EventContext} context - Context.
 * @returns {Promise<void>} Promise void
 */

exports.updateUserHandler = async (change, context) => {
  try {
    const beforeData = change.before.data();
    const afterData = change.after.data();

    if (
      afterData &&
      afterData.email !== undefined &&
      afterData.email !== null &&
      afterData.email !== '' &&
      afterData.firstCharacter !== undefined &&
      afterData.firstCharacter !== null &&
      afterData.firstCharacter !== '' &&
      afterData.lastName1 !== undefined &&
      afterData.lastName1 !== null &&
      afterData.lastName1 !== '' &&
      afterData.mobile !== undefined &&
      afterData.mobile !== null &&
      afterData.mobile !== '' &&
      afterData.name !== undefined &&
      afterData.name !== null &&
      afterData.name !== '' &&
      afterData.nameStr !== undefined &&
      afterData.nameStr !== null &&
      afterData.nameStr !== '' &&
      afterData.status !== undefined &&
      afterData.status !== null &&
      afterData.status !== '' &&
      afterData.type !== undefined &&
      afterData.type !== null &&
      afterData.type !== '' &&
      afterData.uid !== undefined &&
      afterData.uid !== null &&
      afterData.uid !== ''
    ) {
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
        (beforeData && beforeData.status && beforeData.status !== afterData.status) ||
        (beforeData && beforeData.type && beforeData.type !== afterData.type) ||
        (beforeData && beforeData.uuid && beforeData.uuid !== afterData.uuid) ||
        JSON.stringify(first) !== JSON.stringify(second)
      ) {
        if (afterData.type === 'medico') {
          //Medico
          const PATH = `\`${functions.config().configfb.database_name}.${datasetId}.${medTable}\``;
          const table = dataset.table(medTable);
          const resp = await db
            .collection('medico-meta')
            .doc(afterData.uid)
            .get();
          const metaData = resp.data();

          let especialidad1 = null;
          if (metaData && metaData.specialty1 && metaData.specialty1.id) {
            const resp = await db
              .collection('specialties')
              .doc(String(metaData.specialty1.id))
              .get();
            especialidad1 = resp.get('name');
          }

          let especialidad2 = null;
          if (metaData && metaData.specialty2 && metaData.specialty2.id) {
            const resp = await db
              .collection('specialties')
              .doc(String(metaData.specialty2.id))
              .get();
            especialidad2 = resp.get('name');
          }

          const data = {
            name: `'${afterData.name}'`,
            lastName1: `'${afterData.lastName1}'`,
            lastName2: afterData && afterData.lastName2 ? `'${afterData.lastName2}'` : null,
            type: `'${afterData.type}'`,
            email: `'${afterData.email}'`,
            mobile: `'${afterData.mobile}'`,
            phone: `'${afterData.phone}'`,
            createdAtFB: 'CURRENT_TIMESTAMP()',
            uuid: `'${afterData.uid}'`,
            status: `'${afterData.status}'`,
            statusMeta: metaData && metaData.status ? `'${metaData.status}'` : null,
            street: metaData && metaData.address1 && metaData.address1.street ? `'${metaData.address1.street}'` : null,
            outsideNumber:
              metaData && metaData.address1 && metaData.address1.outsideNumber
                ? `'${metaData.address1.outsideNumber}'`
                : null,
            interiorNumber:
              metaData && metaData.address1 && metaData.address1.interiorNumber
                ? `'${metaData.address1.interiorNumber}'`
                : null,
            city: metaData && metaData.address1 && metaData.address1.city ? `'${metaData.address1.city}'` : null,
            colony: metaData && metaData.address1 && metaData.address1.colony ? `'${metaData.address1.colony}'` : null,
            delegation:
              metaData && metaData.address1 && metaData.address1.delegation
                ? `'${metaData.address1.delegation}'`
                : null,
            postalCode:
              metaData && metaData.address1 && metaData.address1.postalCode
                ? `'${metaData.address1.postalCode}'`
                : null,
            state: metaData && metaData.address1 && metaData.address1.state ? `'${metaData.address1.state}'` : null,
            city2: metaData && metaData.address2 && metaData.address2.city ? `'${metaData.address2.city}'` : null,
            colony2: metaData && metaData.address2 && metaData.address2.colony ? `'${metaData.address2.colony}'` : null,
            delegation2:
              metaData && metaData.address2 && metaData.address2.delegation
                ? `'${metaData.address2.delegation}'`
                : null,
            postalCode2:
              metaData && metaData.address2 && metaData.address2.postalCode
                ? `'${metaData.address2.postalCode}'`
                : null,
            state2: metaData && metaData.address2 && metaData.address2.state ? `'${metaData.address2.state}'` : null,
            especialidad1: especialidad1 ? `'${especialidad1}'` : null,
            cedula1:
              metaData && metaData.specialty1 && metaData.specialty1.cedula ? `'${metaData.specialty1.cedula}'` : null,
            especialidad2: especialidad2 ? `'${especialidad2}'` : null,
            cedula2:
              metaData && metaData.specialty2 && metaData.specialty2.cedula ? `'${metaData.specialty2.cedula}'` : null
          };

          const QUERY_EXIST = `SELECT * FROM ${PATH} WHERE uuid = ${data.uuid}`;
          const [response] = await table.query(QUERY_EXIST);

          if (response.length > 0) {
            const QUERY_UPDATE = `UPDATE ${PATH} SET name = ${data.name}, lastName1 = ${data.lastName1}, lastName2 = ${data.lastName2}, type = ${data.type}, email = ${data.email}, mobile = ${data.mobile}, phone = ${data.phone}, status = ${data.status}, statusMeta = ${data.statusMeta}, street = ${data.street}, outsideNumber = ${data.outsideNumber}, interiorNumber = ${data.interiorNumber}, city = ${data.city}, colony = ${data.colony}, delegation = ${data.delegation}, postalCode = ${data.postalCode}, state = ${data.state}, city2 = ${data.city2}, colony2 = ${data.colony2}, delegation2 = ${data.delegation2}, postalCode2 = ${data.postalCode2}, state2 = ${data.state2}, especialidad1 = ${data.especialidad1}, cedula1 = ${data.cedula1}, especialidad2 = ${data.especialidad2}, cedula2 = ${data.cedula2} WHERE uuid = ${data.uuid}`;
            await table.query(QUERY_UPDATE);
            console.log(`=======================> MEDICO UPDATED(${data.uuid}) <=======================`);
          } else {
            const QUERY_INSERT = `INSERT INTO ${PATH} (name, lastName1, lastName2, type, email, mobile, isFullMigrated, phone, wp_id, createdAtWP, createdAtFB, uuid, status, statusMeta, street, outsideNumber, interiorNumber, city, colony, delegation, postalCode, state, city2, colony2, delegation2, postalCode2, state2, especialidad1, cedula1, especialidad2, cedula2) VALUES (${data.name}, ${data.lastName1}, ${data.lastName2}, ${data.type}, ${data.email}, ${data.mobile}, null, ${data.phone}, null, null, CURRENT_TIMESTAMP(), ${data.uuid}, ${data.status}, ${data.statusMeta}, ${data.street}, ${data.outsideNumber}, ${data.interiorNumber}, ${data.city}, ${data.colony}, ${data.delegation}, ${data.postalCode}, ${data.state}, ${data.city2}, ${data.colony2}, ${data.delegation2}, ${data.postalCode2}, ${data.state2}, ${data.especialidad1}, ${data.cedula1}, ${data.especialidad2}, ${data.cedula2})`;
            await table.query(QUERY_INSERT);
            console.log(`=======================> MEDICO INSERTED(${data.uuid}) <=======================`);
          }
        } else if (afterData.type === 'representante-medico') {
          //Representante
          const PATH = `\`${functions.config().configfb.database_name}.${datasetId}.${repTable}\``;
          const table = dataset.table(repTable);
          const resp = await db
            .collection('representante-meta')
            .doc(afterData.uid)
            .get();
          const metaData = resp.data();

          let company = null;
          if (metaData && metaData.company) {
            const resp = await metaData.company.get();
            company = resp.get('name');
          }

          const data = {
            name: `'${afterData.name}'`,
            lastName1: `'${afterData.lastName1}'`,
            lastName2: afterData && afterData.lastName2 ? `'${afterData.lastName2}'` : null,
            type: `'${afterData.type}'`,
            email: `'${afterData.email}'`,
            mobile: `'${afterData.mobile}'`,
            phone: `'${afterData.phone}'`,
            createdAtFB: 'CURRENT_TIMESTAMP()',
            uuid: `'${afterData.uid}'`,
            status: `'${afterData.status}'`,
            statusMeta: metaData && metaData.status ? `'${metaData.status}'` : null,
            company: company ? `'${company}'` : null
          };

          const QUERY_EXIST = `SELECT * FROM ${PATH} WHERE uuid = ${data.uuid}`;
          const [response] = await table.query(QUERY_EXIST);

          if (response.length > 0) {
            const QUERY_UPDATE = `UPDATE ${PATH} SET name = ${data.name}, lastName1 = ${data.lastName1}, lastName2 = ${data.lastName2}, type = ${data.type}, email = ${data.email},  mobile = ${data.mobile}, phone = ${data.phone}, status = ${data.status}, statusMeta = ${data.statusMeta}, company = ${data.company} WHERE uuid = ${data.uuid}`;
            await table.query(QUERY_UPDATE);
            console.log(`=======================> REPRESENTANTE UPDATED(${data.uuid}) <=======================`);
          } else {
            const QUERY_INSERT = `INSERT INTO ${PATH} (name, lastName1, lastName2, type, email, mobile, isFullMigrated, phone, wp_id, createdAtWP, createdAtFB, uuid, status, statusMeta, company) VALUES (${data.name}, ${data.lastName1}, ${data.lastName2}, ${data.type}, ${data.email}, ${data.mobile}, null, ${data.phone}, null, null, CURRENT_TIMESTAMP(), ${data.uuid}, ${data.status}, ${data.statusMeta}, ${data.company})`;
            await table.query(QUERY_INSERT);
            console.log(`=======================> REPRESENTANTE INSERTED(${data.uuid}) <======================`);
          }
        }
      }
    }

    return true;
  } catch (error) {
    console.error('### ' + context.eventType + ' ###', error);
    return false;
  }
};

/**
 * deleteUserHandler
 * @param {functions.firestore.QueryDocumentSnapshot} change - Change.
 * @param {functions.EventContext} context - Context.
 * @returns {Promise<void>} Promise void
 */

exports.deleteUserHandler = async (change, context) => {
  try {
    const data = change.data();
    const docID = change.id;

    if (data && data.type && data.type === 'medico') {
      //Medico
      const PATH = `\`${functions.config().configfb.database_name}.${datasetId}.${medTable}\``;
      const table = dataset.table(medTable);
      const QUERY_DELETE = `DELETE FROM ${PATH} WHERE uuid = '${docID}'`;
      await table.query(QUERY_DELETE);
      console.log(`=======================> MEDICO DELETE(${docID}) <=======================`);
    } else if (data && data.type && data.type === 'representante-medico') {
      //Representante
      const PATH = `\`${functions.config().configfb.database_name}.${datasetId}.${repTable}\``;
      const table = dataset.table(repTable);
      const QUERY_DELETE = `DELETE FROM ${PATH} WHERE uuid = '${docID}'`;
      await table.query(QUERY_DELETE);
      console.log(`=======================> REPRESENTANTE DELETE(${docID}) <=======================`);
    }
    return true;
  } catch (error) {
    console.error('### ' + context.eventType + ' ###', error);
    return false;
  }
};
