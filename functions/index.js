const { onRequest, onCall } = require("firebase-functions/v2/https");
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onDocumentWritten, onDocumentCreated, onDocumentUpdated, onDocumentDeleted } = require("firebase-functions/v2/firestore");
// files
const { runtimeOpts, sendEmail } = require('./assets/js/Tools');
const { stripeCustomerCreateHandler, stripeCustomerDeleteHandler, stripeCustomerRetrieveHandler, stripeCustomerUpdateHandler, stripePaymentIntentHandler, stripePaymentIntentUpdateHandler } = require('./assets/js/stripe/stripe');
const { infoDBFHandler } = require('./assets/js/experimental/experimental');
const { getValidatedUsersHandler, getAllAuthUsersHandler, getAuthUsersByListHandler } = require('./assets/js/members/createusers');
const { handler } = require('./assets/js/members/lastForoPost');
const { contactsHandler } = require('./assets/js/members/contacts');
const { filtersHandler } = require('./assets/js/members/filters');
const { existInFireAuthHandler } = require('./assets/js/members/existInFireAuth');
const { createUsersHandler, createAuthUserCallable } = require('./assets/js/members/createUsersHandler');
const { deleteUsersHandler } = require('./assets/js/members/deleteUsersHandler');
const { searchHandler } = require('./assets/js/preregistro/search');
const { updateHandler: preregistroUpdateHandler } = require('./assets/js/preregistro/update');
const { isFullMigratedWPHandler } = require('./assets/js/user/isFullMigratedWP');
const { changePasswordWPFBHandler } = require('./assets/js/user/changePasswordWPFB');
const { getFbTokenHandlerRequest } = require('./assets/js/user/getFbToken');
const { generateTokenWPHandler } = require('./assets/js/utils/generateTokenWP');
const { generateTokenZoomHandler } = require('./assets/js/utils/generateTokenZoom');
const { tokensHandler } = require('./assets/js/utils/tokens');
const { listCardsHandler } = require('./assets/js/payments/listCards');
const { setPointsHandler } = require('./assets/js/payments/setPoints');
const { updateUserHandler: aUserUpdateHandler, deleteUserHandler: aUserDeleteHandler } = require('./assets/js/bigquery/users');
const { admin_messaging_onRequest, admin_messaging_movil_onRequest, admin_messaging_onUpdate } = require('./assets/js/messaging/pushNotifications');
const { bq_onCreate_pagination, bq_onRequest_activities, bq_onRequest_campaigns, bq_onRequest_contacts, bq_onRequest_createTable, bq_onRequest_getResponseWebhook, bq_onRequest_newsletters, bq_onRequest_newsletters_update, bq_onRun_campaigns, bq_onRun_contacts, bq_onRun_newsletters, bq_onRun_newsletters_update } = require('./assets/js/bigquery/queries');
const { certificadosBatchHandler } = require('./assets/js/certificados/certificadosBatch');
const { changePasswordHandlerRequest } = require('./assets/js/user/changePassword');
const { checkCodeHandlerRequest } = require('./assets/js/user/checkCode');
const { checkRepresentantiveCallable } = require('./assets/js/triggers/plans');
const { clickMeetingBQHandler } = require('./assets/js/click-meeting/clickMeetingBQ');
const { clickMeetingV2Handler } = require('./assets/js/click-meeting/clickMeetingV2');
const { fetchFileHandler } = require('./assets/js/click-meeting/fetchFile');
const { deleteAuthUserCallable } = require('./assets/js/user/deleteAuthUser');
const { emailVerificationAuthUserCallable } = require('./assets/js/user/emailVerificationAuthUser');
const { fire_onRun_scheduled_posts, fire_onRun_delete_curses_and_congresses, fire_onRequest_scheduled_posts } = require('./assets/js/posts/scheduledPosts');
const { getAllUsersAuthUserHandler, getAuthUserCallable, getAuthUserByEmailCallable, resetPasswordAuthUserCallable, updateAuthUserCallable } = require('./assets/js/user/accountManagement');
const { getSearchArrayHandlerRequest, updateSeachUserObjectCallable, onUsersTasksHandler } = require('./assets/js/user/updateSearchTasks');
const { onCreateCertificatesBatchHandler, onUpdateCertificatesBatchItemHandler } = require('./assets/js/certificados/certificatesBatchTriggers');
const { onAddCreateHandler } = require('./assets/js/triggers/advertising');
const { onClickBannerCreateHandler, onClickBannerDeleteHandler } = require('./assets/js/triggers/banners');
const { onGroupsCreateHandler } = require('./assets/js/triggers/groups');
const { onUsersCreateHandler, onUsersUpdateHandler, onUsersDeleteHandler, onUserUpdateHandler } = require('./assets/js/triggers/users');
const { updatePostsSearchCallable, onPostsTasksHandler, updateProductsSearchCallable, onProductsTasksHandler, onWriteBannersHandler, onWriteCategoriesHandler, onWriteCategoriesVideosHandler, onWriteForoHandler, onWriteProductsHandler, onWriteSpecialtiesHandler, onWriteTagsHandler } = require('./assets/js/content/contentHandlers');
const { paymentsCallable } = require('./assets/js/payments/payments');
const { sendNotificationHandlerRequest, sendNotificationCallCallable, subscribeToTopicCallable, unsubscribeFromTopicCallable } = require('./assets/js/messaging/topicsAndNotifications');
const { zoomSignatureHandler, zoomGetMeetingInfoHandler } = require('./assets/js/zoom/zoom');
const { getTokenCallable, fire_onRun_usersInValidation, uploadFilesToFstorageHandler } = require('./assets/js/utils/storageAndValidation');
const { clickMeetingHandler } = require('./assets/js/click-meeting/click-meeting');
const { handlerApiClickMeeting, handlerBQClickMeeting, requestFileClickMeeting, handlerGetBQClickMeetingAttendees } = require('./assets/js/click-meeting/click-meeting2');
const { registerHandler, updateHandler } = require('./assets/js/user/register');
const { generatePDFHandler } = require('./assets/js/pdf/pdf');
const { generateHtmlCertificateHandler } = require('./assets/js/pdf/html');
const { sendMailHandler } = require('./assets/js/utils/sendMail');
const { sendSmsHandler } = require('./assets/js/utils/sendSms');
const { updateSearchArrayCallable } = require('./assets/js/user/updateSearch');
const { getSpecialties, getSpecialty } = require('./assets/js/specialties/specialties');
const { handler_onRequest } = require('./assets/js/conectimed_landing/landing');
const { onWriteDoctorsHandler } = require('./assets/js/triggers/doctors');
const { getVirtualSessionsAttendanceConfirmation } = require('./assets/js/testing/testing');
const { handleAssistanceCreated, handleAssistanceUpdated, handleAssistanceDeleted, virtualSessionsAttendanceConfirmationCountFix/*, exportAssistanceToBigQuery */ } = require('./assets/js/triggers/virtualSessions');
const { zoho_onRequest, zoho_onDocumentWritten, zoho_onSchedule, zoho_onRequest_setStatus, zoho_onRequest_single } = require('./assets/js/zoho/zoho');
const { chatTriggerHandler } = require('./assets/js/triggers/chats');
const { readFileHandler } = require('./assets/js/chat/readFile');
const { sectionsHandler } = require('./assets/js/chat/sections');
const { chatBatchRequestHandler } = require('./assets/js/chat/chatBatch');
const { generateCodeHandlerRequest, getUserByEmailHandlerRequest } = require('./assets/js/user/get-user-account');
const { updateUserDocumentHandler } = require('./assets/js/user/re-updload-documents');

