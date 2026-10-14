const { BigQuery } = require('@google-cloud/bigquery');
const functions = require('firebase-functions');
const Tools = require('../Tools');
const moment = require('moment');
const datasetId = 'getResponse';
const admin = Tools.getFBAdminInstance();
const db = admin.firestore();
const bigqueryClient = new BigQuery();
const pagination_path = 'bq_pagination';
const headers = {
  'Content-Type': 'application/json',
  'X-Auth-Token': `api-key ${functions.config().getresponse.api_key}`
};
const PER_PAGE = 100;

// TABLES SCHEMAS

const schemaContacts = [
  {
    name: 'contactId',
    type: 'STRING',
    mode: 'REQUIRED'
  },
  {
    name: 'href',
    type: 'STRING',
    mode: 'REQUIRED'
  },
  {
    name: 'name',
    type: 'STRING',
    mode: 'REQUIRED'
  },
  {
    name: 'email',
    type: 'STRING',
    mode: 'REQUIRED'
  },
  {
    name: 'note',
    type: 'STRING'
  },
  {
    name: 'origin',
    type: 'STRING',
    mode: 'REQUIRED'
  },
  {
    name: 'dayOfCycle',
    type: 'STRING'
  },
  {
    name: 'changedOn',
    type: 'STRING',
    mode: 'REQUIRED'
  },
  {
    name: '_changedOn',
    type: 'TIMESTAMP',
    mode: 'REQUIRED'
  },
  {
    name: 'last_update_activities',
    type: 'TIMESTAMP'
  },
  {
    name: 'timeZone',
    type: 'STRING'
  },
  {
    name: 'ipAddress',
    type: 'STRING'
  },
  {
    name: 'activities',
    type: 'STRING',
    mode: 'REQUIRED'
  },
  {
    name: 'createdOn',
    type: 'STRING',
    mode: 'REQUIRED'
  },
  {
    name: '_createdOn',
    type: 'TIMESTAMP',
    mode: 'REQUIRED'
  },
  {
    name: 'scoring',
    type: 'STRING'
  },
  {
    name: 'engagementScore',
    type: 'INT64',
    mode: 'REQUIRED'
  },
  {
    name: 'bq_createdOn',
    type: 'INT64'
  },
  {
    name: 'id',
    type: 'INT64'
  },
  {
    name: 'campaign_campaignId',
    type: 'STRING'
  },
  {
    name: 'campaign_href',
    type: 'STRING'
  },
  {
    name: 'campaign_name',
    type: 'STRING'
  },
  {
    name: 'especialidad',
    type: 'STRING'
  },
  {
    name: 'estado',
    type: 'STRING'
  },
  {
    name: 'primer_nombre',
    type: 'STRING'
  },
  {
    name: 'segundo_nombre',
    type: 'STRING'
  },
  {
    name: 'apellido_paterno',
    type: 'STRING'
  },
  {
    name: 'apellido_materno',
    type: 'STRING'
  },
  {
    name: 'uid',
    type: 'STRING'
  },
  {
    name: 'titulo',
    type: 'STRING'
  }
];

const schemaCampaigns = [
  {
    name: 'campaignId',
    type: 'STRING',
    mode: 'REQUIRED'
  },
  {
    name: 'href',
    type: 'STRING',
    mode: 'REQUIRED'
  },
  {
    name: 'name',
    type: 'STRING',
    mode: 'REQUIRED'
  },
  {
    name: 'techName',
    type: 'STRING',
    mode: 'REQUIRED'
  },
  {
    name: 'description',
    type: 'STRING'
  },
  {
    name: 'languageCode',
    type: 'STRING'
  },
  {
    name: 'isDefault',
    type: 'STRING'
  },
  {
    name: 'createdOn',
    type: 'STRING',
    mode: 'REQUIRED'
  },
  {
    name: '_createdOn',
    type: 'TIMESTAMP',
    mode: 'REQUIRED'
  },
  {
    name: 'bq_createdOn',
    type: 'INT64'
  },
  {
    name: 'id',
    type: 'INT64'
  }
];

const schemaNewsletters = [
  {
    name: 'newsletterId',
    type: 'STRING',
    mode: 'REQUIRED'
  },
  {
    name: 'name',
    type: 'STRING',
    mode: 'REQUIRED'
  },
  {
    name: 'type',
    type: 'STRING',
    mode: 'REQUIRED'
  },
  {
    name: 'subject',
    type: 'STRING',
    mode: 'REQUIRED'
  },
  {
    name: 'flags',
    type: 'STRING',
    mode: 'REQUIRED'
  },
  {
    name: 'editor',
    type: 'STRING',
    mode: 'REQUIRED'
  },
  {
    name: 'href',
    type: 'STRING',
    mode: 'REQUIRED'
  },
  {
    name: 'campaign',
    type: 'JSON'
  },
  {
    name: 'status',
    type: 'STRING',
    mode: 'REQUIRED'
  },
  {
    name: 'sendOn',
    type: 'STRING',
    mode: 'REQUIRED'
  },
  {
    name: 'createdOn',
    type: 'STRING',
    mode: 'REQUIRED'
  },
  {
    name: '_createdOn',
    type: 'TIMESTAMP',
    mode: 'REQUIRED'
  },
  {
    name: 'sendSettings',
    type: 'JSON'
  },
  {
    name: 'sendMetrics',
    type: 'JSON'
  },
  {
    name: 'bq_createdOn',
    type: 'INT64'
  },
  {
    name: 'id',
    type: 'INT64'
  },
  {
    name: 'campaign_campaignId',
    type: 'STRING'
  },
  {
    name: 'campaign_href',
    type: 'STRING'
  },
  {
    name: 'campaign_name',
    type: 'STRING'
  },
  {
    name: 'sendSettings_timeTravel',
    type: 'STRING'
  },
  {
    name: 'sendSettings_perfectTiming',
    type: 'STRING'
  },
  {
    name: 'sendMetrics_status',
    type: 'STRING'
  },
  {
    name: 'sendMetrics_sent',
    type: 'STRING'
  },
  {
    name: 'sendMetrics_total',
    type: 'STRING'
  },
  {
    name: 'statistics_timeInterval',
    type: 'STRING'
  },
  {
    name: 'statistics_sent',
    type: 'INT64'
  },
  {
    name: 'statistics_totalOpened',
    type: 'INT64'
  },
  {
    name: 'statistics_uniqueOpened',
    type: 'INT64'
  },
  {
    name: 'statistics_totalClicked',
    type: 'INT64'
  },
  {
    name: 'statistics_uniqueClicked',
    type: 'INT64'
  },
  {
    name: 'statistics_goals',
    type: 'INT64'
  },
  {
    name: 'statistics_uniqueGoals',
    type: 'INT64'
  },
  {
    name: 'statistics_forwarded',
    type: 'INT64'
  },
  {
    name: 'statistics_unsubscribed',
    type: 'INT64'
  },
  {
    name: 'statistics_bounced',
    type: 'INT64'
  },
  {
    name: 'statistics_complaints',
    type: 'INT64'
  },
  {
    name: 'last_update',
    type: 'TIMESTAMP'
  }
];

