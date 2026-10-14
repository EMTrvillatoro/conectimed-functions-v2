const functions = require('firebase-functions');
const runtimeOpts = {
  timeoutSeconds: 540,
  memory: '8GB'
};
const Tools = require('./Tools');
const search = require('./search');
const update = require('./update');
const postsFire = require('./firebase/posts');
const getMyContacts = require('./members/contacts');
const getMyFilters = require('./members/filters');
const createusers = require('./members/createusers');
const deleteusers = require('./members/deleteusers');
const existInFireAuth = require('./members/existInFireAuth');
const lastForoPosts = require('./members/lastForoPosts');
const zoom = require('./zoom/zoom');
const landing = require('./conectimed_landing/landing');
const html = require('./pdf/html');
const pdf = require('./pdf/pdf');
/*TRIGGERS*/
const onDoctorWrite = require('./triggers/doctors');
const onGroupsCreate = require('./triggers/groups');
const onUsersWriteHandler = require('./triggers/users');
const onQueuesOfRepresentativesCreateHandler = require('./triggers/plans');
const onBanners = require('./triggers/banners');
const onAdvertising = require('./triggers/advertising');
/* CALLABLES */
const isFullMigratedWP = require('./users/isFullMigratedWP');
const changePasswordWPFB = require('./users/changePasswordWPFB');
const generateTokenWP = require('./utils/generateTokenWP');
const generateTokenZoom = require('./utils/generateTokenZoom');
const updateSearch = require('./users/updateSearch');
const userAccount = require('./users/get-user-account');
const userMetaData = require('./users/userMetaData');
const posts = require('./posts/posts');
const categories = require('./categories/categories');
const categories_video = require('./categories_video/categories_video');
const specialties = require('./specialties/specialties');
const tags = require('./tags/tags');
const banners = require('./banners/banners');
const foro = require('./foro/foro');
const products = require('./products/products');
// payment
const listCards = require('./payments/listCards');
const payments = require('./payments/payments');
const setPoints = require('./payments/setPoints');
const onCreateCertificatesBatch = require('./certificados-batch/read-file');
const sectionsCertificados = require('./certificados-batch/sections');
const certificadosBatch = require('./certificados-batch/certificados-batch');

const bigquery = require('./BigQuery/queries');

// USERS

const usersOnChange = require('./BigQuery/users');

// Messaging
const pushNotifications = require('./cloud-messaging/push-notifications');
const pushNotificationsV2 = require('./cloud-messaging/push-notifications-v2');


exports.lastForoPosts = functions.https.onRequest((request, response) => {
  lastForoPosts.handler(request, response);
});

exports.certificadosBatch = functions.https.onRequest((request, response) => {
  certificadosBatch.handler(request, response);
});

exports.search = functions.https.onRequest((request, response) => {
  search.handler(request, response);
});

exports.update = functions.https.onRequest((request, response) => {
  update.handler(request, response);
});
/**
 * my contacts
 */

exports.contacts = functions.https.onRequest((request, response) => {
  getMyContacts.handler(request, response);
});

exports.filters = functions.https.onRequest((request, response) => {
  getMyFilters.handler(request, response);
});

// create user auth

exports.createUsers = functions.https.onRequest((request, response) => {
  createusers.handler(request, response);
});

// delete user auth

exports.deleteUsers = functions.https.onRequest((request, response) => {
  deleteusers.handler(request, response);
});

// exist user auth

exports.existInFireAuth = functions.https.onRequest((request, response) => {
  existInFireAuth.handler(request, response);
});

exports.getSpecialties = functions.https.onRequest((request, response) => {
  userMetaData.handlerSpecialties(request, response);
});

exports.getSpecialty = functions.https.onRequest((request, response) => {
  userMetaData.handlerSpecialty(request, response);
});

/* CALLABLES */

exports.isFullMigratedWP = functions.https.onCall((data, context) => {
  return isFullMigratedWP.handler(data, context);
});

exports.changePasswordWPFB = functions.https.onCall((data, context) => {
  return changePasswordWPFB.handler(data, context);
});

exports.listCards = functions.https.onCall((data, context) => {
  return listCards.handler(data, context);
});

exports.payments = functions.runWith({ timeoutSeconds: 540 }).https.onCall((data, context) => {
  return payments.handler(data, context);
});

exports.setPoints = functions.https.onCall((data, context) => {
  return setPoints.handler(data, context);
});

exports.generateTokenWP = functions.https.onCall((data, context) => {
  return generateTokenWP.handler(data, context);
});