/*
firebase emulators:start --import exports
firebase emulators:export exports
*/

/*
firebase deploy --only functions:chatBatch
firebase deploy --only functions:onChatsWrite
firebase deploy --only functions:onCreateChatBatch
firebase deploy --only functions:onUpdateChatBatchItem


//ZOHO

firebase deploy --only functions:zohoExportRequest
firebase deploy --only functions:zohoExportmarkAllUsersPendingRequest
firebase deploy --only functions:zohoExportSingleRequest
firebase deploy --only functions:zohoExportPaginationTrigger
firebase deploy --only functions:zohoExportScheduled
*/
/* functions HTTP REQUEST */

/* DESC: STRIPE | AUTHOR: Rolando | TYPE: HTTP REQUEST */
exports.infoDBF = onRequest(runtimeOpts, async (req, res) => await infoDBFHandler(req, res));

/* DESC: STRIPE | AUTHOR: Rolando | TYPE: HTTP REQUEST */
exports.stripe_customer_create = onRequest(async (req, res) => await stripeCustomerCreateHandler(req, res));

/* DESC: STRIPE | AUTHOR: Rolando | TYPE: HTTP REQUEST */
exports.stripe_customer_update = onRequest(runtimeOpts, async (req, res) => await stripeCustomerUpdateHandler(req, res));

/* DESC: STRIPE | AUTHOR: Rolando | TYPE: HTTP REQUEST */
exports.stripe_customer_retrieve = onRequest(runtimeOpts, async (req, res) => await stripeCustomerRetrieveHandler(req, res));

/* DESC: STRIPE | AUTHOR: Rolando | TYPE: HTTP REQUEST */
exports.stripe_customer_delete = onRequest(runtimeOpts, async (req, res) => await stripeCustomerDeleteHandler(req, res));

/* DESC: STRIPE | AUTHOR: Rolando | TYPE: HTTP REQUEST */
exports.stripe_payment_intent = onRequest(runtimeOpts, async (req, res) => await stripePaymentIntentHandler(req, res));

/* DESC: STRIPE | AUTHOR: Rolando | TYPE: HTTP REQUEST */
exports.stripe_payment_intent_update = onRequest(runtimeOpts, async (req, res) => await stripePaymentIntentUpdateHandler(req, res));

/* DESC: GET URL FROM CLICK MEETING | AUTHOR: Rolando | TYPE: HTTP REQUEST */
exports.clickMeeting = onRequest(async (req, res) => await clickMeetingHandler(req, res));

/* DESC: GET VALIDATED USERS | AUTHOR: Rolando | TYPE: HTTP REQUEST */
exports.getValidatedUsers = onRequest(runtimeOpts, async (req, res) => await getValidatedUsersHandler(req, res));

/* DESC: USER APP REGISTRATION | AUTHOR: Rolando | TYPE: HTTP REQUEST */
exports.userAppRegister = onRequest(runtimeOpts, async (req, res) => await registerHandler(req, res));

/* DESC: USER APP UPDATE | AUTHOR: Rolando | TYPE: HTTP REQUEST */
exports.userAppUpdate = onRequest(runtimeOpts, async (req, res) => await updateHandler(req, res));

/* DESC: GET ALL AUTH USERS | AUTHOR: Miguel | TYPE: HTTP REQUEST */
exports.getAllAuthUsers = onRequest(runtimeOpts, async (req, res) => await getAllAuthUsersHandler(req, res));

/* DESC: GET AUTH USERS BY LIST | AUTHOR: Miguel | TYPE: HTTP REQUEST */
exports.getAuthUsersByList = onRequest(runtimeOpts, async (req, res) => await getAuthUsersByListHandler(req, res));

