/**
 * ==============================================================================================
 * PROYECTO: conectimed-functions-v2
 * ARCHIVO: resultado.js
 * DESCRIPCIÓN: Migración y consolidación de las 92 Cloud Functions de v1 (1st Gen)
 *              a Firebase Functions 2nd Gen (v2).
 * 
 * SINTAXIS V2 UTILIZADA:
 *  - HTTP Request: onRequest(runtimeOpts, async (request, response) => ...)
 *  - Callables:    onCall(runtimeOpts, async (request) => ...)  [request.data, request.auth]
 *  - Firestore:    onDocumentCreated, onDocumentUpdated, onDocumentDeleted, onDocumentWritten
 *  - Scheduler:    onSchedule({ schedule, timeZone, memory, timeoutSeconds }, async (event) => ...)
 * ==============================================================================================
 */

const { onRequest, onCall } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const {
  onDocumentWritten,
  onDocumentCreated,
  onDocumentUpdated,
  onDocumentDeleted
} = require("firebase-functions/v2/firestore");
const path = require("path");

// Helper para resolución transparente de módulos:
// Permite que este archivo funcione tanto ubicado en la raíz como dentro de /functions
function loadModule(relPath) {
  const isInsideFunctions = __dirname.endsWith("functions");
  const candidates = [
    isInsideFunctions ? `./assets/js/${relPath}` : `./functions/assets/js/${relPath}`,
    isInsideFunctions ? `./${relPath}` : `./functions/${relPath}`,
    `../conectimed-functions_v1/functions/${relPath}`
  ];

  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch (e) {
      if (e.code !== "MODULE_NOT_FOUND") throw e;
    }
  }
  try {
    return require(path.resolve(__dirname, relPath));
  } catch (err) {
    return {};
  }
}

// ==========================================
// CONFIGURACIÓN RUNTIME OPTS (V2)
// ==========================================
const Tools = loadModule("Tools");
const runtimeOpts = (Tools && Tools.runtimeOpts) || {
  memory: "8GiB",
  cpu: "gcf_gen1",
  timeoutSeconds: 540
};

// ==========================================
// MÓDULOS Y CONTROLADORES
// ==========================================
const search = loadModule("search");
const update = loadModule("update");
const postsFire = loadModule("firebase/posts");
const getMyContacts = loadModule("members/contacts");
const getMyFilters = loadModule("members/filters");
const createusers = loadModule("members/createusers");
const deleteusers = loadModule("members/deleteusers");
const existInFireAuth = loadModule("members/existInFireAuth");
const lastForoPosts = loadModule("members/lastForoPosts");
const zoom = loadModule("zoom/zoom");
const clickMeetingV2 = loadModule("click-meeting/click-meeting");
const landing = loadModule("conectimed_landing/landing");
const html = loadModule("pdf/html");
const pdf = loadModule("pdf/pdf");

// Triggers
const onDoctorWrite = loadModule("triggers/doctors");
const onProfessionalWrite = loadModule("triggers/profesional");
const onChatsWrite = loadModule("triggers/chats");
const onGroupsCreate = loadModule("triggers/groups");
const onUsersWriteHandler = loadModule("triggers/users");
const onQueuesOfRepresentativesCreateHandler = loadModule("triggers/plans");
const onCreateChatBatch = loadModule("chat-batch/read-file");
const sections = loadModule("chat-batch/sections");
const onBanners = loadModule("triggers/banners");
const onAdvertising = loadModule("triggers/advertising");

// Callables & Users
const sendMail = loadModule("utils/sendMail");
const clickMeeting = loadModule("utils/clickMeeting");
const sendSms = loadModule("utils/sendSms");
const isFullMigratedWP = loadModule("users/isFullMigratedWP");
const changePasswordWPFB = loadModule("users/changePasswordWPFB");
const generateTokenWP = loadModule("utils/generateTokenWP");
const generateTokenZoom = loadModule("utils/generateTokenZoom");
const updateSearch = loadModule("users/updateSearch");
const userAccount = loadModule("users/get-user-account");
const userMetaData = loadModule("users/userMetaData");
const posts = loadModule("posts/posts");
const categories = loadModule("categories/categories");
const categories_video = loadModule("categories_video/categories_video");
const specialties = loadModule("specialties/specialties");
const tags = loadModule("tags/tags");
const banners = loadModule("banners/banners");
const companies = loadModule("companies/companies");
const foro = loadModule("foro/foro");
const products = loadModule("products/products");

// Pagos
const listCards = loadModule("payments/listCards");
const payments = loadModule("payments/payments");
const setPoints = loadModule("payments/setPoints");