const schemaActivities = [
  {
    type: 'STRING',
    mode: 'REQUIRED',
    name: 'activity'
  },
  {
    type: 'STRING',
    mode: 'REQUIRED',
    name: 'createdOn'
  },
  {
    type: 'TIMESTAMP',
    mode: 'REQUIRED',
    name: '_createdOn'
  },
  {
    type: 'STRING',
    mode: 'REQUIRED',
    name: 'contactId'
  },
  {
    type: 'STRING',
    mode: 'REQUIRED',
    name: 'object_from'
  },
  {
    type: 'STRING',
    mode: 'REQUIRED',
    name: 'subject'
  },
  {
    type: 'STRING',
    mode: 'REQUIRED',
    name: 'resource_resourceId'
  },
  {
    type: 'STRING',
    mode: 'REQUIRED',
    name: 'resource_resourceType'
  },
  {
    type: 'STRING',
    mode: 'REQUIRED',
    name: 'resource_href'
  },
  {
    type: 'STRING',
    name: 'clickTrack_id'
  },
  {
    type: 'STRING',
    name: 'clickTrack_name'
  },
  {
    type: 'STRING',
    name: 'clickTrack_url'
  }
];

// ************************************ REQUEST FUNCTIONS ************************************

/**
 * Request Contacts
 * @param {functions.https.Request} request - Https Request.
 * @param {functions.Response<any>} response - Response Any.
 * @returns {Promise<functions.Response<any>>}  Any
 */

exports.bq_onRequest_contacts = async function (request, response) {
  response.header('Content-Type', 'application/json');
  response.header('Access-Control-Allow-Origin', '*');
  response.header('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return response.status(204).send('');
  }

  if (request && request.method === 'GET') {
    const page = request && request.query && request.query.page ? Number(request.query.page) : 1;
    const respURL = await getURL('contacts');
    const resp = await bq_contacts({
      page: page,
      url: respURL.url,
      lastIndex: respURL.lastIndex,
      noPaginate: request.query.noPaginate
    });
    return response.status(200).send({ response: resp });
  } else {
    return response.status(405).send({ code: 405, message: `${request.method} Method Not Allowed` });
  }
};

/**
 * Request Campaigns
 * @param {functions.https.Request} request - Https Request.
 * @param {functions.Response<any>} response - Response Any.
 * @returns {Promise<functions.Response<any>>}  Any
 */

exports.bq_onRequest_campaigns = async function (request, response) {
  response.header('Content-Type', 'application/json');
  response.header('Access-Control-Allow-Origin', '*');
  response.header('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return response.status(204).send('');
  }

  if (request && request.method === 'GET') {
    const page = request && request.query && request.query.page ? Number(request.query.page) : 1;
    const respURL = await getURL('campaigns');
    const resp = await bq_campaigns({
      page: page,
      url: respURL.url,
      lastIndex: respURL.lastIndex,
      noPaginate: request.query.noPaginate
    });
    return response.status(200).send({ response: resp });
  } else {
    return response.status(405).send({ code: 405, message: `${request.method} Method Not Allowed` });
  }
};

/**
 * Request Newsletters
 * @param {functions.https.Request} request - Https Request.
 * @param {functions.Response<any>} response - Response Any.
 * @returns {Promise<functions.Response<any>>}  Any
 */

exports.bq_onRequest_newsletters = async function (request, response) {
  response.header('Content-Type', 'application/json');
  response.header('Access-Control-Allow-Origin', '*');
  response.header('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return response.status(204).send('');
  }

  if (request && request.method === 'GET') {
    const page = request && request.query && request.query.page ? Number(request.query.page) : 1;
    const respURL = await getURL('newsletters');
    const resp = await bq_newsletters({
      page: page,
      url: respURL.url,
      lastIndex: respURL.lastIndex,
      noPaginate: request.query.noPaginate
    });
    return response.status(200).send({ response: resp });
  } else {
    return response.status(405).send({ code: 405, message: `${request.method} Method Not Allowed` });
  }
};

/**
 * Request Newsletters update
 * @param {functions.https.Request} request - Https Request.
 * @param {functions.Response<any>} response - Response Any.
 * @returns {Promise<functions.Response<any>>}  Any
 */

exports.bq_onRequest_newsletters_update = async function (request, response) {
  response.header('Content-Type', 'application/json');
  response.header('Access-Control-Allow-Origin', '*');
  response.header('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return response.status(204).send('');
  }

  if (request && request.method === 'GET') {
    const page = request && request.query && request.query.page ? Number(request.query.page) : 0;
    const resp = await bq_main_newsletters_update(page);
    return response.status(200).send({ response: resp });
  } else {
    return response.status(405).send({ code: 405, message: `${request.method} Method Not Allowed` });
  }
};

/**
 * Request Activities
 * @param {functions.https.Request} request - Https Request.
 * @param {functions.Response<any>} response - Response Any.
 * @returns {Promise<functions.Response<any>>}  Any
 */

exports.bq_onRequest_activities = async function (request, response) {
  response.header('Content-Type', 'application/json');
  response.header('Access-Control-Allow-Origin', '*');
  response.header('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return response.status(204).send('');
  }

  if (request && request.method === 'GET') {
    const page = request && request.query && request.query.page ? Number(request.query.page) : 1;
    const resp = await bq_main_activities({ page: page });
    return response.status(200).send({ response: resp });
  } else {
    return response.status(405).send({ code: 405, message: `${request.method} Method Not Allowed` });
  }
};

/**
 * Request Create Table
 * @param {functions.https.Request} request - Https Request.
 * @param {functions.Response<any>} response - Response Any.
 * @returns {Promise<functions.Response<any>>}  Any
 */

exports.bq_onRequest_createTable = async function (request, response) {
  response.header('Content-Type', 'application/json');
  response.header('Access-Control-Allow-Origin', '*');
  response.header('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return response.status(204).send('');
  }

  if (request && request.method === 'POST') {
    if (request && request.body && request.body.name) {
      await bq_createTable(request.body.name);
      return response.status(200).send({ success: true });
    } else {
      return response.status(401).send({ message: 'missing parameters' });
    }
  } else {
    return response.status(405).send({ code: 405, message: `${request.method} Method Not Allowed` });
  }
};

/**
 * Request GetResponse WebHook
 * @param {functions.https.Request} request - Https Request.
 * @param {functions.Response<any>} response - Response Any.
 * @returns {Promise<void>} Promise object (url, id)
 */