/* DESC: GEN HTML CERT | AUTHOR: Miguel | TYPE: HTTP REQUEST */
exports.generateHtmlCertificate = onRequest(runtimeOpts, async (req, res) => await generateHtmlCertificateHandler(req, res));

/* DESC: GEN PDF FILE | AUTHOR: Miguel | TYPE: HTTP REQUEST */
exports.generatePDF = onRequest(runtimeOpts, async (req, res) => await generatePDFHandler(req, res));

/* DESC: GET ALL SPECIALTIES | AUTHOR: Rolando | TYPE: HTTP REQUEST */
exports.getSpecialties = onRequest(runtimeOpts, async (req, res) => await getSpecialties(req, res));

/* DESC: GET SPECIALTY BY ID | AUTHOR: Rolando | TYPE: HTTP REQUEST */
exports.getSpecialty = onRequest(runtimeOpts, async (req, res) => await getSpecialty(req, res));

/*DESC: CONECTIMED LANDING | AUTHOR: MIGUEL | TYPE: HTTP REQUEST  */
exports.conectimed_landing = onRequest(runtimeOpts, async (req, res) => await handler_onRequest(req, res));

/*DESC: LASTFOROPOSTS | AUTHOR: MIGUEL | TYPE: HTTP REQUEST  */
exports.lastForoPosts = onRequest(runtimeOpts, async (req, res) => await handler(req, res));

/* DESC: GEN HTML CERT | AUTHOR: Miguel | TYPE: HTTP REQUEST */
exports.generateHtmlCertificate = onRequest(runtimeOpts, async (req, res) => await generateHtmlCertificateHandler(req, res));

/* DESC: FIX THE AMOUNT OF VIRTUAL SESSIONS ASSISTANCE CONFIRMATIONS IN BIGQUERY | AUTHOR: Rolando | TYPE: HTTP REQUEST */
exports.virtualSessionsAttendanceConfirmationCountFix = onRequest(runtimeOpts, async (req, res) => await virtualSessionsAttendanceConfirmationCountFix(req, res));

/* DESC: VIRTUAL SESSIONS ASSISTANCE FROM FIRESTORE TO BIGQUERY | AUTHOR: Rolando | TYPE: HTTP REQUEST ===================== TEST, ON WORKING! =====================*/
// exports.exportAssistanceToBigQuery = onRequest(runtimeOpts, async (req, res) => await exportAssistanceToBigQuery(req, res));

/* DESC: EXPORT TO ZOHO (REQUEST) | AUTHOR: Rolando | TYPE: HTTP REQUEST */
exports.zohoExportRequest = onRequest(runtimeOpts, async (req, res) => await zoho_onRequest(req, res));

/* DESC: EXPORT TO ZOHO (REQUEST) | AUTHOR: Rolando | TYPE: HTTP REQUEST */
exports.zohoExportmarkAllUsersPendingRequest = onRequest(runtimeOpts, async (req, res) => await zoho_onRequest_setStatus(req, res));

/* DESC: EXPORT SINGLE USER TO ZOHO (REQUEST) | AUTHOR: Rolando | TYPE: HTTP REQUEST */
exports.zohoExportSingleRequest = onRequest(runtimeOpts, async (req, res) => await zoho_onRequest_single(req, res));

/* DESC: OBTAINING CONFIRMATION OF ATTENDANCE AT VIRTUAL SESSIONS | AUTHOR: Rolando | TYPE: HTTP REQUEST */
exports.getVirtualSessionsAttendanceConfirmation = onRequest(runtimeOpts, async (req, res) => await getVirtualSessionsAttendanceConfirmation(req, res));

/* DESC: INIT THE #CHAT BATCH OPERATION | AUTHOR: Rolando | TYPE: HTTP REQUEST */
exports.chatBatch = onRequest(runtimeOpts, async (req, res) => await chatBatchRequestHandler(req, res));

/* DESC: SEND CODE TO RESET PASSWORD | AUTHOR: Rolando | TYPE: HTTP REQUEST */
exports.generateCode = onRequest(runtimeOpts, async (req, res) => await generateCodeHandlerRequest(req, res));

/* DESC: GET USER ACCOUNT | AUTHOR: Rolando | TYPE: HTTP REQUEST */
exports.getAuthUserByEmailRequest = onRequest(runtimeOpts, async (req, res) => await getUserByEmailHandlerRequest(req, res));

/* DESC: PREREGISTRO SEARCH | AUTHOR: Migrated v2 | TYPE: HTTP REQUEST */
exports.search = onRequest(runtimeOpts, async (req, res) => await searchHandler(req, res));

/* DESC: PREREGISTRO UPDATE | AUTHOR: Migrated v2 | TYPE: HTTP REQUEST */
exports.update = onRequest(runtimeOpts, async (req, res) => await preregistroUpdateHandler(req, res));

/* DESC: MEMBER CONTACTS | AUTHOR: Migrated v2 | TYPE: HTTP REQUEST */
exports.contacts = onRequest(runtimeOpts, async (req, res) => await contactsHandler(req, res));

/* DESC: MEMBER FILTERS | AUTHOR: Migrated v2 | TYPE: HTTP REQUEST */
exports.filters = onRequest(runtimeOpts, async (req, res) => await filtersHandler(req, res));

/* DESC: EXIST IN FIRE AUTH | AUTHOR: Migrated v2 | TYPE: HTTP REQUEST */
exports.existInFireAuth = onRequest(runtimeOpts, async (req, res) => await existInFireAuthHandler(req, res));