// Certificados
const onCreateCertificatesBatch = loadModule("certificados-batch/read-file");
const sectionsCertificados = loadModule("certificados-batch/sections");
const certificadosBatch = loadModule("certificados-batch/certificados-batch");

// BigQuery
const bigquery = loadModule("BigQuery/queries");
const usersOnChange = loadModule("BigQuery/users");

// Messaging
const pushNotifications = loadModule("cloud-messaging/push-notifications");
const pushNotificationsV2 = loadModule("cloud-messaging/push-notifications-v2");

/**
 * ==============================================================================================
 * SECCIÓN 1: HTTP TRIGGERS (onRequest) - 37 FUNCIONES
 * ==============================================================================================
 */

/* DESC: ADMIN MESSAGING | TYPE: HTTP REQUEST */
exports.admin_messaging = onRequest(runtimeOpts, async (request, response) => {
  return await pushNotifications.admin_messaging_onRequest(request, response);
});

/* DESC: ADMIN MESSAGING MOVIL | TYPE: HTTP REQUEST */
exports.admin_messaging_movil = onRequest(runtimeOpts, async (request, response) => {
  return await pushNotifications.admin_messaging_movil_onRequest(request, response);
});

/* DESC: BIGQUERY ACTIVITIES ON REQUEST | TYPE: HTTP REQUEST */
exports.bq_onRequest_activities = onRequest(runtimeOpts, async (request, response) => {
  await bigquery.bq_onRequest_activities(request, response);
});

/* DESC: BIGQUERY CAMPAIGNS ON REQUEST | TYPE: HTTP REQUEST */
exports.bq_onRequest_campaigns = onRequest(runtimeOpts, async (request, response) => {
  await bigquery.bq_onRequest_campaigns(request, response);
});

/* DESC: BIGQUERY CONTACTS ON REQUEST | TYPE: HTTP REQUEST */
exports.bq_onRequest_contacts = onRequest(runtimeOpts, async (request, response) => {
  await bigquery.bq_onRequest_contacts(request, response);
});

/* DESC: BIGQUERY CREATE TABLE ON REQUEST | TYPE: HTTP REQUEST */
exports.bq_onRequest_createTable = onRequest(runtimeOpts, async (request, response) => {
  await bigquery.bq_onRequest_createTable(request, response);
});

/* DESC: BIGQUERY GET RESPONSE WEBHOOK ON REQUEST | TYPE: HTTP REQUEST */
exports.bq_onRequest_getResponseWebhook = onRequest(runtimeOpts, async (request, response) => {
  await bigquery.bq_onRequest_getResponseWebhook(request, response);
});

/* DESC: BIGQUERY NEWSLETTERS ON REQUEST | TYPE: HTTP REQUEST */
exports.bq_onRequest_newsletters = onRequest(runtimeOpts, async (request, response) => {
  await bigquery.bq_onRequest_newsletters(request, response);
});

/* DESC: BIGQUERY NEWSLETTERS UPDATE ON REQUEST | TYPE: HTTP REQUEST */
exports.bq_onRequest_newsletters_update = onRequest(runtimeOpts, async (request, response) => {
  await bigquery.bq_onRequest_newsletters_update(request, response);
});

/* DESC: CERTIFICADOS BATCH ON REQUEST | TYPE: HTTP REQUEST */
exports.certificadosBatch = onRequest(runtimeOpts, async (request, response) => {
  await (certificadosBatch.handler || certificadosBatch)(request, response);
});

/* DESC: CHANGE PASSWORD | TYPE: HTTP REQUEST */
exports.changePassword = onRequest(runtimeOpts, async (request, response) => {
  return await userAccount.changePasswordHandlerRequest(request, response);
});

/* DESC: CHECK CODE | TYPE: HTTP REQUEST */
exports.checkCode = onRequest(runtimeOpts, async (request, response) => {
  return await userAccount.checkCodeHandlerRequest(request, response);
});

/* DESC: CLICK MEETING TO BIGQUERY | TYPE: HTTP REQUEST */
exports.clickMeetingToBQ = onRequest(runtimeOpts, async (request, response) => {
  await clickMeetingV2.handlerBQ(request, response);
});

/* DESC: CLICK MEETING V2 API | TYPE: HTTP REQUEST */
exports.clickMeetingV2 = onRequest(runtimeOpts, async (request, response) => {
  await clickMeetingV2.handlerApi(request, response);
});

/* DESC: CONECTIMED LANDING | TYPE: HTTP REQUEST */
exports.conectimed_landing = onRequest(runtimeOpts, async (request, response) => {
  return await (landing.handler_onRequest || landing.handler)(request, response);
});

