const { defineSecret } = require('firebase-functions/params');
const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');
const Stripe = require("stripe");

/**
 * 
 * @param { import('express').Request } req 
 * @param { import('express').Response } res 
 * @returns 
 */

async function stripeCustomerCreateHandler(req, res) {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Content-Type", "application/json");

    const { email, name, uid } = req.body;

    if (req.method === "OPTIONS") {
        return res.status(204).send("");
    }

    if (req.method !== "POST") {
        return res.status(405).json({ code: 405, message: `${req.method} Method Not Allowed` });
    }

    if (!email || !name) {
        return res.status(400).json({ error: "Faltan parámetros requeridos" });
    }

    try {
        // Crear la sesión de pago en Stripe
        const stripe = Stripe(stripeSecretKey.value(), { apiVersion: '2024-04-10' });
        const { id } = await stripe.customers.create({
            email: email,
            name: name,
            metadata: {
                uid: uid
            },
        });
        return res.status(200).json({
            customerId: id,
            env: stripeSecretKey.value().substring(0, 7)
        });
    } catch (error) {
        return res.status(500).json(error);
    }
}

/**
 * 
 * @param { import('express').Request } req 
 * @param { import('express').Response } res 
 * @returns 
 */

async function stripeCustomerUpdateHandler(req, res) {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Content-Type", "application/json");

    const { customerId, data } = req.body;

    if (req.method === "OPTIONS") {
        return res.status(204).send("");
    }

    if (req.method !== "POST") {
        return res.status(405).json({ code: 405, message: `${req.method} Method Not Allowed` });
    }

    if (!customerId) {
        return res.status(400).json({ error: "Faltan parámetros requeridos" });
    }

    try {
        // Crear la sesión de pago en Stripe
        const stripe = Stripe(stripeSecretKey.value(), { apiVersion: '2024-04-10' });
        const { id } = await stripe.customers.update(
            customerId,
            {
                email: data.email,
                name: data.name,
                metadata: {
                    uid: data.uid
                },
            });
        return res.status(200).json({
            customerId: id,
            env: stripeSecretKey.value().substring(0, 7)
        });
    } catch (error) {
        return res.status(500).json(error);
    }
}

/**
 * 
 * @param { import('express').Request } req 
 * @param { import('express').Response } res 
 * @returns 
 */

async function stripeCustomerRetrieveHandler(req, res) {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Content-Type", "application/json");

    const { customerId } = req.body;

    if (req.method === "OPTIONS") {
        return res.status(204).send("");
    }

    if (req.method !== "POST") {
        return res.status(405).json({ code: 405, message: `${req.method} Method Not Allowed` });
    }

    if (!customerId) {
        return res.status(400).json({ error: "Faltan parámetros requeridos" });
    }

    try {
        // Crear la sesión de pago en Stripe
        const stripe = Stripe(stripeSecretKey.value(), { apiVersion: '2024-04-10' });
        const { id } = await stripe.customers.retrieve(customerId);
        return res.status(200).json({
            customerId: id,
            env: stripeSecretKey.value().substring(0, 7)
        });
    } catch (error) {
        return res.status(500).json(error);
    }
}

/**
 * 
 * @param { import('express').Request } req 
 * @param { import('express').Response } res 
 * @returns 
 */

async function stripeCustomerDeleteHandler(req, res) {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Content-Type", "application/json");

    const { customerId } = req.body;

    if (req.method === "OPTIONS") {
        return res.status(204).send("");
    }

    if (req.method !== "POST") {
        return res.status(405).json({ code: 405, message: `${req.method} Method Not Allowed` });
    }

    if (!customerId) {
        return res.status(400).json({ error: "Faltan parámetros requeridos" });
    }

    try {
        // Crear la sesión de pago en Stripe
        const stripe = Stripe(stripeSecretKey.value(), { apiVersion: '2024-04-10' });
        await stripe.customers.del(customerId);
        return res.status(200).json({
            deleted: "ok",
            env: stripeSecretKey.value().substring(0, 7)
        });
    } catch (error) {
        return res.status(500).json(error);
    }
}

/**
 * 
 * @param { import('express').Request } req 
 * @param { import('express').Response } res 
 * @returns 
 */

async function stripePaymentIntentHandler(req, res) {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Content-Type", "application/json");

    const { currency, amount, customerId } = req.body;

    if (req.method === "OPTIONS") {
        return res.status(204).send("");
    }

    if (req.method !== "POST") {
        return res.status(405).json({ code: 405, message: `${req.method} Method Not Allowed` });
    }

    if (!amount) {
        return res.status(400).json({ error: "Faltan parámetros requeridos" });
    }

    try {
        // Crear la sesión de pago en Stripe
        const stripe = Stripe(stripeSecretKey.value(), { apiVersion: '2024-04-10' });
        const { id, client_secret } = await stripe.paymentIntents.create({
            amount: amount * 100,  // El monto en centavos
            currency: currency || 'usd', // Moneda, ajusta según corresponda,
            customer: customerId
        });
        return res.status(200).json({
            clientSecret: client_secret,
            paymentIntentId: id,
            env: stripeSecretKey.value().substring(0, 7)
        });
    } catch (error) {
        return res.status(500).json(error);
    }
}

/**
 * 
 * @param { import('express').Request } req 
 * @param { import('express').Response } res 
 * @returns 
 */

async function stripePaymentIntentUpdateHandler(req, res) {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Content-Type", "application/json");

    const { currency, amount, paymentIntentId } = req.body;

    if (req.method === "OPTIONS") {
        return res.status(204).send("");
    }

    if (req.method !== "POST") {
        return res.status(405).json({ code: 405, message: `${req.method} Method Not Allowed` });
    }

    if (!amount || !paymentIntentId) {
        return res.status(400).json({ error: "Faltan parámetros requeridos" });
    }

    try {
        // Crear la sesión de pago en Stripe
        const stripe = Stripe(stripeSecretKey.value(), { apiVersion: '2024-04-10' });
        const { client_secret } = await stripe.paymentIntents.update(paymentIntentId,
            {
                amount: amount * 100,
                currency
            });
        return res.status(200).json({
            clientSecret: client_secret,
            env: stripeSecretKey.value().substring(0, 7)
        });
    } catch (error) {
        return res.status(500).json(error);
    }
}

module.exports = {
    stripeCustomerCreateHandler,
    stripeCustomerUpdateHandler,
    stripeCustomerRetrieveHandler,
    stripeCustomerDeleteHandler,
    stripePaymentIntentHandler,
    stripePaymentIntentUpdateHandler
};