/* DESC: CREATE USERS | AUTHOR: Migrated v2 | TYPE: HTTP REQUEST */
exports.createUsers = onRequest(runtimeOpts, async (req, res) => await createUsersHandler(req, res));

/* DESC: DELETE USERS | AUTHOR: Migrated v2 | TYPE: HTTP REQUEST */
exports.deleteUsers = onRequest(runtimeOpts, async (req, res) => await deleteUsersHandler(req, res));

/* DESC: TOKENS | AUTHOR: Migrated v2 | TYPE: HTTP REQUEST */
exports.tokens = onRequest(runtimeOpts, async (req, res) => await tokensHandler(req, res));

/* DESC: GET FB TOKEN | AUTHOR: Migrated v2 | TYPE: HTTP REQUEST */
exports.getFbToken = onRequest(runtimeOpts, async (req, res) => await getFbTokenHandlerRequest(req, res));

/* DESC: UPLOAD USER DOCUMENT (PUT JSON: file as Base64, uid; max 5 MB) | TYPE: HTTP REQUEST */
exports.updateUserDocuments = onRequest(runtimeOpts, async (req, res) => await updateUserDocumentHandler(req, res));

/* CALLABLES MIGRATED */

/* DESC: IS FULL MIGRATED WP | AUTHOR: Migrated v2 | TYPE: CALLABLE */
exports.isFullMigratedWP = onCall(runtimeOpts, async (request) => await isFullMigratedWPHandler(request));

/* DESC: CHANGE PASSWORD WP FB | AUTHOR: Migrated v2 | TYPE: CALLABLE */
exports.changePasswordWPFB = onCall(runtimeOpts, async (request) => await changePasswordWPFBHandler(request));

/* DESC: GENERATE TOKEN WP | AUTHOR: Migrated v2 | TYPE: CALLABLE */
exports.generateTokenWP = onCall(runtimeOpts, async (request) => await generateTokenWPHandler(request));

/* DESC: GENERATE TOKEN ZOOM | AUTHOR: Migrated v2 | TYPE: CALLABLE */
exports.generateTokenZoom = onCall(runtimeOpts, async (request) => await generateTokenZoomHandler(request));

/* DESC: LIST CARDS | AUTHOR: Migrated v2 | TYPE: CALLABLE */
exports.listCards = onCall(runtimeOpts, async (request) => await listCardsHandler(request));

/* DESC: SET POINTS | AUTHOR: Migrated v2 | TYPE: CALLABLE */
exports.setPoints = onCall(runtimeOpts, async (request) => await setPointsHandler(request));

/* DESC: CREATE AUTH USER | AUTHOR: Migrated v2 | TYPE: CALLABLE */
exports.createAuthUser = onCall(runtimeOpts, async (request) => await createAuthUserCallable(request));

/* DESC: CHECK REPRESENTANTIVE | AUTHOR: Migrated v2 | TYPE: CALLABLE */
exports.checkRepresentantive = onCall(runtimeOpts, async (request) => await checkRepresentantiveCallable(request));

/* DESC: CERTIFICADOS BATCH | AUTHOR: Migrated v2 | TYPE: HTTP REQUEST */
exports.certificadosBatch = onRequest(runtimeOpts, async (req, res) => await certificadosBatchHandler(req, res));

/* DESC: CHANGE PASSWORD | AUTHOR: Migrated v2 | TYPE: HTTP REQUEST */
exports.changePassword = onRequest(runtimeOpts, async (req, res) => await changePasswordHandlerRequest(req, res));

/* DESC: CHECK CODE | AUTHOR: Migrated v2 | TYPE: HTTP REQUEST */
exports.checkCode = onRequest(runtimeOpts, async (req, res) => await checkCodeHandlerRequest(req, res));

/* DESC: CLICK MEETING TO BQ | AUTHOR: Migrated v2 | TYPE: HTTP REQUEST */
exports.clickMeetingToBQ = onRequest(runtimeOpts, async (req, res) => await clickMeetingBQHandler(req, res));

/* DESC: CLICK MEETING V2 | AUTHOR: Migrated v2 | TYPE: HTTP REQUEST */
exports.clickMeetingV2 = onRequest(runtimeOpts, async (req, res) => await clickMeetingV2Handler(req, res));

/* DESC: FETCH FILE | AUTHOR: Migrated v2 | TYPE: HTTP REQUEST */
exports.fetchFile = onRequest(runtimeOpts, async (req, res) => await fetchFileHandler(req, res));

/* DESC: DELETE AUTH USER | AUTHOR: Migrated v2 | TYPE: CALLABLE */
exports.deleteAuthUser = onCall(runtimeOpts, async (request) => await deleteAuthUserCallable(request));

/* DESC: EMAIL VERIFICATION AUTH USER | AUTHOR: Migrated v2 | TYPE: CALLABLE */
exports.emailVerificationAuthUser = onCall(runtimeOpts, async (request) => await emailVerificationAuthUserCallable(request));

/* DESC: GET AUTH USER | AUTHOR: Migrated v2 | TYPE: CALLABLE */
exports.getAuthUser = onCall(runtimeOpts, async (request) => await getAuthUserCallable(request));

/* DESC: GET AUTH USER BY EMAIL | AUTHOR: Migrated v2 | TYPE: CALLABLE */
exports.getAuthUserByEmail = onCall(runtimeOpts, async (request) => await getAuthUserByEmailCallable(request));

/* DESC: RESET PASSWORD AUTH USER | AUTHOR: Migrated v2 | TYPE: CALLABLE */
exports.resetPasswordAuthUser = onCall(runtimeOpts, async (request) => await resetPasswordAuthUserCallable(request));