/* DESC: GET CONTACTS | TYPE: HTTP REQUEST */
exports.contacts = onRequest(runtimeOpts, async (request, response) => {
  await (getMyContacts.handler || getMyContacts)(request, response);
});

/* DESC: CREATE USERS IN AUTH AND FIRESTORE | TYPE: HTTP REQUEST */
exports.createUsers = onRequest(runtimeOpts, async (request, response) => {
  await (createusers.handler || createusers)(request, response);
});

/* DESC: DELETE USERS | TYPE: HTTP REQUEST */
exports.deleteUsers = onRequest(runtimeOpts, async (request, response) => {
  await (deleteusers.handler || deleteusers)(request, response);
});

/* DESC: EXIST IN FIRE AUTH | TYPE: HTTP REQUEST */
exports.existInFireAuth = onRequest(runtimeOpts, async (request, response) => {
  await (existInFireAuth.handler || existInFireAuth)(request, response);
});

/* DESC: FETCH FILE CLICK MEETING | TYPE: HTTP REQUEST */
exports.fetchFile = onRequest(runtimeOpts, async (request, response) => {
  await clickMeetingV2.requestFile(request, response);
});

/* DESC: GET FILTERS | TYPE: HTTP REQUEST */
exports.filters = onRequest(runtimeOpts, async (request, response) => {
  await (getMyFilters.handler || getMyFilters)(request, response);
});

/* DESC: SCHEDULED POSTS ON REQUEST | TYPE: HTTP REQUEST */
exports.fire_onRequest_scheduled_posts = onRequest(runtimeOpts, async (request, response) => {
  await postsFire.request_scheduled_posts(request, response);
});

/* DESC: GENERATE HTML CERTIFICATE | TYPE: HTTP REQUEST */
exports.generateHtmlCertificate = onRequest(runtimeOpts, async (request, response) => {
  await (html.handler || html.generateHtmlCertificateHandler || html)(request, response);
});

/* DESC: GENERATE PDF FILE | TYPE: HTTP REQUEST */
exports.generatePDF = onRequest(runtimeOpts, async (request, response) => {
  await (pdf.handler || pdf.generatePDFHandler || pdf)(request, response);
});

/* DESC: GET ALL AUTH USERS | TYPE: HTTP REQUEST */
exports.getAllAuthUsers = onRequest(runtimeOpts, async (request, response) => {
  return await (createusers.handlerGetAllAuthUsers || createusers.getAllAuthUsersHandler)(request, response);
});

/* DESC: GET FB CUSTOM TOKEN | TYPE: HTTP REQUEST */
exports.getFbToken = onRequest(runtimeOpts, async (request, response) => {
  return await userAccount.generateTokenHandlerRequest(request, response);
});

/* DESC: GET SEARCH ARRAY | TYPE: HTTP REQUEST */
exports.getSearchArray = onRequest(runtimeOpts, async (request, response) => {
  await updateSearch.handlerRequest(request, response);
});

/* DESC: GET ALL SPECIALTIES | TYPE: HTTP REQUEST */
exports.getSpecialties = onRequest(runtimeOpts, async (request, response) => {
  if (userMetaData && userMetaData.handlerSpecialties) {
    return await userMetaData.handlerSpecialties(request, response);
  }
  if (specialties && specialties.getSpecialties) {
    return await specialties.getSpecialties(request, response);
  }
  return await specialties(request, response);
});

/* DESC: GET SPECIALTY BY ID | TYPE: HTTP REQUEST */
exports.getSpecialty = onRequest(runtimeOpts, async (request, response) => {
  if (userMetaData && userMetaData.handlerSpecialty) {
    return await userMetaData.handlerSpecialty(request, response);
  }
  if (specialties && specialties.getSpecialty) {
    return await specialties.getSpecialty(request, response);
  }
  return await specialties(request, response);
});

/* DESC: GET LAST FORO POSTS | TYPE: HTTP REQUEST */
exports.lastForoPosts = onRequest(runtimeOpts, async (request, response) => {
  await (lastForoPosts.handler || lastForoPosts)(request, response);
});

/* DESC: SEARCH | TYPE: HTTP REQUEST */
exports.search = onRequest(runtimeOpts, async (request, response) => {
  await (search.handler || search)(request, response);
});

/* DESC: SEND NOTIFICATION | TYPE: HTTP REQUEST */
exports.sendNotification = onRequest(runtimeOpts, async (request, response) => {
  return await pushNotificationsV2.handler_onRequest(request, response);
});

