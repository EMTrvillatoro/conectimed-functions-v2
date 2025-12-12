const functions = require("firebase-functions/v2");
const { logger } = require("firebase-functions");
const { HttpsError } = functions.https;

const { getSpecialty, getFBAdminInstance, arraySearch } = require("../Tools");

async function updateSearchArrayCallable(request) {

    const body = request.data;

    logger.info("Ejecutando Actualizacion de Array de Búsqueda", {
        hasAuth: !!request.auth,
        recipientLength: body?.recipient?.length ?? 0,
    });

    // ✔ Validar autenticación
    if (!request.auth || !request.auth.uid) {
        throw new HttpsError(
            "unauthenticated",
            "La función debe ser llamada por un usuario autenticado."
        );
    }

    // ✔ Validaciones de parámetros
    if (!body.user_id) {
        throw new HttpsError(
            "invalid-argument",
            "El campo 'user_id' es requerido para la actualización."
        );
    }

    try {
        await updateUserSearch(body.user_id);
        logger.info(`Usuario actualizado correctamente a ${body.user_id}`);

        return {
            success: true,
            message: `Usuario actualizado correctamente a ${body.user_id}`,
        };



    } catch (err) {
        logger.error("Error al actualizar usuario", err);

        throw new HttpsError(
            "internal",
            "No se pudo actualizar usuario. Revise los datos o intente más tarde."
        );
    }
}


async function updateUserSearch(uid) {
    const admin = getFBAdminInstance();
    const db = admin.firestore();

    try {
        const userData = await db.doc(`users/${uid}`).get();
        let search = [];
        if (userData.get('type') === 'medico') {
            const data = await db.doc(`medico-meta/${uid}`).get();
            if (data.exists === true) {
                const user = data.data();
                const metaData = {
                    state1: '',
                    state2: '',
                    specialty1: '',
                    specialty2: ''
                };
                if (user && user.address1 && user.address1.state && user.address1.state !== '') {
                    metaData.state1 = user.address1.state;
                }
                if (user && user.address2 && user.address2.state && user.address2.state !== '') {
                    metaData.state2 = user.address2.state;
                }
                if (user && user.specialty1) {
                    const num = Number(user.specialty1.id);
                    if (num > 0) {
                        const response = getSpecialty(num);

                        if (response && response.name) {
                            metaData.specialty1 = response.name;
                        } else {
                            metaData.specialty1 = '';
                        }
                    }
                }
                if (user && user.specialty2) {
                    const num = Number(user.specialty2.id);
                    if (num > 0) {
                        const response = getSpecialty(num);
                        if (response && response.name) {
                            metaData.specialty2 = response.name;
                        } else {
                            metaData.specialty2 = '';
                        }
                    }
                }
                for (let element of Object.values(metaData)) {
                    if (element && element !== '') {
                        const _search = arraySearch(element) || [];
                        search = search.concat(_search);
                    }
                }
            }
        } else if (userData.get('type') === 'profesional-de-la-salud') {
            const data = await db.doc(`profesional-de-la-salud-meta/${uid}`).get();
            if (data.exists === true) {
                const user = data.data();
                const metaData = {
                    state1: '',
                    state2: '',
                    specialty1: '',
                    specialty2: '',
                    healthProfessionalType: '',
                };
                if (user && user.address1 && user.address1.state && user.address1.state !== '') {
                    metaData.state1 = user.address1.state;
                }
                if (user && user.address2 && user.address2.state && user.address2.state !== '') {
                    metaData.state2 = user.address2.state;
                }
                if (user && user.healthProfessionalType && user.healthProfessionalType.id) {
                    const respHpt = await db.collection('types-of-health-professionals').doc(user.healthProfessionalType.id).get();
                    metaData.healthProfessionalType = respHpt.get('name') || '';
                }
                for (let element of Object.values(metaData)) {
                    if (element && element !== '') {
                        const _search = arraySearch(element) || [];
                        search = search.concat(_search);
                    }
                }
            }
        } else if (userData.get('type') === 'representante-medico') {
            const data = await db.doc(`representante-meta/${uid}`).get();
            if (data.exists === true) {
                if (data.get('company')) {
                    const company = await data.get('company').get();
                    const name = company.get('name') ? company.get('name') : '';
                    if (name && name !== '') {
                        const _search = arraySearch(name) || [];
                        search = search.concat(_search);
                    }
                }
            }
        }
        let name = '';
        let lastName1 = '';
        let lastName2 = '';
        let email = '';

        if (userData && userData.get('name')) {
            name = userData.get('name');
        }

        if (userData && userData.get('lastName1')) {
            lastName1 = userData.get('lastName1');
        }

        if (userData && userData.get('lastName2')) {
            lastName2 = userData.get('lastName2');
        }

        if (userData && userData.get('email')) {
            email = String(userData.get('email'))
                .toLocaleLowerCase()
                .trim();
        }

        const _search = arraySearch(`${name} ${lastName1} ${lastName2} ${lastName1} ${lastName2} ${name}`);

        search = search.concat(_search);
        await db.doc(`users/${uid}`).update({ search: search, email: email/*, validatedStatus: 'pending'*/ });
        return;
    } catch (error) {
        console.error(error);
        return;
    }
}

module.exports = { updateSearchArrayCallable };