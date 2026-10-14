const { BigQuery } = require('@google-cloud/bigquery');
const Tools = require('../Tools');
const moment = require('moment');

const datasetId = 'getResponse';
const bigqueryClient = new BigQuery();
const pagination_path = 'bq_pagination';
const PER_PAGE = 100;

function getGetResponseHeaders() {
  const apiKey = process.env.GETRESPONSE_API_KEY || '';
  return {
    'Content-Type': 'application/json',
    'X-Auth-Token': `api-key ${apiKey}`
  };
}

function getDatabaseName() {
  return process.env.CONFIGFB_DATABASE_NAME || 'conectimed-production';
}

function getGetResponseUrl() {
  return process.env.GETRESPONSE_URL || '';
}

// TABLES SCHEMAS

const schemaContacts = [
  { name: 'contactId', type: 'STRING', mode: 'REQUIRED' },
  { name: 'href', type: 'STRING', mode: 'REQUIRED' },
  { name: 'name', type: 'STRING', mode: 'REQUIRED' },
  { name: 'email', type: 'STRING', mode: 'REQUIRED' },
  { name: 'note', type: 'STRING' },
  { name: 'origin', type: 'STRING', mode: 'REQUIRED' },
  { name: 'dayOfCycle', type: 'STRING' },
  { name: 'changedOn', type: 'STRING', mode: 'REQUIRED' },
  { name: '_changedOn', type: 'TIMESTAMP', mode: 'REQUIRED' },
  { name: 'last_update_activities', type: 'TIMESTAMP' },
  { name: 'timeZone', type: 'STRING' },
  { name: 'ipAddress', type: 'STRING' },
  { name: 'activities', type: 'STRING', mode: 'REQUIRED' },
  { name: 'createdOn', type: 'STRING', mode: 'REQUIRED' },
  { name: '_createdOn', type: 'TIMESTAMP', mode: 'REQUIRED' },
  { name: 'scoring', type: 'STRING' },
  { name: 'engagementScore', type: 'INT64', mode: 'REQUIRED' },
  { name: 'bq_createdOn', type: 'INT64' },
  { name: 'id', type: 'INT64' },
  { name: 'campaign_campaignId', type: 'STRING' },
  { name: 'campaign_href', type: 'STRING' },
  { name: 'campaign_name', type: 'STRING' },
  { name: 'especialidad', type: 'STRING' },
  { name: 'estado', type: 'STRING' },
  { name: 'primer_nombre', type: 'STRING' },
  { name: 'segundo_nombre', type: 'STRING' },
  { name: 'apellido_paterno', type: 'STRING' },
  { name: 'apellido_materno', type: 'STRING' },
  { name: 'uid', type: 'STRING' },
  { name: 'titulo', type: 'STRING' }
];

const schemaCampaigns = [
  { name: 'campaignId', type: 'STRING', mode: 'REQUIRED' },
  { name: 'href', type: 'STRING', mode: 'REQUIRED' },
  { name: 'name', type: 'STRING', mode: 'REQUIRED' },
  { name: 'techName', type: 'STRING', mode: 'REQUIRED' },
  { name: 'description', type: 'STRING' },
  { name: 'languageCode', type: 'STRING' },
  { name: 'isDefault', type: 'STRING' },
  { name: 'createdOn', type: 'STRING', mode: 'REQUIRED' },
  { name: '_createdOn', type: 'TIMESTAMP', mode: 'REQUIRED' },
  { name: 'bq_createdOn', type: 'INT64' },
  { name: 'id', type: 'INT64' }
];