exports.bq_onRequest_getResponseWebhook = async function (request, response) {
  response.header('Content-Type', 'application/json');
  response.header('Access-Control-Allow-Origin', '*');
  response.header('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return response.status(204).send('');
  }

  if (request && request.method === 'POST') {
    const saveTo = request && request.query && request.query.save_to ? request.query.save_to : 'activities_save';
    try {
      if (request && request.body && request.body.type) {
        const data = request.body;
        const tableName = saveTo;
        const PATH = `\`${functions.config().configfb.database_name}.${datasetId}.${tableName}\``;
        const dataset = bigqueryClient.dataset(datasetId);
        const table = dataset.table(tableName);

        let activityData = {};

        if (
          data &&
          data.type &&
          (data.type === 'contact_clicked_message_link' || data.type === 'contact_opened_message')
        ) {
          console.log(
            `======== TYPE: ${data && data.type && data.type === 'contact_opened_message' ? 'open' : 'click'} ========`
          );
          activityData = {
            activity: data && data.type && data.type === 'contact_opened_message' ? 'open' : 'click',
            createdOn: data && data.event && data.event.occurredAt ? data.event.occurredAt : '',
            _createdOn: moment(data && data.event && data.event.occurredAt ? data.event.occurredAt : '')
              .utc(false)
              .format('YYYY-MM-DDTHH:mm:ss+0000'),
            contactId: data && data.contact && data.contact.contactId ? data.contact.contactId : '',
            subject: data && data.message && data.message.subject ? data.message.subject : '',
            resource_resourceId: data && data.message && data.message.resourceId ? data.message.resourceId : '',
            resource_resourceType: data && data.message && data.message.resourceType ? data.message.resourceType : '',
            resource_href: data && data.message && data.message.href ? data.message.href : '',
            clickTrack_id: data && data.clickTrack && data.clickTrack.clickTrackId ? data.clickTrack.clickTrackId : '',
            clickTrack_name: data && data.clickTrack && data.clickTrack.name ? data.clickTrack.name : '',
            clickTrack_url: data && data.clickTrack && data.clickTrack.url ? data.clickTrack.url : ''
          };
        } else {
          return response.status(204).send({ status: 'OK' });
        }

        // const query = `INSERT INTO ${PATH} (
        //   resource_resourceId,
        //   contactId,
        //   activity,
        //   createdOn,
        //   _createdOn,
        //   object_from,
        //   subject,
        //   resource_resourceType,
        //   resource_href,
        //   clickTrack_id,
        //   clickTrack_name,
        //   clickTrack_url
        //   )
        // SELECT '${activityData.resource_resourceId}','${activityData.contactId}','${activityData.activity}','${activityData.createdOn}',TIMESTAMP('${activityData.createdOn}'),'webhook','${activityData.subject}','${activityData.resource_resourceType}','${activityData.resource_href}','${activityData.clickTrack_id}','${activityData.clickTrack_name}','${activityData.clickTrack_url}'
        // FROM ${PATH}
        // WHERE NOT EXISTS (SELECT * FROM ${PATH} WHERE resource_resourceId = '${activityData.resource_resourceId}' AND contactId = '${activityData.contactId}' AND activity = '${activityData.activity}' AND TIMESTAMP(createdOn) = TIMESTAMP('${activityData.createdOn}'))
        // LIMIT 1`;

        const query = `INSERT INTO ${PATH} (
          resource_resourceId,
          contactId,
          activity,
          createdOn,
          _createdOn,
          object_from,
          subject,
          resource_resourceType,
          resource_href,
          clickTrack_id,
          clickTrack_name,
          clickTrack_url
          )

        VALUES (
          '${activityData.resource_resourceId}',
          '${activityData.contactId}',
          '${activityData.activity}',
          '${activityData.createdOn}',
          TIMESTAMP('${activityData.createdOn}'),
          'webhook',
          '${activityData.subject}',
          '${activityData.resource_resourceType}',
          '${activityData.resource_href}',
          '${activityData.clickTrack_id}',
          '${activityData.clickTrack_name}',
          '${activityData.clickTrack_url}'
          )`;

        await table.query(query);
        console.log(JSON.stringify(query));
      }
      return response.status(200).send({ status: 'OK' });
    } catch (error) {
      console.error(error);
      return response.status(204).send({ status: 'OK' });
    }
  } else {
    return response.status(204).send({ status: 'OK' });
  }
};

// ************************************ ON_WRITE FUNCTIONS ************************************

/**
 * Pagination Contacts
 * @param {functions.firestore.QueryDocumentSnapshot} change - QueryDocumentSnapshot.
 * @param {functions.EventContext} context - EventContext.
 * @returns {Promise<void>} Promise void
 */

exports.bq_onCreate_pagination_contacts = async function (change, context) {
  try {
    const data = change.data();
    if (data.status === 'pending' && data.current_page) {
      await bq_contacts({ page: data.current_page, url: data.url, lastIndex: data.lastIndex });
    }
    return true;
  } catch (error) {
    console.error(error);
    return error;
  }
};

/**
 * Pagination Campaigns
 * @param {functions.firestore.QueryDocumentSnapshot} change - QueryDocumentSnapshot.
 * @param {functions.EventContext} context - EventContext.
 * @returns {Promise<void>} Promise void
 */

exports.bq_onCreate_pagination_campaigns = async function (change, context) {
  try {
    const data = change.data();
    if (data.status === 'pending' && data.current_page) {
      await bq_campaigns({ page: data.current_page, url: data.url, lastIndex: data.lastIndex });
    }
    return true;
  } catch (error) {
    console.error(error);
    return error;
  }
};

/**
 * Pagination Campaigns
 * @param {functions.firestore.QueryDocumentSnapshot} change - QueryDocumentSnapshot.
 * @param {functions.EventContext} context - EventContext.
 * @returns {Promise<void>} Promise void
 */

exports.bq_onCreate_pagination_newsletters = async function (change, context) {
  try {
    const data = change.data();
    if (data.status === 'pending' && data.current_page) {
      await bq_newsletters({ page: data.current_page, url: data.url, lastIndex: data.lastIndex });
    }
    return true;
  } catch (error) {
    console.error(error);
    return error;
  }
};

/**
 * Pagination Activities
 * @param {functions.firestore.QueryDocumentSnapshot} change - QueryDocumentSnapshot.
 * @param {functions.EventContext} context - EventContext.
 * @returns {Promise<void>} Promise void
 */

exports.bq_onCreate_pagination_activities = async function (change, context) {
  try {
    const data = change.data();
    if (data.status === 'pending' && data.current_page) {
      await bq_main_activities({
        page: data.current_page
      });
    }
    return true;
  } catch (error) {
    console.error(error);
    return error;
  }
};

/**
 * Pagination Newsletters update
 * @param {functions.firestore.QueryDocumentSnapshot} change - QueryDocumentSnapshot.
 * @param {functions.EventContext} context - EventContext.
 * @returns {Promise<void>} Promise void
 */

exports.bq_onCreate_pagination_newsletters_update = async function (change, context) {
  try {
    const data = change.data();
    if (data.status === 'pending' && data.current_page) {
      await bq_main_newsletters_update(data.current_page);
    }
    return true;
  } catch (error) {
    console.error(error);
    return error;
  }
};

// ************************************ SCHEDULE FUNCTIONS ************************************

exports.bq_onRun_newsletters = async function () {
  try {
    console.log('***************** bq_onRun_newsletters every day! *****************');
    const respURL = await getURL('newsletters');
    await bq_newsletters({ page: 1, url: respURL.url, lastIndex: respURL.lastIndex });
    return true;
  } catch (error) {
    console.error(error);
    return error;
  }
};

