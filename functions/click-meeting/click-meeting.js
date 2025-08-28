const { defineSecret } = require('firebase-functions/params');
const { getFBAdminInstance, isRateLimited } = require('../Tools');

const clickMeetingApi = defineSecret('CLICK_MEETING_API');
const clickMeetingURLAccount = defineSecret('CLICK_MEETING_URL_ACCOUNT');
const clickMeetingXApiKey = defineSecret('CLICK_MEETING_X_API_KEY');

/**
 * 
 * @param { import('express').Request } req 
 * @param { import('express').Response } res 
 * @returns 
 */

async function clickMeetingHandler(req, res) {
    res.set("Content-Type", "application/json");
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    const admin = getFBAdminInstance();
    const db = admin.firestore();

    const _clickMeetingApi = clickMeetingApi.value();
    const _clickMeetingURLAccount = clickMeetingURLAccount.value();
    const _clickMeetingXApiKey = clickMeetingXApiKey.value();
    let callsToCMApi = 0;

    if (req.method === "OPTIONS") {
        return res.status(204).send("");
    }

    let url_alternative_webinar = _clickMeetingURLAccount;

    try {
        let { room } = req.body;
        room = String(room || "").trim();

        const resp = await db.collection("posts").where("video_url", "==", room).limit(1).get();

        if (!resp.empty) {
            const doc = resp.docs[0];
            if (doc.get("url_alternative_webinar")) {
                url_alternative_webinar = doc.get("url_alternative_webinar");
            }
        }
    } catch (e) {
        console.error("Respuesta inválida del firestore", e);
    }

    const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0] || req.socket.remoteAddress || "unknown";

    if (isRateLimited(ip)) {
        console.warn(`Rate limit excedido para IP: ${ip}`);
        return res.status(200).json({
            message: "Demasiadas solicitudes. Intente más tarde.",
            url: url_alternative_webinar,
            status: "error"
        });
    }

    try {
        let { room, email, nickname, forceUpdate } = req.body;

        room = String(room || "").trim();
        email = String(email || "").trim().toLowerCase();
        forceUpdate = Boolean(forceUpdate) || false;

        if (!room || !email) {
            console.warn("Faltan parámetros requeridos");
            return res.status(200).json({
                message: "Faltan parámetros requeridos",
                url: url_alternative_webinar,
                status: "error"
            });
        }

        const userNickname = nickname || "Usuario de Conectimed";

        let roomInfo;

        const headers = {
            "Content-Type": "application/json",
            "X-Api-Key": _clickMeetingXApiKey
        };

        const firebaseRoom = await db.doc(`clickMeetingRoomInfo/${room}`).get();

        if (firebaseRoom.exists === true && forceUpdate !== true) {
            roomInfo = firebaseRoom.data() || {};
        } else {
            const roomInfoResponse = await fetch(`${_clickMeetingApi}conferences/${room}`, {
                method: "GET",
                headers
            });
            callsToCMApi++;

            let roomInfoText = await roomInfoResponse.text();

            try {
                roomInfo = JSON.parse(roomInfoText)?.conference || {};
                let _data = {
                    autologin_hash: roomInfo?.autologin_hash || "",
                    id: roomInfo?.id || "",
                    name: roomInfo?.name || "",
                    name_url: roomInfo?.name_url || "",
                    room_type: roomInfo?.room_type || "",
                    room_pin: roomInfo?.room_pin || "",
                    status: roomInfo?.status || "",
                    timezone: roomInfo?.timezone || "",
                    // DATE STRING
                    created_at: roomInfo?.created_at || "",
                    updated_at: roomInfo?.updated_at || "",
                    starts_at: roomInfo?.starts_at || "",
                    ends_at: roomInfo?.ends_at || "",
                    // DATE TIMESTAMP
                    _created_at: new Date(roomInfo?.created_at || ""),
                    _updated_at: new Date(roomInfo?.updated_at || ""),
                    _starts_at: new Date(roomInfo?.starts_at || ""),
                    _ends_at: new Date(roomInfo?.ends_at || ""),
                };
                await db.doc(`clickMeetingRoomInfo/${room}`).set(_data);
            } catch (e) {
                console.error("Respuesta inválida del servidor (room info no es JSON)", e);
                return res.status(200).json({
                    message: "Respuesta inválida del servidor (room info no es JSON) ",
                    url: url_alternative_webinar,
                    status: "error"
                });
            }
        }

        if (!roomInfo?.name_url) {
            console.warn("No se encontró la sala o falta name_url");
            return res.status(200).json({
                message: "No se encontró la sala o falta name_url",
                url: url_alternative_webinar,
                status: "error"
            });
        }

        const name_url = roomInfo.name_url;

        const autologinUrl = `${_clickMeetingApi}conferences/${room}/room/autologin_hash?email=${encodeURIComponent(email)}&nickname=${encodeURIComponent(userNickname)}`;
        const autologinResponse = await fetch(autologinUrl, {
            method: "POST",
            headers
        });

        callsToCMApi++;

        console.info("====== Response autologin_hash ======", autologinResponse);

        const autologinText = await autologinResponse.text();

        let autologinData;
        try {
            autologinData = JSON.parse(autologinText);
        } catch (e) {
            console.error("Respuesta inválida del servidor (autologin no es JSON)", e);
            return res.status(200).json({
                message: "Respuesta inválida del servidor (autologin no es JSON)",
                url: url_alternative_webinar,
                status: "error"
            });
        }

        if (!autologinData?.autologin_hash) {
            console.warn("No se pudo obtener autologin_hash");
            return res.status(200).json({
                message: "No se pudo obtener autologin_hash",
                url: url_alternative_webinar,
                status: "error"
            });
        }

        const autologin_hash = autologinData.autologin_hash;
        const finalUrl = `${_clickMeetingURLAccount}${name_url}?l=${autologin_hash}&skipPlatformChoice=1`;

        console.log("*** Correcto ***", JSON.stringify({ finalUrl, room, email, nickname }));

        return res.status(200).json({
            message: "Acceso exitoso",
            url: finalUrl,
            url_alternative: url_alternative_webinar,
            callsToCMApi,
            status: "success"
        });

    } catch (e) {
        console.error("Error en clickMeeting:", e);
        return res.status(200).json({
            message: e.message || "Error desconocido",
            url: url_alternative_webinar,
            status: "error"
        });
    }
}

module.exports = { clickMeetingHandler };