const schemaNewsletters = [
  { name: 'newsletterId', type: 'STRING', mode: 'REQUIRED' },
  { name: 'name', type: 'STRING', mode: 'REQUIRED' },
  { name: 'type', type: 'STRING', mode: 'REQUIRED' },
  { name: 'subject', type: 'STRING', mode: 'REQUIRED' },
  { name: 'flags', type: 'STRING', mode: 'REQUIRED' },
  { name: 'editor', type: 'STRING', mode: 'REQUIRED' },
  { name: 'href', type: 'STRING', mode: 'REQUIRED' },
  { name: 'campaign', type: 'JSON' },
  { name: 'status', type: 'STRING', mode: 'REQUIRED' },
  { name: 'sendOn', type: 'STRING', mode: 'REQUIRED' },
  { name: 'createdOn', type: 'STRING', mode: 'REQUIRED' },
  { name: '_createdOn', type: 'TIMESTAMP', mode: 'REQUIRED' },
  { name: 'sendSettings', type: 'JSON' },
  { name: 'sendMetrics', type: 'JSON' },
  { name: 'bq_createdOn', type: 'INT64' },
  { name: 'id', type: 'INT64' },
  { name: 'campaign_campaignId', type: 'STRING' },
  { name: 'campaign_href', type: 'STRING' },
  { name: 'campaign_name', type: 'STRING' },
  { name: 'sendSettings_timeTravel', type: 'STRING' },
  { name: 'sendSettings_perfectTiming', type: 'STRING' },
  { name: 'sendMetrics_status', type: 'STRING' },
  { name: 'sendMetrics_sent', type: 'STRING' },
  { name: 'sendMetrics_total', type: 'STRING' },
  { name: 'statistics_timeInterval', type: 'STRING' },
  { name: 'statistics_sent', type: 'INT64' },
  { name: 'statistics_totalOpened', type: 'INT64' },
  { name: 'statistics_uniqueOpened', type: 'INT64' },
  { name: 'statistics_totalClicked', type: 'INT64' },
  { name: 'statistics_uniqueClicked', type: 'INT64' },
  { name: 'statistics_goals', type: 'INT64' },
  { name: 'statistics_uniqueGoals', type: 'INT64' },
  { name: 'statistics_forwarded', type: 'INT64' },
  { name: 'statistics_unsubscribed', type: 'INT64' },
  { name: 'statistics_bounced', type: 'INT64' },
  { name: 'statistics_complaints', type: 'INT64' },
  { name: 'last_update', type: 'TIMESTAMP' }
];

const schemaActivities = [
  { type: 'STRING', mode: 'REQUIRED', name: 'activity' },
  { type: 'STRING', mode: 'REQUIRED', name: 'createdOn' },
  { type: 'TIMESTAMP', mode: 'REQUIRED', name: '_createdOn' },
  { type: 'STRING', mode: 'REQUIRED', name: 'contactId' },
  { type: 'STRING', mode: 'REQUIRED', name: 'object_from' },
  { type: 'STRING', mode: 'REQUIRED', name: 'subject' },
  { type: 'STRING', mode: 'REQUIRED', name: 'resource_resourceId' },
  { type: 'STRING', mode: 'REQUIRED', name: 'resource_resourceType' },
  { type: 'STRING', mode: 'REQUIRED', name: 'resource_href' },
  { type: 'STRING', name: 'clickTrack_id' },
  { type: 'STRING', name: 'clickTrack_name' },
  { type: 'STRING', name: 'clickTrack_url' }
];

// REQUEST FUNCTIONS

async function bq_onRequest_contacts(req, res) {
  res.set('Content-Type', 'application/json');
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method === 'GET') {
    const page = req.query && req.query.page ? Number(req.query.page) : 1;
    const respURL = await getURL('contacts');
    const resp = await bq_contacts({
      page: page,
      url: respURL.url,
      lastIndex: respURL.lastIndex,
      noPaginate: req.query.noPaginate
    });
    return res.status(200).json({ response: resp });
  } else {
    return res.status(405).json({ code: 405, message: `${req.method} Method Not Allowed` });
  }
}

async function bq_onRequest_campaigns(req, res) {
  res.set('Content-Type', 'application/json');
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method === 'GET') {
    const page = req.query && req.query.page ? Number(req.query.page) : 1;
    const respURL = await getURL('campaigns');
    const resp = await bq_campaigns({
      page: page,
      url: respURL.url,
      lastIndex: respURL.lastIndex,
      noPaginate: req.query.noPaginate
    });
    return res.status(200).json({ response: resp });
  } else {
    return res.status(405).json({ code: 405, message: `${req.method} Method Not Allowed` });
  }
}

async function bq_onRequest_newsletters(req, res) {
  res.set('Content-Type', 'application/json');
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method === 'GET') {
    const page = req.query && req.query.page ? Number(req.query.page) : 1;
    const respURL = await getURL('newsletters');
    const resp = await bq_newsletters({
      page: page,
      url: respURL.url,
      lastIndex: respURL.lastIndex,
      noPaginate: req.query.noPaginate
    });
    return res.status(200).json({ response: resp });
  } else {
    return res.status(405).json({ code: 405, message: `${req.method} Method Not Allowed` });
  }
}