exports.generateTokenZoom = functions.https.onCall((data, context) => {
  return generateTokenZoom.handler(data, context);
});

exports.subscribeToTopic = functions.https.onCall(async (data, context) => {
  const admin = Tools.getFBAdminInstance();
  await admin.messaging().subscribeToTopic(data.token, data.topic);
  return 'Subscribed to ' + data.topic;
});

exports.unsubscribeFromTopic = functions.https.onCall(async (data, context) => {
  const admin = Tools.getFBAdminInstance();
  await admin.messaging().unsubscribeFromTopic(data.token, data.topic);
  return 'Unsubscribed from ' + data.topic;
});

exports.getToken = functions.https.onCall((data, context) => {
  return Tools.getAccessToken();
});

exports.checkRepresentantive = functions.https.onCall((data, context) => {
  return onQueuesOfRepresentativesCreateHandler.handlerCallable(data, context);
});

exports.getAuthUser = functions.https.onCall((data, context) => {
  return userAccount.getUserHandlerCallable(data, context);
});

exports.getAuthUserByEmail = functions.https.onCall((data, context) => {
  return userAccount.getUserByEmailHandlerCallable(data, context);
});

exports.deleteAuthUser = functions.https.onCall((data, context) => {
  return userAccount.deleteUserHandlerCallable(data, context);
});

exports.updateAuthUser = functions.https.onCall((data, context) => {
  return userAccount.updateUserHandlerCallable(data, context);
});

exports.resetPasswordAuthUser = functions.https.onCall((data, context) => {
  return userAccount.generatePasswordResetLinkHandlerCallable(data, context);
});

exports.emailVerificationAuthUser = functions.https.onCall((data, context) => {
  return userAccount.generateEmailVerificationLinkHandlerCallable(data, context);
});

exports.getAllUsersAuthUser = functions.runWith(runtimeOpts).https.onRequest((request, response) => {
  return userAccount.getAllUsersHandlerCallable(request, response);
});

exports.changePassword = functions.https.onRequest((request, response) => {
  return userAccount.changePasswordHandlerRequest(request, response);
});

exports.checkCode = functions.https.onRequest((request, response) => {
  return userAccount.checkCodeHandlerRequest(request, response);
});

exports.onAddCreate = functions.firestore.document('advertising/{id}').onCreate(async (change, context) => {
  onAdvertising.handler(change, context);
});

exports.onCreateCertificatesBatch = functions.firestore
  .document('certificates-batch/{id}')
  .onCreate(async (change, context) => {
    return await onCreateCertificatesBatch.handler(change, context);
  });
///////////////

exports.onUpdateCertificatesBatchItem = functions.firestore
  .document('certificates-batch/{id_batch}/sections/{id}')
  .onUpdate(async (change, context) => {
    return await sectionsCertificados.handler(change, context);
  });

exports.onDoctorWrite = functions.firestore.document('medico-meta/{medicoId}').onWrite((change, context) => {
  onDoctorWrite.handler(change, context);
});

exports.onGroupsCreate = functions.firestore.document('broadcast-list/{uid}').onCreate(onGroupsCreate.onCreate);

// Users create, delete and update

exports.onUsersCreate = functions.firestore.document('users/{userId}').onCreate((change, context) => {
  onUsersWriteHandler.createUserHandler(change, context);
});

exports.onUsersUpdate = functions.firestore.document('users/{userId}').onUpdate((change, context) => {
  onUsersWriteHandler.updateUserHandler(change, context);
});

exports.onUsersDelete = functions.firestore.document('users/{userId}').onDelete((change, context) => {
  onUsersWriteHandler.deleteUserHandler(change, context);
});

// Contacts create, delete and update
// ********************************* Borrado *********************************

exports.onClickBannerCreate = functions.firestore
  .document('advertising/{advertisingId}/clicks/{dateId}/users/{userId}')
  .onCreate(async (change, context) => {
    onBanners.handlerCreate(change, context);
  });

exports.onClickBannerDelete = functions.firestore
  .document('advertising/{advertisingId}/clicks/{dateId}/users/{userId}')
  .onDelete(async (change, context) => {
    onBanners.handlerDelete(change, context);
  });
/* UPDATE*/

exports.updateProductsSearch = functions.runWith(runtimeOpts).https.onCall((data, context) => {
  return products.handlerCallable(data, context);
});