exports.bq_onRun_newsletters_update = async function () {
  try {
    console.log('***************** bq_onRun_newsletters_update every day! *****************');
    await bq_main_newsletters_update(0);
    return true;
  } catch (error) {
    console.error(error);
    return error;
  }
};

exports.bq_onRun_campaigns = async function () {
  try {
    console.log('***************** bq_onRun_campaigns every day! *****************');
    const respURL = await getURL('campaigns');
    await bq_campaigns({ page: 1, url: respURL.url, lastIndex: respURL.lastIndex });
    return true;
  } catch (error) {
    console.error(error);
    return error;
  }
};

exports.bq_onRun_contacts = async function () {
  try {
    console.log('***************** bq_onRun_contacts every day! *****************');
    const respURL = await getURL('contacts');
    await bq_contacts({ page: 1, url: respURL.url, lastIndex: respURL.lastIndex });
    return true;
  } catch (error) {
    console.error(error);
    return error;
  }
};

// ************************************ OTHER FUNTIONS ************************************

async function bq_createTable(tableName) {
  try {
    const dataset = bigqueryClient.dataset(datasetId);
    const table = dataset.table(tableName);
    const existDataset = await dataset.exists();

    if (!(existDataset[0] === true)) {
      await bigqueryClient.createDataset(datasetId);
    }

    let schema = {};

    switch (tableName) {
      case 'contacts':
        schema = schemaContacts;
        break;
      case 'campaigns':
        schema = schemaCampaigns;
        break;
      case 'newsletters':
        schema = schemaNewsletters;
        break;
      case 'activities':
        schema = schemaActivities;
        break;
      case 'activities_save':
        schema = schemaActivities;
        break;
    }

    const existTable = await table.exists();
    if (!(existTable[0] === true)) {
      await dataset.createTable(tableName, { schema: schema });
    }

    return true;
  } catch (e) {
    console.error(e);
    return e;
  }
}

function getTableNameRecord(tableName) {
  return `_record_${tableName}`;
}

function getPathRecord(tableNameRecord) {
  return `\`${functions.config().configfb.database_name}.${datasetId}.${tableNameRecord}\``;
}

/**
 * URL
 * @param {string} tableName - The name of the table.
 * @returns {Promise<{url:string,lastIndex:(string|undefined)}>} Promise object (url, id)
 */

async function getURL(tableName) {
  try {
    const TABLE_NAME_RECORD = getTableNameRecord(tableName);
    const PATH_RECORD = getPathRecord(TABLE_NAME_RECORD);

    let url = `${functions.config().getresponse.url}/${tableName}?perPage=${PER_PAGE}&sort[createdOn]=asc`;
    let lastIndex = undefined;

    if (!(tableName === 'campaigns')) {
      try {
        const [resp] = await bigqueryClient.query(`SELECT * FROM ${PATH_RECORD} ORDER BY last_update DESC LIMIT 1`);
        if (resp.length > 0) {
          const from =
            resp && resp[0] && resp[0].last_update && resp[0].last_update.value
              ? moment(resp[0].last_update.value)
                .utc(false)
                .format('YYYY-MM-DDTHH:mm:ss+0000')
                .replace('+', '%2B')
              : undefined;
          const last_index = resp && resp[0] && resp[0].last_index ? Number(resp[0].last_index) : undefined;
          if (from) {
            url = `${functions.config().getresponse.url
              }/${tableName}?query[createdOn][from]=${from}&perPage=${PER_PAGE}&sort[createdOn]=asc`;
          }
          if (last_index) {
            lastIndex = last_index;
          }
        }
      } catch (error) {
        console.error(error);
      }
    }

    return { url: url, lastIndex: lastIndex };
  } catch (error) {
    console.error(error);
    return false;
  }
}
// ************************************ MAIN FUNCTIONS PER TABLE ************************************

/**
 * Contacts
 * @param {Object} params - The contacts's params.
 * @param {string} params.url - The url of the request.
 * @param {string} params.page - The initial page.
 * @param {number} params.lastIndex - The id of last table record. params.lastIndex
 * @param {string} params.noPaginate - Paginate the request.
 * @returns {Promise<Object>} Promise object
 */

async function bq_contacts(params) {
  try {
    const bq_main_parms = {
      tableName: 'contacts',
      schema: schemaContacts,
      url: params.url,
      primaryKey: 'contactId',
      page: params.page,
      lastIndex: params.lastIndex,
      noPaginate: params.noPaginate
    };
    return await bq_main(bq_main_parms);
  } catch (e) {
    console.error(e);
    return e;
  }
}

/**
 * Campaigns
 * @param {Object} params - The campaigns's params.
 * @param {string} params.url - The url of the request.
 * @param {string} params.page - The initial page.
 * @param {number} params.lastIndex - The id of last table record.
 * @param {string} params.noPaginate - Paginate the request.
 * @returns {Promise<Object>} Promise object
 */

async function bq_campaigns(params) {
  try {
    const bq_main_parms = {
      tableName: 'campaigns',
      schema: schemaCampaigns,
      url: params.url,
      primaryKey: 'campaignId',
      page: params.page,
      lastIndex: params.lastIndex,
      noPaginate: params.noPaginate
    };
    return await bq_main(bq_main_parms);
  } catch (e) {
    console.error(e);
    return e;
  }
}

/**
 * Newsletters
 * @param {Object} params - The newsletters's params.
 * @param {string} params.url - The url of the request.
 * @param {string} params.page - The initial page.
 * @param {number} params.lastIndex - The id of last table record.
 * @param {string} params.noPaginate - Paginate the request.
 * @returns {Promise<Object>} Promise object
 */

async function bq_newsletters(params) {
  try {
    const bq_main_parms = {
      tableName: 'newsletters',
      schema: schemaNewsletters,
      url: params.url,
      primaryKey: 'newsletterId',
      page: params.page,
      lastIndex: params.lastIndex,
      noPaginate: params.noPaginate
    };
    return await bq_main(bq_main_parms);
  } catch (e) {
    console.error(e);
    return e;
  }
}

// ************************************ MAIN FUNCTIONS ************************************

/**
 * Main function
 * @param {Object} params - The main function's params.
 * @param {string} params.url - The url of the request.
 * @param {string} params.page - The initial page.
 * @param {string} params.tableName - The name of table.
 * @param {Array} params.schema - The schema of table.
 * @param {string} params.primaryKey - The 'primaryKey' of table.
 * @param {number} params.lastIndex - The id of last table record.
 * @param {string} params.noPaginate - Paginate the request.
 * @returns {Promise<Object>} Promise object
 */