/* DESC: GET TOKENS ACCESS TOKEN | TYPE: HTTP REQUEST */
exports.tokens = onRequest(runtimeOpts, async (request, response) => {
  try {
    const accessToken = await Tools.getAccessToken();
    console.log(accessToken.token);
    return response.status(200).send({ success: true, message: accessToken.token });
  } catch (error) {
    return response.status(500).send(error);
  }
});

/* DESC: UPDATE | TYPE: HTTP REQUEST */
exports.update = onRequest(runtimeOpts, async (request, response) => {
  await (update.handler || update)(request, response);
});

/* DESC: UPLOAD FILES TO FIREBASE STORAGE | TYPE: HTTP REQUEST */
exports.uploadFilesToFstorage = onRequest(runtimeOpts, async (request, response) => {
  response.set("Content-Type", "application/json");
  response.set("Access-Control-Allow-Origin", "*");
  response.set("Access-Control-Allow-Headers", "Content-Type");
  const admin = Tools.getFBAdminInstance();
  const db = admin.firestore();
  const fStorage = admin.storage();
  const bucket = fStorage.bucket();
  const limit = 100;

  if (request.method === "OPTIONS") {
    return response.status(204).send("");
  }

  if (request && request.method === "GET") {
    let dBresp;
    if (request && request.query && request.query.startAfter) {
      const doc = await db
        .collection("posts")
        .doc(request.query.startAfter)
        .get();

      dBresp = await db
        .collection("posts")
        .orderBy("date", "asc")
        .startAfter(doc)
        .limit(limit)
        .get();
    } else {
      dBresp = await db
        .collection("posts")
        .orderBy("date", "asc")
        .limit(limit)
        .get();
    }

    let respArray = [];
    let count = 1;
    for (const doc of dBresp.docs) {
      const img_url = doc.get("image");
      if (img_url && img_url !== "" && img_url !== null && img_url !== undefined) {
        if (
          String(img_url).includes("https://panel.conectimed.com") ||
          String(img_url).includes("https://panel.conectimed.site")
        ) {
          const ref = doc.ref;
          let image_path = String(img_url).replace("https://panel.conectimed.com/", "");
          image_path = String(image_path).replace("https://panel.conectimed.site/", "");
          try {
            const clean = String(image_path).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const resp = await bucket.upload(`./${clean}`, { destination: `images/${image_path}`, resumable: true });
            await resp[0].makePublic();
            const publicUrl = resp[0].publicUrl();
            await ref.update({ image: publicUrl });
            respArray.push({ action: "update", success: true, url: publicUrl, postId: doc.id, count: count });
            console.log(count + ".- " + image_path + " | true");
          } catch (error) {
            respArray.push({ action: "update", success: false, path: image_path, postId: doc.id, count: count });
            console.error(count + ".- " + image_path + `| ${doc.id}`, `===> Error(${image_path}) <===`);
          }
        } else {
          respArray.push({ action: "no-action", success: true, url: img_url, postId: doc.id, count: count });
          console.log(count + ".- " + img_url + " | false");
        }
      } else {
        respArray.push({ action: "no-action", success: true, url: "", postId: doc.id, count: count });
        console.log(count + ".- " + " | false");
      }
      count++;
    }

    let ret = {};
    if (!dBresp.empty) {
      const pivot = dBresp.docs[dBresp.size - 1].id;
      ret = {
        startAfter: pivot,
        next: `http://localhost:5000/conectimed-production/us-central1/test?startAfter=${pivot}`,
        response: respArray
      };
      await db
        .collection("posts-img-update")
        .doc("status")
        .set({ ...ret, index: admin.firestore.FieldValue.increment(1) }, { merge: true });
    } else {
      ret = { message: "finished tasks" };
      console.log("*** finished tasks ***");
    }

    return response.status(200).send(ret);
  } else {
    return response.status(405).send({ code: 405, message: `${request.method} Method Not Allowed` });
  }
});

/* DESC: ZOOM GET MEETING INFO | TYPE: HTTP REQUEST */
exports.zoomGetMeetingInfo = onRequest(runtimeOpts, async (request, response) => {
  await zoom.getMeetingInfo(request, response);
});

/* DESC: ZOOM SIGNATURE | TYPE: HTTP REQUEST */
exports.zoomSignature = onRequest(runtimeOpts, async (request, response) => {
  await zoom.getSignature(request, response);
});


/**
 * ==============================================================================================
 * SECCIÓN 2: CALLABLE FUNCTIONS (onCall) - 23 FUNCIONES
 * ==============================================================================================
 */