exports.updateSeachUserObject = functions.runWith(runtimeOpts).https.onCall((data, context) => {
  return updateSearch.handlerCallable(data, context);
});

exports.getSearchArray = functions.runWith(runtimeOpts).https.onRequest((request, response) => {
  updateSearch.handlerRequest(request, response);
});

exports.updatePostsSearch = functions.runWith(runtimeOpts).https.onCall((data, context) => {
  return posts.handlerCallable(data, context);
});

exports.onUsersTasks = functions
  .runWith(runtimeOpts)
  .firestore.document('users-tasks/{id}')
  .onUpdate(updateSearch.handlerOnUpdate);

exports.onPostsTasks = functions
  .runWith(runtimeOpts)
  .firestore.document('posts-tasks/{id}')
  .onUpdate(posts.handlerOnUpdate);

exports.onProductsTasks = functions
  .runWith(runtimeOpts)
  .firestore.document('products-tasks/{id}')
  .onUpdate(products.handlerOnUpdate);

exports.onWriteCategories = functions
  .runWith(runtimeOpts)
  .firestore.document('categories/{id}')
  .onWrite(categories.handlerOnWrite);

exports.onWriteCategoriesVideos = functions
  .runWith(runtimeOpts)
  .firestore.document('categories_video/{id}')
  .onWrite(categories_video.handlerOnWrite);

exports.onWriteSpecialties = functions
  .runWith(runtimeOpts)
  .firestore.document('specialties/{id}')
  .onWrite(specialties.handlerOnWrite);

exports.onWriteTags = functions
  .runWith(runtimeOpts)
  .firestore.document('tags/{id}')
  .onWrite(tags.handlerOnWrite);

exports.onWriteBanners = functions
  .runWith(runtimeOpts)
  .firestore.document('banners/{id}')
  .onWrite(banners.handlerOnWrite);

exports.onWriteForo = functions
  .runWith(runtimeOpts)
  .firestore.document('foro/{id}')
  .onWrite(foro.handlerOnWrite);

exports.onWriteProducts = functions
  .runWith(runtimeOpts)
  .firestore.document('products/{id}')
  .onWrite(products.handlerOnWrite);
/* UPDATE*/
//Planes

exports.tokens = functions.https.onRequest((request, response) => {
  return Tools.getAccessToken().then(accessToken => {
    console.log(accessToken.token);
    return response.status(200).send({ success: true, message: accessToken.token });
  });
});

exports.getFbToken = functions.https.onRequest((request, response) => {
  return userAccount.generateTokenHandlerRequest(request, response);
});

exports.zoomSignature = functions.https.onRequest((request, response) => {
  zoom.getSignature(request, response);
});

exports.zoomGetMeetingInfo = functions.https.onRequest((request, response) => {
  zoom.getMeetingInfo(request, response);
});

exports.clickMeetingV2 = functions.https.onRequest((request, response) => {
  clickMeetingV2.handlerApi(request, response);
});

exports.clickMeetingToBQ = functions.https.onRequest((request, response) => {
  clickMeetingV2.handlerBQ(request, response);
});

exports.generateHtmlCertificate = functions.runWith(runtimeOpts).https.onRequest(async (request, response) => {
  html.handler(request, response);
});

exports.generatePDF = functions.runWith(runtimeOpts).https.onRequest(async (request, response) => {
  pdf.handler(request, response);
});

exports.fetchFile = functions.https.onRequest(async (request, response) => {
  clickMeetingV2.requestFile(request, response);
});

// *********************** GET RESPONSE FUNCTIONS ***********************

exports.bq_onCreate_pagination = functions
  .runWith(runtimeOpts)
  .firestore.document('bq_pagination/{table}/pagination/{page}')
  .onCreate(async (change, context) => {
    switch (context.params.table) {
      case 'contacts':
        console.log('********* bq_onCreate_pagination: contacts *********');
        await bigquery.bq_onCreate_pagination_contacts(change, context);
        break;
      case 'campaigns':
        console.log('********* bq_onCreate_pagination: campaigns *********');
        await bigquery.bq_onCreate_pagination_campaigns(change, context);
        break;
      case 'newsletters':
        console.log('********* bq_onCreate_pagination: newsletters *********');
        await bigquery.bq_onCreate_pagination_newsletters(change, context);
        break;
      case 'newsletters_update':
        console.log('********* bq_onCreate_pagination: newsletters update *********');
        await bigquery.bq_onCreate_pagination_newsletters_update(change, context);
        break;
      case 'activities':
        console.log('********* bq_onCreate_pagination: activities *********');
        await bigquery.bq_onCreate_pagination_activities(change, context);
        break;
    }
    return true;
  });