async function bq_main(params) {
  try {
    const PATH = `\`${functions.config().configfb.database_name}.${datasetId}.${params.tableName}\``;
    const TABLE_NAME_RECORD = getTableNameRecord(params.tableName);
    const PATH_RECORD = getPathRecord(TABLE_NAME_RECORD);
    const dataset = bigqueryClient.dataset(datasetId);
    const table = dataset.table(params.tableName);
    params.page = params && params.page ? params.page : 1;
    const URL = `${params.url}&page=${params.page}`;
    const resp = await Tools.sendRequest(URL, headers, 'GET');
    let lastIndex;
    let ARRAY_DATA = [];

    for (let [index, data] of Array.from(resp.data).entries()) {
      let item = data;
      if (item && item.changedOn) {
        item['_changedOn'] = `TIMESTAMP('${item.changedOn}')`;
      }
      if (item && item.createdOn) {
        item['_createdOn'] = `TIMESTAMP('${item.createdOn}')`;
      }
      if (item && item.campaign && item.campaign.campaignId) {
        item['campaign_campaignId'] = item.campaign.campaignId;
      }
      if (item && item.campaign && item.campaign.href) {
        item['campaign_href'] = item.campaign.href;
      }
      if (item && item.campaign && item.campaign.name) {
        item['campaign_name'] = item.campaign.name;
      }
      if (item && item.sendSettings && item.sendSettings.timeTravel) {
        item['sendSettings_timeTravel'] = item.sendSettings.timeTravel;
      }
      if (item && item.sendSettings && item.sendSettings.perfectTiming) {
        item['sendSettings_perfectTiming'] = item.sendSettings.perfectTiming;
      }
      if (item && item.sendMetrics && item.sendMetrics.status) {
        item['sendMetrics_status'] = item.sendMetrics.status;
      }
      if (item && item.sendMetrics && item.sendMetrics.sent) {
        item['sendMetrics_sent'] = item.sendMetrics.sent;
      }
      if (item && item.sendMetrics && item.sendMetrics.total) {
        item['sendMetrics_total'] = item.sendMetrics.total;
      }
      lastIndex =
        (params && params.lastIndex && Number(params.lastIndex) > 0 ? Number(params.lastIndex) : 0) + (index + 1);
      item['id'] = lastIndex;
      item['last_update_activities'] = 'NULL';
      item['bq_createdOn'] = moment().valueOf();

      if (
        params &&
        params.tableName &&
        params.tableName === 'newsletters' &&
        item &&
        item.campaign_name &&
        (item.campaign_name === 'notificacion' || item.campaign_name === 'pruebanewsletter')
      ) {
        const additionalData = await bq_update_newsletter(item.newsletterId);
        item = Object.assign(item, additionalData);
      }

      if (params && params.tableName && params.tableName === 'contacts' && item && item.contactId) {
        try {
          let url = `${functions.config().getresponse.url}/contacts/${item.contactId}`;
          const resp = await Tools.sendRequest(url, headers, 'GET');
          if (resp && resp.data && resp.data.customFieldValues) {
            const ARRAY = Array.from(resp.data.customFieldValues);

            let custom = {
              especialidad: '',
              estado: '',
              primer_nombre: '',
              segundo_nombre: '',
              apellido_paterno: '',
              apellido_materno: '',
              uid: '',
              titulo: ''
            };

            let index = -1;

            index = ARRAY.map(item => item.name).indexOf('especialidad');
            if (index > -1) {
              custom.especialidad =
                ARRAY[index] && ARRAY[index].value && ARRAY[index].value[0] ? ARRAY[index].value[0] : '';
            }
            // Estado
            index = ARRAY.map(item => item.name).indexOf('estado');
            if (index > -1) {
              custom.estado = ARRAY[index] && ARRAY[index].value && ARRAY[index].value[0] ? ARRAY[index].value[0] : '';
            }
            // Primer nombre
            index = ARRAY.map(item => item.name).indexOf('primer_nombre');
            if (index > -1) {
              custom.primer_nombre =
                ARRAY[index] && ARRAY[index].value && ARRAY[index].value[0] ? ARRAY[index].value[0] : '';
            }
            // Segundo nombre
            index = ARRAY.map(item => item.name).indexOf('segundo_nombre');
            if (index > -1) {
              custom.segundo_nombre =
                ARRAY[index] && ARRAY[index].value && ARRAY[index].value[0] ? ARRAY[index].value[0] : '';
            }
            // Apellido paterno
            index = ARRAY.map(item => item.name).indexOf('primer_apellido');
            if (index > -1) {
              custom.apellido_paterno =
                ARRAY[index] && ARRAY[index].value && ARRAY[index].value[0] ? ARRAY[index].value[0] : '';
            }
            // Apellido materno
            index = ARRAY.map(item => item.name).indexOf('segundo_apellido');
            if (index > -1) {
              custom.apellido_materno =
                ARRAY[index] && ARRAY[index].value && ARRAY[index].value[0] ? ARRAY[index].value[0] : '';
            }
            // Uid
            index = ARRAY.map(item => item.name).indexOf('uid');
            if (index > -1) {
              custom.uid = ARRAY[index] && ARRAY[index].value && ARRAY[index].value[0] ? ARRAY[index].value[0] : '';
            }
            // Título
            index = ARRAY.map(item => item.name).indexOf('titulo');
            if (index > -1) {
              custom.titulo = ARRAY[index] && ARRAY[index].value && ARRAY[index].value[0] ? ARRAY[index].value[0] : '';
            }

            item = Object.assign(item, custom);
          }
        } catch (error) {
          console.error(error);
        }
      }
      ARRAY_DATA.push(item);
    }

    if (params && params.tableName && params.tableName === 'newsletters') {
      ARRAY_DATA = ARRAY_DATA.filter(item => {
        if (
          item &&
          item.campaign_name &&
          (item.campaign_name === 'notificacion' || item.campaign_name === 'pruebanewsletter')
        ) {
          return true;
        } else {
          return false;
        }
      });
    }

    let inQuery = '';

    for (let i = 0; i < ARRAY_DATA.length; i++) {
      inQuery += `"${ARRAY_DATA[i][params.primaryKey]}"`;
      if (!(i === ARRAY_DATA.length - 1)) {
        inQuery += ', ';
      }
    }

    const queryStr = `SELECT ${params.primaryKey} FROM ${PATH} WHERE ${params.primaryKey} IN (${inQuery})`;
    const [responseQuery] = inQuery && inQuery !== '' ? await table.query(queryStr) : [];

    let insertQuery = '';
    let insertQueryArray = [];
    let keysQuery = '';
    let updateQuery = '';
    let updateQueryArray = [];

    let countQuery = 0;
    for (const data of ARRAY_DATA) {
      const index = responseQuery.map(e => e[params.primaryKey]).indexOf(data[params.primaryKey]);
      let count1 = 0;
      let keyAndValues = '';
      let keys = '';
      let values = '';

      for (const key of params.schema) {
        keys += key.name;
        if (key.type === 'STRING') {
          keyAndValues += `${key.name} = "${data && data[key.name] ? Tools.parser(data[key.name]) : ''}"`;
          values += `"${data && data[key.name] ? Tools.parser(data[key.name]) : ''}"`;
        } else if (key.type === 'INT64') {
          keyAndValues += `${key.name} = ${data && data[key.name] ? Number(data[key.name]) : null}`;
          values += data && data[key.name] ? Number(data[key.name]) : null;
        } else if (key.type === 'JSON') {
          keyAndValues += `${key.name} = ${Tools.parserJSON(data[key.name])}`;
          values += `${Tools.parserJSON(data[key.name])}`;
        } else if (key.type === 'TIMESTAMP' || key.type === 'DATE' || key.type === 'DATETIME') {
          keyAndValues += `${key.name} = ${data[key.name]}`;
          values += `${data[key.name]}`;
        }
        if (!(count1 === params.schema.length - 1)) {
          keyAndValues += ', ';
          keys += ', ';
          values += ', ';
        }
        count1++;
      }

      keysQuery = keys;

      if (!(index > -1)) {
        insertQuery += `(${values}), `;
        insertQueryArray.push(countQuery);
      } else {
        updateQuery += `UPDATE ${PATH} SET ${keyAndValues} WHERE ${params.primaryKey} = '${data[params.primaryKey]}'; `;
        updateQueryArray.push(countQuery);
      }
      countQuery++;
    }

    if (insertQueryArray.length > 0) {
      await table.query(`INSERT INTO ${PATH} (${keysQuery}) VALUES ${insertQuery.slice(0, -2)}`);
    }

    if (updateQueryArray.length > 0) {
      await table.query(updateQuery);
    }

    const TOTAL_PAGES = resp && resp.headers && resp.headers.totalpages ? Number(resp.headers.totalpages) : null;
    const CURRENT_PAGE = resp && resp.headers && resp.headers.currentpage ? Number(resp.headers.currentpage) : null;

    const DOC = `${pagination_path}/${params.tableName}`;
    let pageDoc = `${DOC}/pagination/${CURRENT_PAGE}`;

    await db.doc(DOC).set(
      {
        current_page: CURRENT_PAGE,
        date: moment().toDate(),
        total_pages: TOTAL_PAGES,
        status: 'in-progress'
      },
      { merge: true }
    );
    try {
      await db.doc(pageDoc).delete();
    } catch (error) {
      console.error(error);
    }

    if (CURRENT_PAGE < TOTAL_PAGES) {
      if (!(params && params.noPaginate && String(params.noPaginate) === 'true')) {
        pageDoc = `${DOC}/pagination/${CURRENT_PAGE + 1}`;
        await db.doc(pageDoc).set(
          {
            date: moment().toDate(),
            current_page: CURRENT_PAGE + 1,
            total_pages: TOTAL_PAGES,
            status: 'pending',
            url: `${params.url}`,
            lastIndex: lastIndex
          },
          { merge: true }
        );
      }
    }

    if (CURRENT_PAGE === TOTAL_PAGES || TOTAL_PAGES === 0) {
      const table = dataset.table(TABLE_NAME_RECORD);
      const existTable = await table.exists();
      if (!(existTable[0] === true)) {
        await dataset.createTable(TABLE_NAME_RECORD, {
          schema: [
            {
              name: 'last_update',
              type: 'TIMESTAMP',
              mode: 'REQUIRED'
            },
            {
              name: 'last_index',
              type: 'INT64',
              mode: 'REQUIRED'
            },
            {
              name: 'current_page',
              type: 'INT64',
              mode: 'REQUIRED'
            },
            {
              name: 'total_pages',
              type: 'INT64',
              mode: 'REQUIRED'
            },
            {
              name: 'per_page',
              type: 'INT64',
              mode: 'REQUIRED'
            }
          ]
        });
      }
      await bigqueryClient.query(
        `INSERT INTO ${PATH_RECORD} (last_update, last_index, current_page, total_pages, per_page) VALUES (CURRENT_TIMESTAMP(), ${lastIndex ? lastIndex : params && params.lastIndex ? params.lastIndex : 0
        }, ${CURRENT_PAGE}, ${TOTAL_PAGES}, ${PER_PAGE})`
      );
      await db.doc(DOC).update({ status: 'completed' });
    }

    return true;
  } catch (e) {
    console.error(e);
    return e;
  }
}

