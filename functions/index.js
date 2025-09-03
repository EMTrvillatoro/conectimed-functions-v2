const { onRequest, onCall } = require("firebase-functions/v2/https");
// files
const { runtimeOpts } = require('./assets/js/Tools');
const { stripeCustomerCreateHandler, stripeCustomerDeleteHandler, stripeCustomerRetrieveHandler, stripeCustomerUpdateHandler, stripePaymentIntentHandler, stripePaymentIntentUpdateHandler } = require('./assets/js/stripe/stripe');
const { infoDBFHandler } = require('./assets/js/experimental/experimental');
const { getValidatedUsersHandler, getAllAuthUsersHandler } = require('./assets/js/members/createusers');
const { clickMeetingHandler } = require('./assets/js/click-meeting/click-meeting');
const { registerHandler } = require('./assets/js/user/register');
const { generatePDFHandler } = require('./assets/js/pdf/pdf');
const { generateHtmlCertificateHandler } = require('./assets/js/pdf/html');
const { sendMailHandler } = require('./assets/js/utils/sendMail');
const { getSpecialties } = require('./assets/js/specialties/specialties');

/* functions HTTP REQUEST */

/* DESC: STRIPE | AUTHOR: Rolando | TYPE: HTTP REQUEST */ exports.infoDBF = onRequest(runtimeOpts, async (req, res) => await infoDBFHandler(req, res));
/* DESC: STRIPE | AUTHOR: Rolando | TYPE: HTTP REQUEST */ exports.stripe_customer_create = onRequest(async (req, res) => await stripeCustomerCreateHandler(req, res));
/* DESC: STRIPE | AUTHOR: Rolando | TYPE: HTTP REQUEST */ exports.stripe_customer_update = onRequest(runtimeOpts, async (req, res) => await stripeCustomerUpdateHandler(req, res));
/* DESC: STRIPE | AUTHOR: Rolando | TYPE: HTTP REQUEST */ exports.stripe_customer_retrieve = onRequest(runtimeOpts, async (req, res) => await stripeCustomerRetrieveHandler(req, res));
/* DESC: STRIPE | AUTHOR: Rolando | TYPE: HTTP REQUEST */ exports.stripe_customer_delete = onRequest(runtimeOpts, async (req, res) => await stripeCustomerDeleteHandler(req, res));
/* DESC: STRIPE | AUTHOR: Rolando | TYPE: HTTP REQUEST */ exports.stripe_payment_intent = onRequest(runtimeOpts, async (req, res) => await stripePaymentIntentHandler(req, res));
/* DESC: STRIPE | AUTHOR: Rolando | TYPE: HTTP REQUEST */ exports.stripe_payment_intent_update = onRequest(runtimeOpts, async (req, res) => await stripePaymentIntentUpdateHandler(req, res));
/* DESC: GET URL FROM CLICK MEETING | AUTHOR: Rolando | TYPE: HTTP REQUEST */ exports.clickMeeting = onRequest(async (req, res) => await clickMeetingHandler(req, res));
/* DESC: GET VALIDATED USERS | AUTHOR: Rolando | TYPE: HTTP REQUEST */ exports.getValidatedUsers = onRequest(runtimeOpts, async (req, res) => await getValidatedUsersHandler(req, res));
/* DESC: USER APP REGISTRATION | AUTHOR: Rolando | TYPE: HTTP REQUEST */ exports.userAppRegister = onRequest(runtimeOpts, async (req, res) => await registerHandler(req, res));
/* DESC: GET ALL AUTH USERS | AUTHOR: Miguel | TYPE: HTTP REQUEST */ exports.getAllAuthUsers = onRequest(runtimeOpts, async (req, res) => await getAllAuthUsersHandler(req, res));
/* DESC: GEN HTML CERT | AUTHOR: Miguel | TYPE: HTTP REQUEST */ exports.generateHtmlCertificate = onRequest(runtimeOpts, async (req, res) => await generateHtmlCertificateHandler(req, res));
/* DESC: GEN PDF FILE | AUTHOR: Miguel | TYPE: HTTP REQUEST */ exports.generatePDF = onRequest(runtimeOpts, async (req, res) => await generatePDFHandler(req, res));
/* DESC: GET ALL SPECIALTIES | AUTHOR: Rolando | TYPE: HTTP REQUEST */ exports.getSpecialties = onRequest(runtimeOpts, async (req, res) => await getSpecialties(req, res));

/* functions CALLABLES */

/* DESC: SEND MAIL | AUTHOR: Miguel | TYPE: CALLABLE */exports.sendMail = onCall(async (data, context) => await sendMailHandler(data, context));