async function bq_onRequest_newsletters_update(req, res) {
  res.set('Content-Type', 'application/json');
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method === 'GET') {
    const page = req.query && req.query.page ? Number(req.query.page) : 0;
    const resp = await bq_main_newsletters_update(page);
    return res.status(200).json({ response: resp });
  } else {
    return res.status(405).json({ code: 405, message: `${req.method} Method Not Allowed` });
  }
}

async function bq_onRequest_activities(req, res) {
  res.set('Content-Type', 'application/json');
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method === 'GET') {
    const page = req.query && req.query.page ? Number(req.query.page) : 1;
    const resp = await bq_main_activities({ page: page });
    return res.status(200).json({ response: resp });
  } else {
    return res.status(405).json({ code: 405, message: `${req.method} Method Not Allowed` });
  }
}

async function bq_onRequest_createTable(req, res) {
  res.set('Content-Type', 'application/json');
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method === 'POST') {
    if (req.body && req.body.name) {
      await bq_createTable(req.body.name);
      return res.status(200).json({ success: true });
    } else {
      return res.status(401).json({ message: 'missing parameters' });
    }
  } else {
    return res.status(405).json({ code: 405, message: `${req.method} Method Not Allowed` });
  }
}

async function bq_onRequest_getResponseWebhook(req, res) {
  res.set('Content-Type', 'application/json');
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method === 'POST') {
    const saveTo = req.query && req.query.save_to ? req.query.save_to : 'activities_save';
    try {
      if (req.body && req.body.type) {
        const data = req.body;
        const tableName = saveTo;
        const databaseName = getDatabaseName();
        const PATH = `\`${databaseName}.${datasetId}.${tableName}\``;

        let activityData = {};

        if (
          data &&
          data.type &&
          (data.type === 'contact_clicked_message_link' || data.type === 'contact_opened_message')
        ) {
          activityData = {
            activity: data.type === 'contact_opened_message' ? 'open' : 'click',
            createdOn: data.event && data.event.occurredAt ? data.event.occurredAt : '',
            _createdOn: moment(data.event && data.event.occurredAt ? data.event.occurredAt : '')
              .utc(false)
              .format('YYYY-MM-DDTHH:mm:ss+0000'),
            contactId: data.contact && data.contact.contactId ? data.contact.contactId : '',
            subject: data.message && data.message.subject ? data.message.subject : '',
            resource_resourceId: data.message && data.message.resourceId ? data.message.resourceId : '',
            resource_resourceType: data.message && data.message.resourceType ? data.message.resourceType : '',
            resource_href: data.message && data.message.href ? data.message.href : '',
            clickTrack_id: data.clickTrack && data.clickTrack.clickTrackId ? data.clickTrack.clickTrackId : '',
            clickTrack_name: data.clickTrack && data.clickTrack.name ? data.clickTrack.name : '',
            clickTrack_url: data.clickTrack && data.clickTrack.url ? data.clickTrack.url : ''
          };
        } else {
          return res.status(204).send({ status: 'OK' });
        }

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

        await bigqueryClient.query(query);
      }
      return res.status(200).json({ status: 'OK' });
    } catch (error) {
      console.error('Error in getResponseWebhook:', error);
      return res.status(204).json({ status: 'OK' });
    }
  } else {
    return res.status(204).json({ status: 'OK' });
  }
}

// ON CREATED TRIGGERS

async function bq_onCreate_pagination(event) {
  try {
    const snapshot = event.data;
    if (!snapshot) return true;
    const data = snapshot.data();
    if (!data) return true;

    const table = event.params.table;
    if (data.status === 'pending' && data.current_page) {
      switch (table) {
        case 'contacts':
          await bq_contacts({ page: data.current_page, url: data.url, lastIndex: data.lastIndex });
          break;
        case 'campaigns':
          await bq_campaigns({ page: data.current_page, url: data.url, lastIndex: data.lastIndex });
          break;
        case 'newsletters':
          await bq_newsletters({ page: data.current_page, url: data.url, lastIndex: data.lastIndex });
          break;
        case 'newsletters_update':
          await bq_main_newsletters_update(data.current_page);
          break;
        case 'activities':
          await bq_main_activities({ page: data.current_page });
          break;
      }
    }
    return true;
  } catch (error) {
    console.error('Error in bq_onCreate_pagination:', error);
    return error;
  }
}

// SCHEDULED FUNCTIONS

async function bq_onRun_newsletters() {
  try {
    const respURL = await getURL('newsletters');
    await bq_newsletters({ page: 1, url: respURL.url, lastIndex: respURL.lastIndex });
    return true;
  } catch (error) {
    console.error(error);
    return error;
  }
}