/**
 * Update newsletters statistics function
 * @param {string} id - The newsletter ID.
 * @returns {Promise<Object>} Promise object
 */

async function bq_update_newsletter(id) {
  let item = {};
  try {
    const URL = `${functions.config().getresponse.url}/newsletters/${id}/statistics`;
    console.log(`===> URL <=== ${URL}`);
    const statistics = await Tools.sendRequest(URL, headers, 'GET');
    if (statistics && statistics.data) {
      const [statisticsData] = statistics && statistics.data ? statistics.data : {};
      item['statistics_timeInterval'] =
        statisticsData && statisticsData.timeInterval ? statisticsData.timeInterval : null;
      item['statistics_sent'] = statisticsData && statisticsData.sent ? statisticsData.sent : null;
      item['statistics_totalOpened'] =
        statisticsData && statisticsData.totalOpened ? Number(statisticsData.totalOpened) : null;
      item['statistics_uniqueOpened'] =
        statisticsData && statisticsData.uniqueOpened ? Number(statisticsData.uniqueOpened) : null;
      item['statistics_totalClicked'] =
        statisticsData && statisticsData.totalClicked ? Number(statisticsData.totalClicked) : null;
      item['statistics_uniqueClicked'] =
        statisticsData && statisticsData.uniqueClicked ? Number(statisticsData.uniqueClicked) : null;
      item['statistics_goals'] = statisticsData && statisticsData.goals ? Number(statisticsData.goals) : null;
      item['statistics_uniqueGoals'] =
        statisticsData && statisticsData.uniqueGoals ? Number(statisticsData.uniqueGoals) : null;
      item['statistics_forwarded'] =
        statisticsData && statisticsData.forwarded ? Number(statisticsData.forwarded) : null;
      item['statistics_unsubscribed'] =
        statisticsData && statisticsData.unsubscribed ? Number(statisticsData.unsubscribed) : null;
      item['statistics_bounced'] = statisticsData && statisticsData.bounced ? Number(statisticsData.bounced) : null;
      item['statistics_complaints'] =
        statisticsData && statisticsData.complaints ? Number(statisticsData.complaints) : null;
      item['last_update'] = 'CURRENT_TIMESTAMP()';
    }
  } catch (error) {
    try {
      const URL = `${functions.config().getresponse.url}/newsletters/${id}/statistics`;
      console.log(`===> URL <=== ${URL}`);
      const statistics = await Tools.sendRequest(URL, headers, 'GET');
      if (statistics && statistics.data) {
        const [statisticsData] = statistics && statistics.data ? statistics.data : {};
        item['statistics_timeInterval'] =
          statisticsData && statisticsData.timeInterval ? statisticsData.timeInterval : null;
        item['statistics_sent'] = statisticsData && statisticsData.sent ? statisticsData.sent : null;
        item['statistics_totalOpened'] =
          statisticsData && statisticsData.totalOpened ? Number(statisticsData.totalOpened) : null;
        item['statistics_uniqueOpened'] =
          statisticsData && statisticsData.uniqueOpened ? Number(statisticsData.uniqueOpened) : null;
        item['statistics_totalClicked'] =
          statisticsData && statisticsData.totalClicked ? Number(statisticsData.totalClicked) : null;
        item['statistics_uniqueClicked'] =
          statisticsData && statisticsData.uniqueClicked ? Number(statisticsData.uniqueClicked) : null;
        item['statistics_goals'] = statisticsData && statisticsData.goals ? Number(statisticsData.goals) : null;
        item['statistics_uniqueGoals'] =
          statisticsData && statisticsData.uniqueGoals ? Number(statisticsData.uniqueGoals) : null;
        item['statistics_forwarded'] =
          statisticsData && statisticsData.forwarded ? Number(statisticsData.forwarded) : null;
        item['statistics_unsubscribed'] =
          statisticsData && statisticsData.unsubscribed ? Number(statisticsData.unsubscribed) : null;
        item['statistics_bounced'] = statisticsData && statisticsData.bounced ? Number(statisticsData.bounced) : null;
        item['statistics_complaints'] =
          statisticsData && statisticsData.complaints ? Number(statisticsData.complaints) : null;
        item['last_update'] = 'CURRENT_TIMESTAMP()';
      }
    } catch (error) {
      try {
        const URL = `${functions.config().getresponse.url}/newsletters/${id}/statistics`;
        console.log(`===> URL <=== ${URL}`);
        const statistics = await Tools.sendRequest(URL, headers, 'GET');
        if (statistics && statistics.data) {
          const [statisticsData] = statistics && statistics.data ? statistics.data : {};
          item['statistics_timeInterval'] =
            statisticsData && statisticsData.timeInterval ? statisticsData.timeInterval : null;
          item['statistics_sent'] = statisticsData && statisticsData.sent ? statisticsData.sent : null;
          item['statistics_totalOpened'] =
            statisticsData && statisticsData.totalOpened ? Number(statisticsData.totalOpened) : null;
          item['statistics_uniqueOpened'] =
            statisticsData && statisticsData.uniqueOpened ? Number(statisticsData.uniqueOpened) : null;
          item['statistics_totalClicked'] =
            statisticsData && statisticsData.totalClicked ? Number(statisticsData.totalClicked) : null;
          item['statistics_uniqueClicked'] =
            statisticsData && statisticsData.uniqueClicked ? Number(statisticsData.uniqueClicked) : null;
          item['statistics_goals'] = statisticsData && statisticsData.goals ? Number(statisticsData.goals) : null;
          item['statistics_uniqueGoals'] =
            statisticsData && statisticsData.uniqueGoals ? Number(statisticsData.uniqueGoals) : null;
          item['statistics_forwarded'] =
            statisticsData && statisticsData.forwarded ? Number(statisticsData.forwarded) : null;
          item['statistics_unsubscribed'] =
            statisticsData && statisticsData.unsubscribed ? Number(statisticsData.unsubscribed) : null;
          item['statistics_bounced'] = statisticsData && statisticsData.bounced ? Number(statisticsData.bounced) : null;
          item['statistics_complaints'] =
            statisticsData && statisticsData.complaints ? Number(statisticsData.complaints) : null;
          item['last_update'] = 'CURRENT_TIMESTAMP()';
        }
      } catch (error) {
        console.error(`***** NEWSLETTER ERROR ON ${id}*****`);
      }
    }
  }
  return item;
}