/* DESC: CHANGE PASSWORD WP FB | TYPE: CALLABLE */
exports.changePasswordWPFB = onCall(runtimeOpts, async (request) => {
  return await changePasswordWPFB.handler(request.data, request);
});

/* DESC: CHECK REPRESENTATIVE | TYPE: CALLABLE */
exports.checkRepresentantive = onCall(runtimeOpts, async (request) => {
  return await onQueuesOfRepresentativesCreateHandler.handlerCallable(request.data, request);
});

/* DESC: CREATE AUTH USER (ONLY AUTH) | TYPE: CALLABLE */
exports.createAuthUser = onCall(runtimeOpts, async (request) => {
  return await createusers.handlerOnlyAuth(request.data, request);
});

/* DESC: DELETE AUTH USER | TYPE: CALLABLE */
exports.deleteAuthUser = onCall(runtimeOpts, async (request) => {
  return await userAccount.deleteUserHandlerCallable(request.data, request);
});

/* DESC: EMAIL VERIFICATION AUTH USER | TYPE: CALLABLE */
exports.emailVerificationAuthUser = onCall(runtimeOpts, async (request) => {
  return await userAccount.generateEmailVerificationLinkHandlerCallable(request.data, request);
});

/* DESC: GENERATE TOKEN WP | TYPE: CALLABLE */
exports.generateTokenWP = onCall(runtimeOpts, async (request) => {
  return await generateTokenWP.handler(request.data, request);
});

/* DESC: GENERATE TOKEN ZOOM | TYPE: CALLABLE */
exports.generateTokenZoom = onCall(runtimeOpts, async (request) => {
  return await generateTokenZoom.handler(request.data, request);
});

/* DESC: GET ALL USERS AUTH USER | TYPE: CALLABLE */
exports.getAllUsersAuthUser = onCall(runtimeOpts, async (request) => {
  return await userAccount.getAllUsersHandlerCallable(request.data, request);
});

/* DESC: GET AUTH USER | TYPE: CALLABLE */
exports.getAuthUser = onCall(runtimeOpts, async (request) => {
  return await userAccount.getUserHandlerCallable(request.data, request);
});

/* DESC: GET AUTH USER BY EMAIL | TYPE: CALLABLE */
exports.getAuthUserByEmail = onCall(runtimeOpts, async (request) => {
  return await userAccount.getUserByEmailHandlerCallable(request.data, request);
});

/* DESC: GET ACCESS TOKEN CALLABLE | TYPE: CALLABLE */
exports.getToken = onCall(runtimeOpts, async (request) => {
  return await Tools.getAccessToken();
});

/* DESC: IS FULL MIGRATED WP | TYPE: CALLABLE */
exports.isFullMigratedWP = onCall(runtimeOpts, async (request) => {
  return await isFullMigratedWP.handler(request.data, request);
});

/* DESC: LIST CARDS | TYPE: CALLABLE */
exports.listCards = onCall(runtimeOpts, async (request) => {
  return await listCards.handler(request.data, request);
});

/* DESC: PAYMENTS | TYPE: CALLABLE */
exports.payments = onCall({ timeoutSeconds: 540, memory: "1GiB" }, async (request) => {
  return await payments.handler(request.data, request);
});

/* DESC: RESET PASSWORD AUTH USER | TYPE: CALLABLE */
exports.resetPasswordAuthUser = onCall(runtimeOpts, async (request) => {
  return await userAccount.generatePasswordResetLinkHandlerCallable(request.data, request);
});

/* DESC: SEND NOTIFICATION CALLABLE | TYPE: CALLABLE */
exports.sendNotificationCall = onCall(runtimeOpts, async (request) => {
  return await pushNotificationsV2.handler_onCall(request.data, request);
});

/* DESC: SET POINTS | TYPE: CALLABLE */
exports.setPoints = onCall(runtimeOpts, async (request) => {
  return await setPoints.handler(request.data, request);
});

/* DESC: SUBSCRIBE TO TOPIC | TYPE: CALLABLE */
exports.subscribeToTopic = onCall(runtimeOpts, async (request) => {
  const data = request.data || {};
  const admin = Tools.getFBAdminInstance();
  await admin.messaging().subscribeToTopic(data.token, data.topic);
  return "Subscribed to " + data.topic;
});

/* DESC: UNSUBSCRIBE FROM TOPIC | TYPE: CALLABLE */
exports.unsubscribeFromTopic = onCall(runtimeOpts, async (request) => {
  const data = request.data || {};
  const admin = Tools.getFBAdminInstance();
  await admin.messaging().unsubscribeFromTopic(data.token, data.topic);
  return "Unsubscribed from " + data.topic;
});