/* DESC: UPDATE AUTH USER | AUTHOR: Migrated v2 | TYPE: CALLABLE */
exports.updateAuthUser = onCall(runtimeOpts, async (request) => await updateAuthUserCallable(request));

/* DESC: UPDATE SEARCH USER OBJECT | AUTHOR: Migrated v2 | TYPE: CALLABLE */
exports.updateSeachUserObject = onCall(runtimeOpts, async (request) => await updateSeachUserObjectCallable(request));

/* DESC: UPDATE POSTS SEARCH | AUTHOR: Migrated v2 | TYPE: CALLABLE */
exports.updatePostsSearch = onCall(runtimeOpts, async (request) => await updatePostsSearchCallable(request));

/* DESC: UPDATE PRODUCTS SEARCH | AUTHOR: Migrated v2 | TYPE: CALLABLE */
exports.updateProductsSearch = onCall(runtimeOpts, async (request) => await updateProductsSearchCallable(request));

/* DESC: PAYMENTS | AUTHOR: Migrated v2 | TYPE: CALLABLE */
exports.payments = onCall(runtimeOpts, async (request) => await paymentsCallable(request));

/* DESC: SEND NOTIFICATION CALL | AUTHOR: Migrated v2 | TYPE: CALLABLE */
exports.sendNotificationCall = onCall(runtimeOpts, async (request) => await sendNotificationCallCallable(request));

/* DESC: SUBSCRIBE TO TOPIC | AUTHOR: Migrated v2 | TYPE: CALLABLE */
exports.subscribeToTopic = onCall(runtimeOpts, async (request) => await subscribeToTopicCallable(request));

/* DESC: UNSUBSCRIBE FROM TOPIC | AUTHOR: Migrated v2 | TYPE: CALLABLE */
exports.unsubscribeFromTopic = onCall(runtimeOpts, async (request) => await unsubscribeFromTopicCallable(request));

/* DESC: GET TOKEN | AUTHOR: Migrated v2 | TYPE: CALLABLE */
exports.getToken = onCall(runtimeOpts, async (request) => await getTokenCallable(request));

/* MORE HTTP ENDPOINTS MIGRATED */

/* DESC: GET ALL USERS AUTH USER | AUTHOR: Migrated v2 | TYPE: HTTP REQUEST */
exports.getAllUsersAuthUser = onRequest(runtimeOpts, async (req, res) => await getAllUsersAuthUserHandler(req, res));

/* DESC: GET SEARCH ARRAY | AUTHOR: Migrated v2 | TYPE: HTTP REQUEST */
exports.getSearchArray = onRequest(runtimeOpts, async (req, res) => await getSearchArrayHandlerRequest(req, res));

/* DESC: FIRE ONREQUEST SCHEDULED POSTS | AUTHOR: Migrated v2 | TYPE: HTTP REQUEST */
exports.fire_onRequest_scheduled_posts = onRequest(runtimeOpts, async (req, res) => await fire_onRequest_scheduled_posts(req, res));

/* DESC: SEND NOTIFICATION | AUTHOR: Migrated v2 | TYPE: HTTP REQUEST */
exports.sendNotification = onRequest(runtimeOpts, async (req, res) => await sendNotificationHandlerRequest(req, res));

/* DESC: UPLOAD FILES TO FSTORAGE | AUTHOR: Migrated v2 | TYPE: HTTP REQUEST */
exports.uploadFilesToFstorage = onRequest(runtimeOpts, async (req, res) => await uploadFilesToFstorageHandler(req, res));

/* DESC: ZOOM SIGNATURE | AUTHOR: Migrated v2 | TYPE: HTTP REQUEST */
exports.zoomSignature = onRequest(runtimeOpts, async (req, res) => await zoomSignatureHandler(req, res));

/* DESC: ZOOM GET MEETING INFO | AUTHOR: Migrated v2 | TYPE: HTTP REQUEST */
exports.zoomGetMeetingInfo = onRequest(runtimeOpts, async (req, res) => await zoomGetMeetingInfoHandler(req, res));

/* MORE SCHEDULED FUNCTIONS MIGRATED */

/* DESC: FIRE ONRUN SCHEDULED POSTS | AUTHOR: Migrated v2 | TYPE: SCHEDULED */
exports.fire_onRun_scheduled_posts = onSchedule({
    schedule: "*/10 * * * *",
    timeZone: "America/Mexico_City",
    memory: "1GiB",
    timeoutSeconds: 540
}, async (event) => await fire_onRun_scheduled_posts(event));

/* DESC: FIRE ONRUN DELETE CURSES AND CONGRESSES | AUTHOR: Migrated v2 | TYPE: SCHEDULED */
exports.fire_onRun_delete_curses_and_congresses = onSchedule({
    schedule: "00 00 * * *",
    timeZone: "America/Mexico_City",
    memory: "1GiB",
    timeoutSeconds: 540
}, async (event) => await fire_onRun_delete_curses_and_congresses(event));

/* DESC: FIRE ONRUN USERS IN VALIDATION | AUTHOR: Migrated v2 | TYPE: SCHEDULED */
exports.fire_onRun_usersInValidation = onSchedule({
    schedule: "*/10 * * * *",
    timeZone: "America/Mexico_City",
    memory: "1GiB",
    timeoutSeconds: 540
}, async (event) => await fire_onRun_usersInValidation(event));

/* MORE FIRESTORE TRIGGERS MIGRATED */

/* DESC: ON ADD CREATE | AUTHOR: Migrated v2 | TYPE: ON DOCUMENT CREATED */
exports.onAddCreate = onDocumentCreated({
    document: "advertising/{id}"
}, async (event) => await onAddCreateHandler(event));