async function bq_onRun_newsletters_update() {
  try {
    await bq_main_newsletters_update(0);
    return true;
  } catch (error) {
    console.error(error);
    return error;
  }
}

async function bq_onRun_campaigns() {
  try {
    const respURL = await getURL('campaigns');
    await bq_campaigns({ page: 1, url: respURL.url, lastIndex: respURL.lastIndex });
    return true;
  } catch (error) {
    console.error(error);
    return error;
  }
}

async function bq_onRun_contacts() {
  try {
    const respURL = await getURL('contacts');
    await bq_contacts({ page: 1, url: respURL.url, lastIndex: respURL.lastIndex });
    return true;
  } catch (error) {
    console.error(error);
    return error;
  }
}

// HELPER FUNCTIONS

async function bq_createTable(tableName) {
  try {
    const dataset = bigqueryClient.dataset(datasetId);
    const table = dataset.table(tableName);
    const existDataset = await dataset.exists();

    if (!existDataset[0]) {
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
      case 'activities_save':
        schema = schemaActivities;
        break;
    }

    const existTable = await table.exists();
    if (!existTable[0]) {
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
  const databaseName = getDatabaseName();
  return `\`${databaseName}.${datasetId}.${tableNameRecord}\``;
}

async function getURL(tableName) {
  try {
    const TABLE_NAME_RECORD = getTableNameRecord(tableName);
    const PATH_RECORD = getPathRecord(TABLE_NAME_RECORD);
    const getResponseUrl = getGetResponseUrl();

    let url = `${getResponseUrl}/${tableName}?perPage=${PER_PAGE}&sort[createdOn]=asc`;
    let lastIndex = undefined;

    if (tableName !== 'campaigns') {
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
            url = `${getResponseUrl}/${tableName}?query[createdOn][from]=${from}&perPage=${PER_PAGE}&sort[createdOn]=asc`;
          }
          if (last_index) {
            lastIndex = last_index;
          }
        }
      } catch (error) {
        console.error(error);
      }
    }

    return { url, lastIndex };
  } catch (error) {
    console.error(error);
    return false;
  }
}

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