/**
 * Main Activities per Contact function
 * @param {string} contactId - The contactId.
 * @param {number} page - The initial page.
 * @param {string} noPaginate - True or false String to indicates if paginate (save register) or not the request.
 * @returns {Promise<Object>} Promise object
 */

async function bq_main_activities_per_contact(contactId, page, from) {
  const tableName = 'activities';
  try {
    page = page ? Number(page) : 1;
    const perPage = 1000;

    let url = `${functions.config().getresponse.url
      }/contacts/${contactId}/activities?query[createdOn][from]=2015-01-01T09:58:10%2B0000&sort[createdOn]=asc&perPage=${perPage}&page=${page}`;

    let arrayData = [];
    const dataset = bigqueryClient.dataset(datasetId);
    const table = dataset.table(tableName);
    const resp = await Tools.sendRequest(url, headers, 'GET');

    const TOTAL_PAGES = resp && resp.headers && resp.headers.totalpages ? Number(resp.headers.totalpages) : null;
    const CURRENT_PAGE = resp && resp.headers && resp.headers.currentpage ? Number(resp.headers.currentpage) : null;

    console.log(`${CURRENT_PAGE} of ${TOTAL_PAGES}`);

    for (const item of Array.from(resp.data)) {
      if (item && item.activity && (item.activity === 'open' || item.activity === 'click')) {
        arrayData.push({
          activity: item && item.activity ? item.activity : '',
          createdOn: item && item.createdOn ? item.createdOn : '',
          _createdOn: moment(item && item.createdOn ? item.createdOn : '')
            .utc(false)
            .format('YYYY-MM-DD HH:mm:ss'),
          contactId: contactId,
          object_from: from,
          subject: item && item.subject ? item.subject : '',
          resource_resourceId: item && item.resource && item.resource.resourceId ? item.resource.resourceId : '',
          resource_resourceType: item && item.resource && item.resource.resourceType ? item.resource.resourceType : '',
          resource_href: item && item.resource && item.resource.href ? item.resource.href : '',
          clickTrack_id: item && item.clickTrack && item.clickTrack.id ? item.clickTrack.id : '',
          clickTrack_name: item && item.clickTrack && item.clickTrack.name ? item.clickTrack.name : '',
          clickTrack_url: item && item.clickTrack && item.clickTrack.url ? item.clickTrack.url : ''
        });
      }
    }

    if (arrayData.length > 0) {
      await table.insert(arrayData);
    }

    console.log(`page: ${CURRENT_PAGE} of total: ${TOTAL_PAGES}`);

    if (CURRENT_PAGE < TOTAL_PAGES) {
      await bq_main_activities_per_contact(contactId, CURRENT_PAGE + 1, from);
    }

    return true;
  } catch (e) {
    console.error(e);
    return e;
  }
}

/**
 * Main Activities function
 * @param {Object} params - The main function's params.
 * @param {string} params.page - The initial page.
 * @returns {Promise<Object>} Promise object
 */