/* DESC: ON CLICK BANNER CREATE | AUTHOR: Migrated v2 | TYPE: ON DOCUMENT CREATED */
exports.onClickBannerCreate = onDocumentCreated({
    document: "advertising/{advertisingId}/clicks/{dateId}/users/{userId}"
}, async (event) => await onClickBannerCreateHandler(event));

/* DESC: ON CLICK BANNER DELETE | AUTHOR: Migrated v2 | TYPE: ON DOCUMENT DELETED */
exports.onClickBannerDelete = onDocumentDeleted({
    document: "advertising/{advertisingId}/clicks/{dateId}/users/{userId}"
}, async (event) => await onClickBannerDeleteHandler(event));

/* DESC: ON CREATE CERTIFICATES BATCH | AUTHOR: Migrated v2 | TYPE: ON DOCUMENT CREATED */
exports.onCreateCertificatesBatch = onDocumentCreated({
    document: "certificates-batch/{id}"
}, async (event) => await onCreateCertificatesBatchHandler(event));

/* DESC: ON UPDATE CERTIFICATES BATCH ITEM | AUTHOR: Migrated v2 | TYPE: ON DOCUMENT UPDATED */
exports.onUpdateCertificatesBatchItem = onDocumentUpdated({
    document: "certificates-batch/{id_batch}/sections/{id}"
}, async (event) => await onUpdateCertificatesBatchItemHandler(event));

/* DESC: ON GROUPS CREATE | AUTHOR: Migrated v2 | TYPE: ON DOCUMENT CREATED */
exports.onGroupsCreate = onDocumentCreated({
    document: "broadcast-list/{uid}"
}, async (event) => await onGroupsCreateHandler(event));

/* DESC: ON USERS CREATE | AUTHOR: Migrated v2 | TYPE: ON DOCUMENT CREATED */
exports.onUsersCreate = onDocumentCreated({
    document: "users/{userId}"
}, async (event) => await onUsersCreateHandler(event));

/* DESC: ON USERS UPDATE | AUTHOR: Migrated v2 | TYPE: ON DOCUMENT UPDATED */
exports.onUsersUpdate = onDocumentUpdated({
    document: "users/{userId}"
}, async (event) => await onUsersUpdateHandler(event));

/* DESC: ON USERS DELETE | AUTHOR: Migrated v2 | TYPE: ON DOCUMENT DELETED */
exports.onUsersDelete = onDocumentDeleted({
    document: "users/{userId}"
}, async (event) => await onUsersDeleteHandler(event));

/* DESC: ON USER UPDATE | AUTHOR: Migrated v2 | TYPE: ON DOCUMENT UPDATED */
exports.onUserUpdate = onDocumentUpdated({
    document: "users/{userId}"
}, async (event) => await onUserUpdateHandler(event));

/* DESC: ON USERS TASKS | AUTHOR: Migrated v2 | TYPE: ON DOCUMENT UPDATED */
exports.onUsersTasks = onDocumentUpdated({
    document: "users-tasks/{id}"
}, async (event) => await onUsersTasksHandler(event));

/* DESC: ON POSTS TASKS | AUTHOR: Migrated v2 | TYPE: ON DOCUMENT UPDATED */
exports.onPostsTasks = onDocumentUpdated({
    document: "posts-tasks/{id}"
}, async (event) => await onPostsTasksHandler(event));

/* DESC: ON PRODUCTS TASKS | AUTHOR: Migrated v2 | TYPE: ON DOCUMENT UPDATED */
exports.onProductsTasks = onDocumentUpdated({
    document: "products-tasks/{id}"
}, async (event) => await onProductsTasksHandler(event));

/* DESC: ON WRITE BANNERS | AUTHOR: Migrated v2 | TYPE: ON DOCUMENT WRITTEN */
exports.onWriteBanners = onDocumentWritten({
    document: "banners/{id}"
}, async (event) => await onWriteBannersHandler(event));

/* DESC: ON WRITE CATEGORIES | AUTHOR: Migrated v2 | TYPE: ON DOCUMENT WRITTEN */
exports.onWriteCategories = onDocumentWritten({
    document: "categories/{id}"
}, async (event) => await onWriteCategoriesHandler(event));

/* DESC: ON WRITE CATEGORIES VIDEOS | AUTHOR: Migrated v2 | TYPE: ON DOCUMENT WRITTEN */
exports.onWriteCategoriesVideos = onDocumentWritten({
    document: "categories_video/{id}"
}, async (event) => await onWriteCategoriesVideosHandler(event));

/* DESC: ON WRITE FORO | AUTHOR: Migrated v2 | TYPE: ON DOCUMENT WRITTEN */
exports.onWriteForo = onDocumentWritten({
    document: "foro/{id}"
}, async (event) => await onWriteForoHandler(event));

/* DESC: ON WRITE PRODUCTS | AUTHOR: Migrated v2 | TYPE: ON DOCUMENT WRITTEN */
exports.onWriteProducts = onDocumentWritten({
    document: "products/{id}"
}, async (event) => await onWriteProductsHandler(event));

/* DESC: ON WRITE SPECIALTIES | AUTHOR: Migrated v2 | TYPE: ON DOCUMENT WRITTEN */
exports.onWriteSpecialties = onDocumentWritten({
    document: "specialties/{id}"
}, async (event) => await onWriteSpecialtiesHandler(event));

/* DESC: ON WRITE TAGS | AUTHOR: Migrated v2 | TYPE: ON DOCUMENT WRITTEN */
exports.onWriteTags = onDocumentWritten({
    document: "tags/{id}"
}, async (event) => await onWriteTagsHandler(event));