// Campaigns “At 00:00.”

exports.bq_onRun_campaigns = functions
  .runWith(runtimeOpts)
  .pubsub.schedule('00 00 * * 1')
  .onRun(async context => {
    bigquery.bq_onRun_campaigns();
    return;
  });

// Newsletters “At 00:03.”

exports.bq_onRun_newsletters = functions
  .runWith(runtimeOpts)
  .pubsub.schedule('03 00 * * *')
  .onRun(async context => {
    bigquery.bq_onRun_newsletters();
    return;
  });

// Contacts “At 00:10.”

exports.bq_onRun_contacts = functions
  .runWith(runtimeOpts)
  .pubsub.schedule('00 16 * * 1')
  .onRun(async context => {
    bigquery.bq_onRun_contacts();
    return;
  });

// Newsletters update “At 01:30.”

exports.bq_onRun_newsletters_update = functions
  .runWith(runtimeOpts)
  .pubsub.schedule('30 01 * * *')
  .onRun(async context => {
    bigquery.bq_onRun_newsletters_update();
    return;
  });

// Create Table

exports.bq_onRequest_createTable = functions.runWith(runtimeOpts).https.onRequest((request, response) => {
  bigquery.bq_onRequest_createTable(request, response);
});

// Newsletters

exports.bq_onRequest_newsletters = functions.runWith(runtimeOpts).https.onRequest((request, response) => {
  bigquery.bq_onRequest_newsletters(request, response);
});

// Newsletters update

exports.bq_onRequest_newsletters_update = functions.runWith(runtimeOpts).https.onRequest((request, response) => {
  bigquery.bq_onRequest_newsletters_update(request, response);
});

// Campaigns

exports.bq_onRequest_campaigns = functions.runWith(runtimeOpts).https.onRequest((request, response) => {
  bigquery.bq_onRequest_campaigns(request, response);
});

// Contacts

exports.bq_onRequest_contacts = functions.runWith(runtimeOpts).https.onRequest((request, response) => {
  bigquery.bq_onRequest_contacts(request, response);
});

// Activities

exports.bq_onRequest_activities = functions.runWith(runtimeOpts).https.onRequest((request, response) => {
  bigquery.bq_onRequest_activities(request, response);
});

// WebHook

exports.bq_onRequest_getResponseWebhook = functions.runWith(runtimeOpts).https.onRequest((request, response) => {
  bigquery.bq_onRequest_getResponseWebhook(request, response);
});

// ********************************* Schedule firestore posts by publication date *********************************

// Posts activate “At every 10th minute.”

exports.fire_onRun_scheduled_posts = functions
  .runWith(runtimeOpts)
  .pubsub.schedule('*/10 * * * *')
  .onRun(async context => {
    postsFire.onRun_scheduled_posts();
    return;
  });

exports.fire_onRequest_scheduled_posts = functions.runWith(runtimeOpts).https.onRequest((request, response) => {
  postsFire.request_scheduled_posts(request, response);
});

// ********************************* DELETE firestore posts(courses-and-congresses) by publication date *********************************

// Posts activate “At 01:30.”

exports.fire_onRun_delete_curses_and_congresses = functions
  .runWith(runtimeOpts)
  .pubsub.schedule('00 00 * * *')
  .onRun(async context => {
    postsFire.onRun_delete_curses_and_congresses();
    return;
  });

exports.aUserUpdate = functions.firestore.document('users/{userId}').onUpdate(async (change, context) => {
  return await usersOnChange.updateUserHandler(change, context);
});

exports.aUserDelete = functions.firestore.document('users/{userId}').onDelete(async (change, context) => {
  return await usersOnChange.deleteUserHandler(change, context);
});

//

exports.admin_messaging = functions.runWith(runtimeOpts).https.onRequest((request, response) => {
  return pushNotifications.admin_messaging_onRequest(request, response);
});

exports.admin_messaging_movil = functions.runWith(runtimeOpts).https.onRequest((request, response) => {
  return pushNotifications.admin_messaging_movil_onRequest(request, response);
});

exports.admin_messaging_paginate = functions.firestore
  .document('notifications-batch/{id_batch}/pages/{page}')
  .onUpdate(async (change, context) => {
    return await pushNotifications.admin_messaging_onUpdate(change, context);
  });

