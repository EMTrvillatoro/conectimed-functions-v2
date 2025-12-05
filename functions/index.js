const { onRequest, onCall } = require("firebase-functions/v2/https");
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onDocumentWritten, onDocumentCreated, onDocumentUpdated, onDocumentDeleted } = require("firebase-functions/v2/firestore");
// files
const { runtimeOpts } = require('./assets/js/Tools');
const { stripeCustomerCreateHandler, stripeCustomerDeleteHandler, stripeCustomerRetrieveHandler, stripeCustomerUpdateHandler, stripePaymentIntentHandler, stripePaymentIntentUpdateHandler } = require('./assets/js/stripe/stripe');
const { infoDBFHandler } = require('./assets/js/experimental/experimental');
const { getValidatedUsersHandler, getAllAuthUsersHandler } = require('./assets/js/members/createusers');
const { handler } = require('./assets/js/members/lastForoPost');
const { clickMeetingHandler } = require('./assets/js/click-meeting/click-meeting');
const { registerHandler, updateHandler } = require('./assets/js/user/register');
const { generatePDFHandler } = require('./assets/js/pdf/pdf');
const { generateHtmlCertificateHandler } = require('./assets/js/pdf/html');
const { sendMailHandler } = require('./assets/js/utils/sendMail');
const { sendSmsHandler } = require('./assets/js/utils/sendSms');
const { getSpecialties, getSpecialty } = require('./assets/js/specialties/specialties');
const { handler_onRequest } = require('./assets/js/conectimed_landing/landing');
const { onWriteDoctorsHandler } = require('./assets/js/triggers/doctors');
const { getVirtualSessionsAttendanceConfirmation } = require('./assets/js/testing/testing');
const { handleAssistanceCreated, handleAssistanceUpdated, handleAssistanceDeleted, virtualSessionsAttendanceConfirmationCountFix/*, exportAssistanceToBigQuery */ } = require('./assets/js/triggers/virtualSessions');
const { _onRequest, _onDocumentWritten, _onSchedule, _onRequest_setStatus } = require('./assets/js/zoho/zoho');

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
exports.zohoExportRequest = onRequest(runtimeOpts, async (req, res) => await _onRequest(req, res));

/* DESC: EXPORT TO ZOHO (REQUEST) | AUTHOR: Rolando | TYPE: HTTP REQUEST */
exports.zohoExportmarkAllUsersPendingRequest = onRequest(runtimeOpts, async (req, res) => await _onRequest_setStatus(req, res));

/* DESC: OBTAINING CONFIRMATION OF ATTENDANCE AT VIRTUAL SESSIONS | AUTHOR: Rolando | TYPE: HTTP REQUEST */
exports.getVirtualSessionsAttendanceConfirmation = onRequest(runtimeOpts, async (req, res) => await getVirtualSessionsAttendanceConfirmation(req, res));

/* functions CALLABLES */

/* DESC: SEND MAIL | AUTHOR: Miguel | TYPE: CALLABLE */
exports.sendMail = onCall(runtimeOpts, async (data, context) => await sendMailHandler(data, context));

/* DESC: SEND SMS | AUTHOR: Rolando | TYPE: CALLABLE */
exports.sendSms = onCall(runtimeOpts, async (data, context) => await sendSmsHandler(data, context));

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
}, async (event) => await _onDocumentWritten(event));

/* functions SCHEDULED */

/* DESC: EXPORT TO ZOHO (DAILY) | AUTHOR: Rolando | TYPE: SCHEDULED */
exports.zohoExportScheduled = onSchedule({
    schedule: "0 */12 * * *",
    timeZone: "America/Mexico_City",
    memory: "1GiB",
    timeoutSeconds: 540,
    retryCount: 3,
}, async (event) => await _onSchedule(event));


/** ONLY TEST */