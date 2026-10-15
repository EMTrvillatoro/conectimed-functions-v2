const { BigQuery } = require('@google-cloud/bigquery');
const Tools = require('../Tools');

const datasetId = 'Users';
const bigqueryClient = new BigQuery();
const medTable = 'medicosData';
const repTable = 'representantesData';

function escapeString(val) {
  if (val === null || val === undefined) return 'NULL';
  return `'${String(val).replace(/'/g, "\\'")}'`;
}

async function updateUserHandler(event) {
  try {
    const change = event.data;
    if (!change || !change.before || !change.after) return true;

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
        const admin = Tools.getFBAdminInstance();
        const db = admin.firestore();
        const databaseName = process.env.CONFIGFB_DATABASE_NAME || 'conectimed-production';

        if (afterData.type === 'medico') {
          const PATH = `\`${databaseName}.${datasetId}.${medTable}\``;
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
            name: escapeString(afterData.name),
            lastName1: escapeString(afterData.lastName1),
            lastName2: afterData && afterData.lastName2 ? escapeString(afterData.lastName2) : 'NULL',
            type: escapeString(afterData.type),
            email: escapeString(afterData.email),
            mobile: escapeString(afterData.mobile),
            phone: escapeString(afterData.phone),
            createdAtFB: 'CURRENT_TIMESTAMP()',
            uuid: escapeString(afterData.uid),
            status: escapeString(afterData.status),
            statusMeta: metaData && metaData.status ? escapeString(metaData.status) : 'NULL',
            street: metaData && metaData.address1 && metaData.address1.street ? escapeString(metaData.address1.street) : 'NULL',
            outsideNumber:
              metaData && metaData.address1 && metaData.address1.outsideNumber
                ? escapeString(metaData.address1.outsideNumber)
                : 'NULL',
            interiorNumber:
              metaData && metaData.address1 && metaData.address1.interiorNumber
                ? escapeString(metaData.address1.interiorNumber)
                : 'NULL',
            city: metaData && metaData.address1 && metaData.address1.city ? escapeString(metaData.address1.city) : 'NULL',
            colony: metaData && metaData.address1 && metaData.address1.colony ? escapeString(metaData.address1.colony) : 'NULL',
            delegation:
              metaData && metaData.address1 && metaData.address1.delegation
                ? escapeString(metaData.address1.delegation)
                : 'NULL',
            postalCode:
              metaData && metaData.address1 && metaData.address1.postalCode
                ? escapeString(metaData.address1.postalCode)
                : 'NULL',
            state: metaData && metaData.address1 && metaData.address1.state ? escapeString(metaData.address1.state) : 'NULL',
            city2: metaData && metaData.address2 && metaData.address2.city ? escapeString(metaData.address2.city) : 'NULL',
            colony2: metaData && metaData.address2 && metaData.address2.colony ? escapeString(metaData.address2.colony) : 'NULL',
            delegation2:
              metaData && metaData.address2 && metaData.address2.delegation
                ? escapeString(metaData.address2.delegation)
                : 'NULL',
            postalCode2:
              metaData && metaData.address2 && metaData.address2.postalCode
                ? escapeString(metaData.address2.postalCode)
                : 'NULL',
            state2: metaData && metaData.address2 && metaData.address2.state ? escapeString(metaData.address2.state) : 'NULL',
            especialidad1: especialidad1 ? escapeString(especialidad1) : 'NULL',
            cedula1:
              metaData && metaData.specialty1 && metaData.specialty1.cedula ? escapeString(metaData.specialty1.cedula) : 'NULL',
            especialidad2: especialidad2 ? escapeString(especialidad2) : 'NULL',
            cedula2:
              metaData && metaData.specialty2 && metaData.specialty2.cedula ? escapeString(metaData.specialty2.cedula) : 'NULL'
          };

          const QUERY_EXIST = `SELECT * FROM ${PATH} WHERE uuid = ${data.uuid}`;
          const [response] = await bigqueryClient.query(QUERY_EXIST);

          if (response.length > 0) {
            const QUERY_UPDATE = `UPDATE ${PATH} SET name = ${data.name}, lastName1 = ${data.lastName1}, lastName2 = ${data.lastName2}, type = ${data.type}, email = ${data.email}, mobile = ${data.mobile}, phone = ${data.phone}, status = ${data.status}, statusMeta = ${data.statusMeta}, street = ${data.street}, outsideNumber = ${data.outsideNumber}, interiorNumber = ${data.interiorNumber}, city = ${data.city}, colony = ${data.colony}, delegation = ${data.delegation}, postalCode = ${data.postalCode}, state = ${data.state}, city2 = ${data.city2}, colony2 = ${data.colony2}, delegation2 = ${data.delegation2}, postalCode2 = ${data.postalCode2}, state2 = ${data.state2}, especialidad1 = ${data.especialidad1}, cedula1 = ${data.cedula1}, especialidad2 = ${data.especialidad2}, cedula2 = ${data.cedula2} WHERE uuid = ${data.uuid}`;
            await bigqueryClient.query(QUERY_UPDATE);
            console.log(`=======================> MEDICO UPDATED(${data.uuid}) <=======================`);
          } else {
            const QUERY_INSERT = `INSERT INTO ${PATH} (name, lastName1, lastName2, type, email, mobile, isFullMigrated, phone, wp_id, createdAtWP, createdAtFB, uuid, status, statusMeta, street, outsideNumber, interiorNumber, city, colony, delegation, postalCode, state, city2, colony2, delegation2, postalCode2, state2, especialidad1, cedula1, especialidad2, cedula2) VALUES (${data.name}, ${data.lastName1}, ${data.lastName2}, ${data.type}, ${data.email}, ${data.mobile}, NULL, ${data.phone}, NULL, NULL, CURRENT_TIMESTAMP(), ${data.uuid}, ${data.status}, ${data.statusMeta}, ${data.street}, ${data.outsideNumber}, ${data.interiorNumber}, ${data.city}, ${data.colony}, ${data.delegation}, ${data.postalCode}, ${data.state}, ${data.city2}, ${data.colony2}, ${data.delegation2}, ${data.postalCode2}, ${data.state2}, ${data.especialidad1}, ${data.cedula1}, ${data.especialidad2}, ${data.cedula2})`;
            await bigqueryClient.query(QUERY_INSERT);
            console.log(`=======================> MEDICO INSERTED(${data.uuid}) <=======================`);
          }
        } else if (afterData.type === 'representante-medico') {
          const PATH = `\`${databaseName}.${datasetId}.${repTable}\``;
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
            name: escapeString(afterData.name),
            lastName1: escapeString(afterData.lastName1),
            lastName2: afterData && afterData.lastName2 ? escapeString(afterData.lastName2) : 'NULL',
            type: escapeString(afterData.type),
            email: escapeString(afterData.email),
            mobile: escapeString(afterData.mobile),
            phone: escapeString(afterData.phone),
            createdAtFB: 'CURRENT_TIMESTAMP()',
            uuid: escapeString(afterData.uid),
            status: escapeString(afterData.status),
            statusMeta: metaData && metaData.status ? escapeString(metaData.status) : 'NULL',
            company: company ? escapeString(company) : 'NULL'
          };

          const QUERY_EXIST = `SELECT * FROM ${PATH} WHERE uuid = ${data.uuid}`;
          const [response] = await bigqueryClient.query(QUERY_EXIST);

          if (response.length > 0) {
            const QUERY_UPDATE = `UPDATE ${PATH} SET name = ${data.name}, lastName1 = ${data.lastName1}, lastName2 = ${data.lastName2}, type = ${data.type}, email = ${data.email},  mobile = ${data.mobile}, phone = ${data.phone}, status = ${data.status}, statusMeta = ${data.statusMeta}, company = ${data.company} WHERE uuid = ${data.uuid}`;
            await bigqueryClient.query(QUERY_UPDATE);
            console.log(`=======================> REPRESENTANTE UPDATED(${data.uuid}) <=======================`);
          } else {
            const QUERY_INSERT = `INSERT INTO ${PATH} (name, lastName1, lastName2, type, email, mobile, isFullMigrated, phone, wp_id, createdAtWP, createdAtFB, uuid, status, statusMeta, company) VALUES (${data.name}, ${data.lastName1}, ${data.lastName2}, ${data.type}, ${data.email}, ${data.mobile}, NULL, ${data.phone}, NULL, NULL, CURRENT_TIMESTAMP(), ${data.uuid}, ${data.status}, ${data.statusMeta}, ${data.company})`;
            await bigqueryClient.query(QUERY_INSERT);
            console.log(`=======================> REPRESENTANTE INSERTED(${data.uuid}) <======================`);
          }
        }
      }
    }

    return true;
  } catch (error) {
    console.error('Error in updateUserHandler:', error);
    return false;
  }
}

async function deleteUserHandler(event) {
  try {
    const snapshot = event.data;
    if (!snapshot) return true;

    const data = snapshot.data();
    const docID = event.params.userId || snapshot.id;
    const databaseName = process.env.CONFIGFB_DATABASE_NAME || 'conectimed-production';

    if (data && data.type && data.type === 'medico') {
      const PATH = `\`${databaseName}.${datasetId}.${medTable}\``;
      const QUERY_DELETE = `DELETE FROM ${PATH} WHERE uuid = '${docID}'`;
      await bigqueryClient.query(QUERY_DELETE);
      console.log(`=======================> MEDICO DELETE(${docID}) <=======================`);
    } else if (data && data.type && data.type === 'representante-medico') {
      const PATH = `\`${databaseName}.${datasetId}.${repTable}\``;
      const QUERY_DELETE = `DELETE FROM ${PATH} WHERE uuid = '${docID}'`;
      await bigqueryClient.query(QUERY_DELETE);
      console.log(`=======================> REPRESENTANTE DELETE(${docID}) <=======================`);
    }
    return true;
  } catch (error) {
    console.error('Error in deleteUserHandler:', error);
    return false;
  }
}

module.exports = {
  updateUserHandler,
  deleteUserHandler
};