/* DESC: UPDATE AUTH USER | TYPE: CALLABLE */
exports.updateAuthUser = onCall(runtimeOpts, async (request) => {
  return await userAccount.updateUserHandlerCallable(request.data, request);
});

/* DESC: UPDATE POSTS SEARCH | TYPE: CALLABLE */
exports.updatePostsSearch = onCall(runtimeOpts, async (request) => {
  return await posts.handlerCallable(request.data, request);
});

/* DESC: UPDATE PRODUCTS SEARCH | TYPE: CALLABLE */
exports.updateProductsSearch = onCall(runtimeOpts, async (request) => {
  return await products.handlerCallable(request.data, request);
});

/* DESC: UPDATE SEARCH USER OBJECT | TYPE: CALLABLE */
exports.updateSeachUserObject = onCall(runtimeOpts, async (request) => {
  return await updateSearch.handlerCallable(request.data, request);
});


/**
 * ==============================================================================================
 * SECCIÓN 3: FIRESTORE EVENT TRIGGERS - 25 FUNCIONES
 * ==============================================================================================
 */

/* DESC: USERS COLLECTION ON DELETE (BIGQUERY SYNC) | TYPE: ON DOCUMENT DELETED */
exports.aUserDelete = onDocumentDeleted({
  ...runtimeOpts,
  document: "users/{userId}"
}, async (event) => {
  return await usersOnChange.deleteUserHandler(event.data, { params: event.params, ...event });
});

/* DESC: USERS COLLECTION ON UPDATE (BIGQUERY SYNC) | TYPE: ON DOCUMENT UPDATED */
exports.aUserUpdate = onDocumentUpdated({
  ...runtimeOpts,
  document: "users/{userId}"
}, async (event) => {
  return await usersOnChange.updateUserHandler(event.data, { params: event.params, ...event });
});

/* DESC: NOTIFICATIONS BATCH ON UPDATE | TYPE: ON DOCUMENT UPDATED */
exports.admin_messaging_paginate = onDocumentUpdated({
  ...runtimeOpts,
  document: "notifications-batch/{id_batch}/pages/{page}"
}, async (event) => {
  return await pushNotifications.admin_messaging_onUpdate(event.data, { params: event.params, ...event });
});

/* DESC: BIGQUERY PAGINATION ON CREATE | TYPE: ON DOCUMENT CREATED */
exports.bq_onCreate_pagination = onDocumentCreated({
  ...runtimeOpts,
  document: "bq_pagination/{table}/pagination/{page}"
}, async (event) => {
  const context = { params: event.params, ...event };
  const change = event.data;

  switch (event.params.table) {
    case "contacts":
      console.log("********* bq_onCreate_pagination: contacts *********");
      await bigquery.bq_onCreate_pagination_contacts(change, context);
      break;
    case "campaigns":
      console.log("********* bq_onCreate_pagination: campaigns *********");
      await bigquery.bq_onCreate_pagination_campaigns(change, context);
      break;
    case "newsletters":
      console.log("********* bq_onCreate_pagination: newsletters *********");
      await bigquery.bq_onCreate_pagination_newsletters(change, context);
      break;
    case "newsletters_update":
      console.log("********* bq_onCreate_pagination: newsletters update *********");
      await bigquery.bq_onCreate_pagination_newsletters_update(change, context);
      break;
    case "activities":
      console.log("********* bq_onCreate_pagination: activities *********");
      await bigquery.bq_onCreate_pagination_activities(change, context);
      break;
  }
  return true;
});

/* DESC: ADVERTISING ON CREATE | TYPE: ON DOCUMENT CREATED */
exports.onAddCreate = onDocumentCreated({
  ...runtimeOpts,
  document: "advertising/{id}"
}, async (event) => {
  await onAdvertising.handler(event.data, { params: event.params, ...event });
});

/* DESC: ADVERTISING CLICKS ON CREATE | TYPE: ON DOCUMENT CREATED */
exports.onClickBannerCreate = onDocumentCreated({
  ...runtimeOpts,
  document: "advertising/{advertisingId}/clicks/{dateId}/users/{userId}"
}, async (event) => {
  await onBanners.handlerCreate(event.data, { params: event.params, ...event });
});

/* DESC: ADVERTISING CLICKS ON DELETE | TYPE: ON DOCUMENT DELETED */
exports.onClickBannerDelete = onDocumentDeleted({
  ...runtimeOpts,
  document: "advertising/{advertisingId}/clicks/{dateId}/users/{userId}"
}, async (event) => {
  await onBanners.handlerDelete(event.data, { params: event.params, ...event });
});