async function bq_main(params) {
  const admin = Tools.getFBAdminInstance();
  const db = admin.firestore();
  const databaseName = getDatabaseName();
  const getResponseHeaders = getGetResponseHeaders();

  try {
    const PATH = `\`${databaseName}.${datasetId}.${params.tableName}\``;
    const TABLE_NAME_RECORD = getTableNameRecord(params.tableName);
    const PATH_RECORD = getPathRecord(TABLE_NAME_RECORD);
    const dataset = bigqueryClient.dataset(datasetId);
    const table = dataset.table(params.tableName);
    params.page = params && params.page ? params.page : 1;
    const URL = `${params.url}&page=${params.page}`;
    const resp = await Tools.sendRequest(URL, getResponseHeaders, 'GET');
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
          let url = `${getGetResponseUrl()}/contacts/${item.contactId}`;
          const resp = await Tools.sendRequest(url, getResponseHeaders, 'GET');
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
            index = ARRAY.map(item => item.name).indexOf('estado');
            if (index > -1) {
              custom.estado = ARRAY[index] && ARRAY[index].value && ARRAY[index].value[0] ? ARRAY[index].value[0] : '';
            }
            index = ARRAY.map(item => item.name).indexOf('primer_nombre');
            if (index > -1) {
              custom.primer_nombre =
                ARRAY[index] && ARRAY[index].value && ARRAY[index].value[0] ? ARRAY[index].value[0] : '';
            }
            index = ARRAY.map(item => item.name).indexOf('segundo_nombre');
            if (index > -1) {
              custom.segundo_nombre =
                ARRAY[index] && ARRAY[index].value && ARRAY[index].value[0] ? ARRAY[index].value[0] : '';
            }
            index = ARRAY.map(item => item.name).indexOf('primer_apellido');
            if (index > -1) {
              custom.apellido_paterno =
                ARRAY[index] && ARRAY[index].value && ARRAY[index].value[0] ? ARRAY[index].value[0] : '';
            }
            index = ARRAY.map(item => item.name).indexOf('segundo_apellido');
            if (index > -1) {
              custom.apellido_materno =
                ARRAY[index] && ARRAY[index].value && ARRAY[index].value[0] ? ARRAY[index].value[0] : '';
            }
            index = ARRAY.map(item => item.name).indexOf('uid');
            if (index > -1) {
              custom.uid = ARRAY[index] && ARRAY[index].value && ARRAY[index].value[0] ? ARRAY[index].value[0] : '';
            }
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
        return !!(item && item.campaign_name && (item.campaign_name === 'notificacion' || item.campaign_name === 'pruebanewsletter'));
      });
    }

    let inQuery = '';

    for (let i = 0; i < ARRAY_DATA.length; i++) {
      inQuery += `"${ARRAY_DATA[i][params.primaryKey]}"`;
      if (i !== ARRAY_DATA.length - 1) {
        inQuery += ', ';
      }
    }

    const queryStr = `SELECT ${params.primaryKey} FROM ${PATH} WHERE ${params.primaryKey} IN (${inQuery})`;
    const [responseQuery] = inQuery && inQuery !== '' ? await bigqueryClient.query(queryStr) : [[]];

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
        if (count1 !== params.schema.length - 1) {
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
      await bigqueryClient.query(`INSERT INTO ${PATH} (${keysQuery}) VALUES ${insertQuery.slice(0, -2)}`);
    }

    if (updateQueryArray.length > 0) {
      await bigqueryClient.query(updateQuery);
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
      const TABLE_NAME_RECORD = getTableNameRecord(params.tableName);
      const PATH_RECORD = getPathRecord(TABLE_NAME_RECORD);
      const dataset = bigqueryClient.dataset(datasetId);
      const table = dataset.table(TABLE_NAME_RECORD);
      const existTable = await table.exists();
      if (!existTable[0]) {
        await dataset.createTable(TABLE_NAME_RECORD, {
          schema: [
            { name: 'last_update', type: 'TIMESTAMP', mode: 'REQUIRED' },
            { name: 'last_index', type: 'INT64', mode: 'REQUIRED' },
            { name: 'current_page', type: 'INT64', mode: 'REQUIRED' },
            { name: 'total_pages', type: 'INT64', mode: 'REQUIRED' },
            { name: 'per_page', type: 'INT64', mode: 'REQUIRED' }
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

async function bq_update_newsletter(id) {
  let item = {};
  const getResponseHeaders = getGetResponseHeaders();
  const getResponseUrl = getGetResponseUrl();

  try {
    const URL = `${getResponseUrl}/newsletters/${id}/statistics`;
    const statistics = await Tools.sendRequest(URL, getResponseHeaders, 'GET');
    if (statistics && statistics.data) {
      const [statisticsData] = statistics.data || {};
      item['statistics_timeInterval'] = statisticsData?.timeInterval || null;
      item['statistics_sent'] = statisticsData?.sent || null;
      item['statistics_totalOpened'] = statisticsData?.totalOpened ? Number(statisticsData.totalOpened) : null;
      item['statistics_uniqueOpened'] = statisticsData?.uniqueOpened ? Number(statisticsData.uniqueOpened) : null;
      item['statistics_totalClicked'] = statisticsData?.totalClicked ? Number(statisticsData.totalClicked) : null;
      item['statistics_uniqueClicked'] = statisticsData?.uniqueClicked ? Number(statisticsData.uniqueClicked) : null;
      item['statistics_goals'] = statisticsData?.goals ? Number(statisticsData.goals) : null;
      item['statistics_uniqueGoals'] = statisticsData?.uniqueGoals ? Number(statisticsData.uniqueGoals) : null;
      item['statistics_forwarded'] = statisticsData?.forwarded ? Number(statisticsData.forwarded) : null;
      item['statistics_unsubscribed'] = statisticsData?.unsubscribed ? Number(statisticsData.unsubscribed) : null;
      item['statistics_bounced'] = statisticsData?.bounced ? Number(statisticsData.bounced) : null;
      item['statistics_complaints'] = statisticsData?.complaints ? Number(statisticsData.complaints) : null;
      item['last_update'] = 'CURRENT_TIMESTAMP()';
    }
  } catch (error) {
    console.error(`***** NEWSLETTER ERROR ON ${id} *****`, error);
  }
  return item;
}

async function bq_main_activities_per_contact(contactId, page, from) {
  const tableName = 'activities';
  const getResponseHeaders = getGetResponseHeaders();
  const getResponseUrl = getGetResponseUrl();

  try {
    page = page ? Number(page) : 1;
    const perPage = 1000;

    let url = `${getResponseUrl}/contacts/${contactId}/activities?query[createdOn][from]=2015-01-01T09:58:10%2B0000&sort[createdOn]=asc&perPage=${perPage}&page=${page}`;

    let arrayData = [];
    const dataset = bigqueryClient.dataset(datasetId);
    const table = dataset.table(tableName);
    const resp = await Tools.sendRequest(url, getResponseHeaders, 'GET');

    const TOTAL_PAGES = resp && resp.headers && resp.headers.totalpages ? Number(resp.headers.totalpages) : null;
    const CURRENT_PAGE = resp && resp.headers && resp.headers.currentpage ? Number(resp.headers.currentpage) : null;

    for (const item of Array.from(resp.data)) {
      if (item && item.activity && (item.activity === 'open' || item.activity === 'click')) {
        arrayData.push({
          activity: item.activity || '',
          createdOn: item.createdOn || '',
          _createdOn: moment(item.createdOn || '').utc(false).format('YYYY-MM-DD HH:mm:ss'),
          contactId: contactId,
          object_from: from,
          subject: item.subject || '',
          resource_resourceId: item.resource && item.resource.resourceId ? item.resource.resourceId : '',
          resource_resourceType: item.resource && item.resource.resourceType ? item.resource.resourceType : '',
          resource_href: item.resource && item.resource.href ? item.resource.href : '',
          clickTrack_id: item.clickTrack && item.clickTrack.id ? item.clickTrack.id : '',
          clickTrack_name: item.clickTrack && item.clickTrack.name ? item.clickTrack.name : '',
          clickTrack_url: item.clickTrack && item.clickTrack.url ? item.clickTrack.url : ''
        });
      }
    }

    if (arrayData.length > 0) {
      await table.insert(arrayData);
    }

    if (CURRENT_PAGE < TOTAL_PAGES) {
      await bq_main_activities_per_contact(contactId, CURRENT_PAGE + 1, from);
    }

    return true;
  } catch (e) {
    console.error(e);
    return e;
  }
}

async function bq_main_activities(params) {
  const admin = Tools.getFBAdminInstance();
  const db = admin.firestore();
  const getResponseHeaders = getGetResponseHeaders();
  const getResponseUrl = getGetResponseUrl();

  try {
    const PER_PAGE_ACT = 50;
    params.page = params && params.page ? params.page : 1;
    const URL = `${getResponseUrl}/contacts?perPage=${PER_PAGE_ACT}&sort[createdOn]=asc&page=${params.page}`;
    const resp = await Tools.sendRequest(URL, getResponseHeaders, 'GET');

    for (const contact of Array.from(resp.data)) {
      try {
        await bq_main_activities_per_contact(contact.contactId, 1, 'batch');
      } catch (error) {
        console.error(error);
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

async function bq_main_newsletters_update(page) {
  const admin = Tools.getFBAdminInstance();
  const db = admin.firestore();
  const databaseName = getDatabaseName();
  const getResponseHeaders = getGetResponseHeaders();
  const getResponseUrl = getGetResponseUrl();

  try {
    const tableName = 'newsletters';
    const perPage = 100;
    page = page ? Number(page) : 0;
    const offset = page * perPage;
    const PATH = `\`${databaseName}.${datasetId}.${tableName}\``;

    const QUERY_SELECT = `SELECT * FROM ${PATH} ORDER BY _createdOn ASC LIMIT ${perPage} OFFSET ${offset}`;
    const [responseQuery] = await bigqueryClient.query(QUERY_SELECT);

    const CURRENT_PAGE = page;
    const DOC = `${pagination_path}/newsletters_update`;
    let pageDoc = `${DOC}/pagination/${CURRENT_PAGE}`;

    for (let data of responseQuery) {
      try {
        let url = `${getResponseUrl}/newsletters/${data.newsletterId}/statistics`;
        const resp = await Tools.sendRequest(url, getResponseHeaders, 'GET');
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

        await bigqueryClient.query(QUERY_UPDATE);
      } catch (e) {
        console.error(`Error updating newsletter ${data.newsletterId}:`, e);
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

module.exports = {
  bq_onRequest_contacts,
  bq_onRequest_campaigns,
  bq_onRequest_newsletters,
  bq_onRequest_newsletters_update,
  bq_onRequest_activities,
  bq_onRequest_createTable,
  bq_onRequest_getResponseWebhook,
  bq_onCreate_pagination,
  bq_onRun_newsletters,
  bq_onRun_newsletters_update,
  bq_onRun_campaigns,
  bq_onRun_contacts
};