/* DESC: BQ GET RESPONSE WEBHOOK | AUTHOR: Migrated v2 | TYPE: HTTP REQUEST */
exports.bq_onRequest_getResponseWebhook = onRequest(runtimeOpts, async (req, res) => await bq_onRequest_getResponseWebhook(req, res));

/* DESC: BQ NEWSLETTERS | AUTHOR: Migrated v2 | TYPE: HTTP REQUEST */
exports.bq_onRequest_newsletters = onRequest(runtimeOpts, async (req, res) => await bq_onRequest_newsletters(req, res));

/* DESC: BQ NEWSLETTERS UPDATE | AUTHOR: Migrated v2 | TYPE: HTTP REQUEST */
exports.bq_onRequest_newsletters_update = onRequest(runtimeOpts, async (req, res) => await bq_onRequest_newsletters_update(req, res));

/* SCHEDULED FUNCTIONS MIGRATED */

/* DESC: BQ ON RUN CAMPAIGNS | AUTHOR: Migrated v2 | TYPE: SCHEDULED */
exports.bq_onRun_campaigns = onSchedule({
    schedule: "00 00 * * 1",
    timeZone: "America/Mexico_City",
    memory: "1GiB",
    timeoutSeconds: 540
}, async (event) => await bq_onRun_campaigns(event));

/* DESC: BQ ON RUN CONTACTS | AUTHOR: Migrated v2 | TYPE: SCHEDULED */
exports.bq_onRun_contacts = onSchedule({
    schedule: "00 16 * * 1",
    timeZone: "America/Mexico_City",
    memory: "1GiB",
    timeoutSeconds: 540
}, async (event) => await bq_onRun_contacts(event));

/* DESC: BQ ON RUN NEWSLETTERS | AUTHOR: Migrated v2 | TYPE: SCHEDULED */
exports.bq_onRun_newsletters = onSchedule({
    schedule: "03 00 * * *",
    timeZone: "America/Mexico_City",
    memory: "1GiB",
    timeoutSeconds: 540
}, async (event) => await bq_onRun_newsletters(event));

/* DESC: BQ ON RUN NEWSLETTERS UPDATE | AUTHOR: Migrated v2 | TYPE: SCHEDULED */
exports.bq_onRun_newsletters_update = onSchedule({
    schedule: "30 01 * * *",
    timeZone: "America/Mexico_City",
    memory: "1GiB",
    timeoutSeconds: 540
}, async (event) => await bq_onRun_newsletters_update(event));

/* DESC: ADMIN MESSAGING HTTP | AUTHOR: Migrated v2 | TYPE: HTTP REQUEST */
exports.admin_messaging = onRequest(runtimeOpts, async (req, res) => await admin_messaging_onRequest(req, res));

/* DESC: ADMIN MESSAGING MOVIL HTTP | AUTHOR: Migrated v2 | TYPE: HTTP REQUEST */
exports.admin_messaging_movil = onRequest(runtimeOpts, async (req, res) => await admin_messaging_movil_onRequest(req, res));

/* DESC: BQ ACTIVITIES HTTP | AUTHOR: Migrated v2 | TYPE: HTTP REQUEST */
exports.bq_onRequest_activities = onRequest(runtimeOpts, async (req, res) => await bq_onRequest_activities(req, res));

/* DESC: BQ CAMPAIGNS HTTP | AUTHOR: Migrated v2 | TYPE: HTTP REQUEST */
exports.bq_onRequest_campaigns = onRequest(runtimeOpts, async (req, res) => await bq_onRequest_campaigns(req, res));

/* DESC: BQ CONTACTS HTTP | AUTHOR: Migrated v2 | TYPE: HTTP REQUEST */
exports.bq_onRequest_contacts = onRequest(runtimeOpts, async (req, res) => await bq_onRequest_contacts(req, res));

/* DESC: BQ CREATE TABLE HTTP | AUTHOR: Migrated v2 | TYPE: HTTP REQUEST */
exports.bq_onRequest_createTable = onRequest(runtimeOpts, async (req, res) => await bq_onRequest_createTable(req, res));

/* FIRESTORE TRIGGERS MIGRATED */

/* DESC: A USER UPDATE BIGQUERY | AUTHOR: Migrated v2 | TYPE: ON DOCUMENT UPDATED */
exports.aUserUpdate = onDocumentUpdated({
    memory: "1GiB",
    timeoutSeconds: 540,
    document: "users/{userId}"
}, async (event) => await aUserUpdateHandler(event));

/* DESC: A USER DELETE BIGQUERY | AUTHOR: Migrated v2 | TYPE: ON DOCUMENT DELETED */
exports.aUserDelete = onDocumentDeleted({
    memory: "1GiB",
    timeoutSeconds: 540,
    document: "users/{userId}"
}, async (event) => await aUserDeleteHandler(event));

/* DESC: ADMIN MESSAGING PAGINATE | AUTHOR: Migrated v2 | TYPE: ON DOCUMENT UPDATED */
exports.admin_messaging_paginate = onDocumentUpdated({
    memory: "1GiB",
    timeoutSeconds: 540,
    document: "notifications-batch/{id_batch}/pages/{page}"
}, async (event) => await admin_messaging_onUpdate(event));

/* DESC: BQ ON CREATE PAGINATION | AUTHOR: Migrated v2 | TYPE: ON DOCUMENT CREATED */
exports.bq_onCreate_pagination = onDocumentCreated({
    memory: "1GiB",
    timeoutSeconds: 540,
    document: "bq_pagination/{table}/pagination/{page}"
}, async (event) => await bq_onCreate_pagination(event));