/* DESC: CERTIFICATES BATCH ON CREATE | TYPE: ON DOCUMENT CREATED */
exports.onCreateCertificatesBatch = onDocumentCreated({
  ...runtimeOpts,
  document: "certificates-batch/{id}"
}, async (event) => {
  return await onCreateCertificatesBatch.handler(event.data, { params: event.params, ...event });
});

/* DESC: MEDICO META ON WRITE | TYPE: ON WRITE */
exports.onDoctorWrite = onDocumentWritten({
  memory: "1GiB",
  timeoutSeconds: 540,
  document: "medico-meta/{medicoId}"
}, async (event) => {
  await (onDoctorWrite.handler || onDoctorWrite.onWriteDoctorsHandler || onDoctorWrite)(
    event.data,
    { params: event.params, ...event }
  );
});

/* DESC: BROADCAST LIST ON CREATE | TYPE: ON DOCUMENT CREATED */
exports.onGroupsCreate = onDocumentCreated({
  ...runtimeOpts,
  document: "broadcast-list/{uid}"
}, async (event) => {
  await onGroupsCreate.onCreate(event.data, { params: event.params, ...event });
});

/* DESC: POSTS TASKS ON UPDATE | TYPE: ON DOCUMENT UPDATED */
exports.onPostsTasks = onDocumentUpdated({
  ...runtimeOpts,
  document: "posts-tasks/{id}"
}, async (event) => {
  await posts.handlerOnUpdate(event.data, { params: event.params, ...event });
});

/* DESC: PRODUCTS TASKS ON UPDATE | TYPE: ON DOCUMENT UPDATED */
exports.onProductsTasks = onDocumentUpdated({
  ...runtimeOpts,
  document: "products-tasks/{id}"
}, async (event) => {
  await products.handlerOnUpdate(event.data, { params: event.params, ...event });
});

/* DESC: CERTIFICATES BATCH SECTIONS ON UPDATE | TYPE: ON DOCUMENT UPDATED */
exports.onUpdateCertificatesBatchItem = onDocumentUpdated({
  ...runtimeOpts,
  document: "certificates-batch/{id_batch}/sections/{id}"
}, async (event) => {
  return await sectionsCertificados.handler(event.data, { params: event.params, ...event });
});

/* DESC: USERS VALIDATED DATA ON UPDATE | TYPE: ON DOCUMENT UPDATED */
exports.onUserUpdate = onDocumentUpdated({
  ...runtimeOpts,
  document: "users/{userId}"
}, async (event) => {
  return await onUsersWriteHandler.onUserUpdateHandler(event.data, { params: event.params, ...event });
});

/* DESC: USERS ON CREATE | TYPE: ON DOCUMENT CREATED */
exports.onUsersCreate = onDocumentCreated({
  ...runtimeOpts,
  document: "users/{userId}"
}, async (event) => {
  await onUsersWriteHandler.createUserHandler(event.data, { params: event.params, ...event });
});

/* DESC: USERS ON DELETE | TYPE: ON DOCUMENT DELETED */
exports.onUsersDelete = onDocumentDeleted({
  ...runtimeOpts,
  document: "users/{userId}"
}, async (event) => {
  await onUsersWriteHandler.deleteUserHandler(event.data, { params: event.params, ...event });
});

/* DESC: USERS TASKS ON UPDATE | TYPE: ON DOCUMENT UPDATED */
exports.onUsersTasks = onDocumentUpdated({
  ...runtimeOpts,
  document: "users-tasks/{id}"
}, async (event) => {
  await updateSearch.handlerOnUpdate(event.data, { params: event.params, ...event });
});

/* DESC: USERS ON UPDATE | TYPE: ON DOCUMENT UPDATED */
exports.onUsersUpdate = onDocumentUpdated({
  ...runtimeOpts,
  document: "users/{userId}"
}, async (event) => {
  await onUsersWriteHandler.updateUserHandler(event.data, { params: event.params, ...event });
});

/* DESC: BANNERS ON WRITE | TYPE: ON WRITE */
exports.onWriteBanners = onDocumentWritten({
  ...runtimeOpts,
  document: "banners/{id}"
}, async (event) => {
  await banners.handlerOnWrite(event.data, { params: event.params, ...event });
});

/* DESC: CATEGORIES ON WRITE | TYPE: ON WRITE */
exports.onWriteCategories = onDocumentWritten({
  ...runtimeOpts,
  document: "categories/{id}"
}, async (event) => {
  await categories.handlerOnWrite(event.data, { params: event.params, ...event });
});