exports.uploadFilesToFstorage = functions.runWith(runtimeOpts).https.onRequest(async (request, response) => {
  response.header('Content-Type', 'application/json');
  response.header('Access-Control-Allow-Origin', '*');
  response.header('Access-Control-Allow-Headers', 'Content-Type');
  const admin = Tools.getFBAdminInstance();
  const db = admin.firestore();
  const fStorage = admin.storage();
  const bucket = fStorage.bucket();
  const limit = 100;
  if (request.method === 'OPTIONS') {
    return response.status(204).send('');
  }

  if (request && request.method === 'GET') {
    let dBresp;
    if (request && request.query && request.query.startAfter) {
      const doc = await db
        .collection('posts')
        .doc(request.query.startAfter)
        .get();

      dBresp = await db
        .collection('posts')
        .orderBy('date', 'asc')
        .startAfter(doc)
        .limit(limit)
        .get();

    } else {
      dBresp = await db
        .collection('posts')
        .orderBy('date', 'asc')
        .limit(limit)
        .get();
    }

    let respArray = [];
    let count = 1;
    for (const doc of dBresp.docs) {
      const img_url = doc.get('image');
      if (img_url && img_url !== '' && img_url !== null && img_url !== undefined) {
        if (String(img_url).includes('https://panel.conectimed.com') || String(img_url).includes('https://panel.conectimed.site')) {
          const ref = doc.ref;
          let image_path = String(img_url).replace('https://panel.conectimed.com/', '');
          image_path = String(image_path).replace('https://panel.conectimed.site/', '');
          try {
            const clean = String(image_path).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const resp = await bucket.upload(`./${clean}`, { destination: `images/${image_path}`, resumable: true });
            await resp[0].makePublic();
            const publicUrl = resp[0].publicUrl();
            await ref.update({ 'image': publicUrl });
            respArray.push({ action: 'update', success: true, url: publicUrl, postId: doc.id, count: count });
            console.log(count + ".- " + image_path + ' | true');
          } catch (error) {
            respArray.push({ action: 'update', success: false, path: image_path, postId: doc.id, count: count });
            console.error(count + ".- " + image_path + `| ${doc.id}`, `===> Error(${image_path}) <===`);
          }
        } else {
          respArray.push({ action: 'no-action', success: true, url: img_url, postId: doc.id, count: count });
          console.log(count + ".- " + img_url + ' | false');
        }
      } else {
        respArray.push({ action: 'no-action', success: true, url: "", postId: doc.id, count: count });
        console.log(count + ".- " + ' | false');
      }
      count++;
    }
    let ret = {};
    if (!dBresp.empty) {
      // if is not empty
      const pivot = dBresp.docs[(dBresp.size - 1)].id;
      ret = { startAfter: pivot, next: `http://localhost:5000/conectimed-production/us-central1/test?startAfter=${pivot}`, response: respArray };
      await db
        .collection('posts-img-update').doc('status').set({ ...ret, index: admin.firestore.FieldValue.increment(1) }, { merge: true });
    } else {
      ret = { message: 'finished tasks' };
      console.log("*** finished tasks ***");
    }

    return response.status(200).send(ret);
  } else {
    return response.status(405).send({ code: 405, message: `${request.method} Method Not Allowed` });
  }
});

exports.sendNotification = functions.runWith(runtimeOpts).https.onRequest(async (request, response) => {
  return pushNotificationsV2.handler_onRequest(request, response);
});

exports.sendNotificationCall = functions.runWith(runtimeOpts).https.onCall(async (data, context) => {
  return pushNotificationsV2.handler_onCall(data, context);
});

exports.conectimed_landing = functions.runWith(runtimeOpts).https.onRequest(async (request, response) => {
  return landing.handler_onRequest(request, response);
});

// Validated Data

// ********************************* CREADO *********************************

exports.onUserUpdate = functions.firestore.document('users/{userId}').onUpdate(async (change, context) => {
  return await onUsersWriteHandler.onUserUpdateHandler(change, context);
});

exports.createAuthUser = functions.https.onCall((data, context) => {
  return createusers.handlerOnlyAuth(data, context);
});

exports.getAllAuthUsers = functions.runWith(runtimeOpts).https.onRequest((request, response) => {
  return createusers.handlerGetAllAuthUsers(request, response);
});

exports.fire_onRun_usersInValidation = functions
  .runWith(runtimeOpts)
  .pubsub.schedule('*/10 * * * *')
  .onRun(async context => {
    createusers.onRun_usersInValidation();
    return;
  });