/* DESC: CLICK MEETING TO BIGQUERY | AUTHOR: Rolando | TYPE: HTTP REQUEST */
//exports.clickMeetingV2 = onRequest(runtimeOpts, async (req, res) => await handlerApiClickMeeting(req, res));

/* DESC: CLICK MEETING TO BIGQUERY | AUTHOR: Rolando | TYPE: HTTP REQUEST */
//exports.clickMeetingToBQ = onRequest(runtimeOpts, async (req, res) => await handlerBQClickMeeting(req, res));

/* DESC: CLICK MEETING TO BIGQUERY | AUTHOR: Rolando | TYPE: HTTP REQUEST */
//exports.fetchFile = onRequest(runtimeOpts, async (req, res) => await requestFileClickMeeting(req, res));

/* DESC: GET ATTENDEES FROM BIGQUERY | AUTHOR: Rolando | TYPE: HTTP REQUEST */
exports.getClickMeetingAttendees = onRequest(runtimeOpts, async (req, res) => await handlerGetBQClickMeetingAttendees(req, res));

/* functions CALLABLES */

/* DESC: SEND MAIL | AUTHOR: Miguel | TYPE: CALLABLE */
exports.sendMail = onCall(runtimeOpts, async (data, context) => await sendMailHandler(data, context));

/* DESC: SEND SMS | AUTHOR: Rolando | TYPE: CALLABLE */
exports.sendSms = onCall(runtimeOpts, async (data, context) => await sendSmsHandler(data, context));

/* DESC: UPDATE SEARCH ARRAY | AUTHOR: Rolando | TYPE: CALLABLE */
exports.updateSearchArray = onCall(runtimeOpts, async (data, context) => await updateSearchArrayCallable(data, context));

/* functions ON WRITE */

/* DESC: COLLECTION 'medico-meta' changes | AUTHOR: Rolando | TYPE: ON WRITE */
exports.onDoctorWrite = onDocumentWritten({
    memory: "1GiB",
    timeoutSeconds: 540,
    document: "medico-meta/{medicoId}"
}, async (event) => await onWriteDoctorsHandler(event.data, event.context));

/* DESC: COLLECTION 'posts/{postId}/assistance' changes | AUTHOR: Rolando | TYPE: ON DOCUMENT CREATED */
exports.sVSoho_onAssistanceCreated = onDocumentCreated({
    memory: "1GiB",
    timeoutSeconds: 540,
    document: "posts/{postId}/assistance/{userId}"
}, async (event) => await handleAssistanceCreated(event));

/* DESC: COLLECTION 'posts/{postId}/assistance' changes | AUTHOR: Rolando | TYPE: ON DOCUMENT UPDATED */
exports.sVSoho_onAssistanceUpdated = onDocumentUpdated({
    memory: "1GiB",
    timeoutSeconds: 540,
    document: "posts/{postId}/assistance/{userId}"
}, async (event) => await handleAssistanceUpdated(event));

/* DESC: COLLECTION 'posts/{postId}/assistance' changes | AUTHOR: Rolando | TYPE: ON DOCUMENT DELETED */
exports.sVSoho_onAssistanceDeleted = onDocumentDeleted({
    memory: "1GiB",
    timeoutSeconds: 540,
    document: "posts/{postId}/assistance/{userId}"
}, async (event) => await handleAssistanceDeleted(event));

/* DESC: EXPORT TO ZOHO (PAGINATION) | AUTHOR: Rolando | TYPE: ON WRITE */
exports.zohoExportPaginationTrigger = onDocumentWritten({
    memory: "1GiB",
    timeoutSeconds: 540,
    document: "validated-user-data-pivot/{pivotId}"
}, async (event) => await zoho_onDocumentWritten(event));

/* DESC: SEND MASIVE #CHATS | AUTHOR: Rolando | TYPE: ON WRITE */
exports.onChatsWrite = onDocumentWritten({
    memory: "1GiB",
    timeoutSeconds: 540,
    document: "chats/{messageId}"
}, async (event) => await chatTriggerHandler(event));

/* DESC: READ FILE FOR MASIVE #CHATS | AUTHOR: Rolando | TYPE: ON WRITE */
exports.onCreateChatBatch = onDocumentCreated({
    memory: "1GiB",
    timeoutSeconds: 540,
    document: "chats-batch/{id}"
}, async (event) => await readFileHandler(event));

/* DESC: PAGINATION UPDATE SECTION IN MASIVE #CHATS | AUTHOR: Rolando | TYPE: ON WRITE */
exports.onUpdateChatBatchItem = onDocumentUpdated({
    memory: "1GiB",
    timeoutSeconds: 540,
    document: "chats-batch/{id_batch}/sections/{id}"
}, async (event) => await sectionsHandler(event));

/* functions SCHEDULED */

/* DESC: EXPORT TO ZOHO (DAILY) | AUTHOR: Rolando | TYPE: SCHEDULED */
exports.zohoExportScheduled = onSchedule({
    schedule: "0 */12 * * *",
    timeZone: "America/Mexico_City",
    memory: "1GiB",
    timeoutSeconds: 540,
    retryCount: 3,
}, async (event) => await zoho_onSchedule(event));


/** ONLY TEST */

exports.senmails = onRequest(runtimeOpts, async (req, res) => {

    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Content-Type", "application/json");

    if (req.method === "OPTIONS") {
        return res.status(204).send("");
    }

    if (req.method !== "POST") {
        return res.status(405).json({ code: 405, message: `${req.method} Method Not Allowed` });
    }

    try {
        const body = req.body;
        const response = await sendEmail(body);
        return res.status(200).json({ status: "success", ...response });
    } catch (error) {
        return res.status(500).json(error);
    }
});