/* DESC: CATEGORIES VIDEOS ON WRITE | TYPE: ON WRITE */
exports.onWriteCategoriesVideos = onDocumentWritten({
  ...runtimeOpts,
  document: "categories_video/{id}"
}, async (event) => {
  await categories_video.handlerOnWrite(event.data, { params: event.params, ...event });
});

/* DESC: FORO ON WRITE | TYPE: ON WRITE */
exports.onWriteForo = onDocumentWritten({
  ...runtimeOpts,
  document: "foro/{id}"
}, async (event) => {
  await foro.handlerOnWrite(event.data, { params: event.params, ...event });
});

/* DESC: PRODUCTS ON WRITE | TYPE: ON WRITE */
exports.onWriteProducts = onDocumentWritten({
  ...runtimeOpts,
  document: "products/{id}"
}, async (event) => {
  await products.handlerOnWrite(event.data, { params: event.params, ...event });
});

/* DESC: SPECIALTIES ON WRITE | TYPE: ON WRITE */
exports.onWriteSpecialties = onDocumentWritten({
  ...runtimeOpts,
  document: "specialties/{id}"
}, async (event) => {
  await specialties.handlerOnWrite(event.data, { params: event.params, ...event });
});

/* DESC: TAGS ON WRITE | TYPE: ON WRITE */
exports.onWriteTags = onDocumentWritten({
  ...runtimeOpts,
  document: "tags/{id}"
}, async (event) => {
  await tags.handlerOnWrite(event.data, { params: event.params, ...event });
});


/**
 * ==============================================================================================
 * SECCIÓN 4: SCHEDULED FUNCTIONS (onSchedule) - 7 FUNCIONES
 * ==============================================================================================
 */

/* DESC: CAMPAIGNS SCHEDULED AT 00:00 MONDAY | TYPE: SCHEDULED */
exports.bq_onRun_campaigns = onSchedule({
  schedule: "00 00 * * 1",
  timeZone: "America/Mexico_City",
  memory: "1GiB",
  timeoutSeconds: 540
}, async (event) => {
  await bigquery.bq_onRun_campaigns();
});

/* DESC: CONTACTS SCHEDULED AT 16:00 MONDAY | TYPE: SCHEDULED */
exports.bq_onRun_contacts = onSchedule({
  schedule: "00 16 * * 1",
  timeZone: "America/Mexico_City",
  memory: "1GiB",
  timeoutSeconds: 540
}, async (event) => {
  await bigquery.bq_onRun_contacts();
});

/* DESC: NEWSLETTERS SCHEDULED AT 00:03 DAILY | TYPE: SCHEDULED */
exports.bq_onRun_newsletters = onSchedule({
  schedule: "03 00 * * *",
  timeZone: "America/Mexico_City",
  memory: "1GiB",
  timeoutSeconds: 540
}, async (event) => {
  await bigquery.bq_onRun_newsletters();
});

/* DESC: NEWSLETTERS UPDATE SCHEDULED AT 01:30 DAILY | TYPE: SCHEDULED */
exports.bq_onRun_newsletters_update = onSchedule({
  schedule: "30 01 * * *",
  timeZone: "America/Mexico_City",
  memory: "1GiB",
  timeoutSeconds: 540
}, async (event) => {
  await bigquery.bq_onRun_newsletters_update();
});

/* DESC: DELETE COURSES AND CONGRESSES BY DATE SCHEDULED AT 00:00 DAILY | TYPE: SCHEDULED */
exports.fire_onRun_delete_curses_and_congresses = onSchedule({
  schedule: "00 00 * * *",
  timeZone: "America/Mexico_City",
  memory: "1GiB",
  timeoutSeconds: 540
}, async (event) => {
  await postsFire.onRun_delete_curses_and_congresses();
});

/* DESC: SCHEDULED POSTS ACTIVATE EVERY 10TH MINUTE | TYPE: SCHEDULED */
exports.fire_onRun_scheduled_posts = onSchedule({
  schedule: "*/10 * * * *",
  timeZone: "America/Mexico_City",
  memory: "1GiB",
  timeoutSeconds: 540
}, async (event) => {
  await postsFire.onRun_scheduled_posts();
});

/* DESC: USERS IN VALIDATION SCHEDULED EVERY 10TH MINUTE | TYPE: SCHEDULED */
exports.fire_onRun_usersInValidation = onSchedule({
  schedule: "*/10 * * * *",
  timeZone: "America/Mexico_City",
  memory: "1GiB",
  timeoutSeconds: 540
}, async (event) => {
  await createusers.onRun_usersInValidation();
});