async function bq_main_activities(params) {
  try {
    const PER_PAGE = 50;
    params.page = params && params.page ? params.page : 1;
    const URL = `${functions.config().getresponse.url}/contacts?perPage=${PER_PAGE}&sort[createdOn]=asc&page=${params.page
      }`;
    const resp = await Tools.sendRequest(URL, headers, 'GET');
    for (const contact of Array.from(resp.data)) {
      try {
        console.log(`*************** INFO: ${contact.contactId} ***************`);
        await bq_main_activities_per_contact(contact.contactId, 1, 'batch');
      } catch (error) {
        console.log(error);
        if (contact && contact.contactId) {
          const DOC = `${pagination_path}/activities`;
          let logColl = `${DOC}/logs`;
          await db
            .collection(logColl)
            .doc(contact.contactId)
            .set({ type: 'error-activities', contactId: contact.contactId, date: moment().toDate() }, { merge: true });
        }
      }
    }

    const TOTAL_PAGES = resp && resp.headers && resp.headers.totalpages ? Number(resp.headers.totalpages) : null;
    const CURRENT_PAGE = resp && resp.headers && resp.headers.currentpage ? Number(resp.headers.currentpage) : null;

    const DOC = `${pagination_path}/activities`;
    let pageDoc = `${DOC}/pagination/${CURRENT_PAGE}`;

    await db.doc(DOC).set(
      {
        current_page: CURRENT_PAGE,
        date: moment().toDate(),
        total_pages: TOTAL_PAGES,
        status: 'in-progress'
      },
      { merge: true }
    );
    try {
      await db.doc(pageDoc).delete();
    } catch (error) {
      console.error(error);
    }

    if (CURRENT_PAGE < TOTAL_PAGES) {
      pageDoc = `${DOC}/pagination/${CURRENT_PAGE + 1}`;
      await db.doc(pageDoc).set(
        {
          date: moment().toDate(),
          current_page: CURRENT_PAGE + 1,
          total_pages: TOTAL_PAGES,
          status: 'pending'
        },
        { merge: true }
      );
    }

    if (CURRENT_PAGE === TOTAL_PAGES || TOTAL_PAGES === 0) {
      await db.doc(DOC).update({ status: 'completed' });
    }

    return { TOTAL_PAGES, CURRENT_PAGE, DOC, pageDoc };
  } catch (e) {
    console.error(e);
    return e;
  }
}

/**
 * Main Newsletters Update function
 * @param {number} page - The initial page.
 * @returns {Promise<Object>} Promise object
 */

async function bq_main_newsletters_update(page) {
  try {
    const tableName = 'newsletters';
    const perPage = 100;
    page = page ? Number(page) : 0;
    const offset = page * perPage;
    const PATH = `\`${functions.config().configfb.database_name}.${datasetId}.${tableName}\``;
    const dataset = bigqueryClient.dataset(datasetId);
    const table = dataset.table(tableName);

    const QUERY_SELECT = `SELECT * FROM ${PATH} ORDER BY _createdOn ASC LIMIT ${perPage} OFFSET ${offset}`;
    const [responseQuery] = await table.query(QUERY_SELECT);

    const CURRENT_PAGE = page;
    const DOC = `${pagination_path}/newsletters_update`;
    let pageDoc = `${DOC}/pagination/${CURRENT_PAGE}`;

    for (let data of responseQuery) {
      try {
        let url = `${functions.config().getresponse.url}/newsletters/${data.newsletterId}/statistics`;
        const resp = await Tools.sendRequest(url, headers, 'GET');
        const [statistics] = resp.data;
        const QUERY_UPDATE = `
        UPDATE ${PATH} SET  
          statistics_timeInterval = '${statistics.timeInterval}',
          statistics_sent = ${statistics.sent},
          statistics_totalOpened = ${statistics.totalOpened},
          statistics_uniqueOpened = ${statistics.uniqueOpened},
          statistics_totalClicked = ${statistics.totalClicked},
          statistics_uniqueClicked = ${statistics.uniqueClicked},
          statistics_goals = ${statistics.goals},
          statistics_uniqueGoals = ${statistics.uniqueGoals},
          statistics_forwarded = ${statistics.forwarded},
          statistics_unsubscribed = ${statistics.unsubscribed},
          statistics_bounced = ${statistics.bounced},
          statistics_complaints = ${statistics.complaints},
          last_update = CURRENT_TIMESTAMP()
        WHERE newsletterId = '${data.newsletterId}'`;

        console.log(`##### Newsletter updated: ${data.newsletterId} #####`);
        await table.query(QUERY_UPDATE);
      } catch (e) {
        try {
          let url = `${functions.config().getresponse.url}/newsletters/${data.newsletterId}/statistics`;
          const resp = await Tools.sendRequest(url, headers, 'GET');
          const [statistics] = resp.data;
          const QUERY_UPDATE = `
          UPDATE ${PATH} SET  
            statistics_timeInterval = '${statistics.timeInterval}',
            statistics_sent = ${statistics.sent},
            statistics_totalOpened = ${statistics.totalOpened},
            statistics_uniqueOpened = ${statistics.uniqueOpened},
            statistics_totalClicked = ${statistics.totalClicked},
            statistics_uniqueClicked = ${statistics.uniqueClicked},
            statistics_goals = ${statistics.goals},
            statistics_uniqueGoals = ${statistics.uniqueGoals},
            statistics_forwarded = ${statistics.forwarded},
            statistics_unsubscribed = ${statistics.unsubscribed},
            statistics_bounced = ${statistics.bounced},
            statistics_complaints = ${statistics.complaints},
            last_update = CURRENT_TIMESTAMP()
          WHERE newsletterId = '${data.newsletterId}'`;

          console.log(`##### Newsletter updated: ${data.newsletterId} #####`);
          await table.query(QUERY_UPDATE);
        } catch (e) {
          try {
            let url = `${functions.config().getresponse.url}/newsletters/${data.newsletterId}/statistics`;
            const resp = await Tools.sendRequest(url, headers, 'GET');
            const [statistics] = resp.data;
            const QUERY_UPDATE = `
            UPDATE ${PATH} SET  
              statistics_timeInterval = '${statistics.timeInterval}',
              statistics_sent = ${statistics.sent},
              statistics_totalOpened = ${statistics.totalOpened},
              statistics_uniqueOpened = ${statistics.uniqueOpened},
              statistics_totalClicked = ${statistics.totalClicked},
              statistics_uniqueClicked = ${statistics.uniqueClicked},
              statistics_goals = ${statistics.goals},
              statistics_uniqueGoals = ${statistics.uniqueGoals},
              statistics_forwarded = ${statistics.forwarded},
              statistics_unsubscribed = ${statistics.unsubscribed},
              statistics_bounced = ${statistics.bounced},
              statistics_complaints = ${statistics.complaints},
              last_update = CURRENT_TIMESTAMP()
            WHERE newsletterId = '${data.newsletterId}'`;

            console.log(`##### Newsletter updated: ${data.newsletterId} #####`);
            await table.query(QUERY_UPDATE);
          } catch (e) {
            console.error(e);
            console.error(`**************** ERROR UPDATING NEWSLETTER: ${data.newsletterId} ****************`);
          }
        }
      }
    }

    await db
      .doc(DOC)
      .set({ current_page: CURRENT_PAGE, date: moment().toDate(), status: 'in-progress' }, { merge: true });
    try {
      await db.doc(pageDoc).delete();
    } catch (error) {
      console.error(error);
    }

    if (responseQuery.length > 0 && responseQuery.length === perPage) {
      pageDoc = `${DOC}/pagination/${CURRENT_PAGE + 1}`;
      await db.doc(pageDoc).set(
        {
          date: moment().toDate(),
          current_page: CURRENT_PAGE + 1,
          status: 'pending'
        },
        { merge: true }
      );
    } else {
      await db.doc(DOC).update({ status: 'completed' });
    }

    return true;
  } catch (e) {
    console.error(e);
    return e;
  }
}
