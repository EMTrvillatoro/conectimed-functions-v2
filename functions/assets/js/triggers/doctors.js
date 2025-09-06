const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp();
    const settings = { timestampsInSnapshots: true };
    admin.firestore().settings(settings);
}

const db = admin.firestore();

async function onWriteDoctorsHandler(change, context) {
    try {
        /*console.log('change =====>' + JSON.stringify(change));
      console.log('context =====>' + JSON.stringify(context));*/

        // Get an object with the current document value.
        // If the document does not exist, it has been deleted.
        const document = change.after.exists ? change.after.data() : null;

        // Get an object with the previous document value (for update or delete)
        const oldDocument = change.before.exists ? change.before.data() : null;

        if (!oldDocument) {
            // new doctor
            console.log('new');
            // get address1 state
            if (document.address1 && document.address1.state) {
                // search state
                const queryState = await db
                    .collection('states-in-use')
                    .where('name', '==', document.address1.state)
                    .get();

                await increaseItem(queryState, document.address1.state, 'states-in-use');
            }
            // get address2 state
            if (document.address2 && document.address2.state) {
                // search state
                const queryState = await db
                    .collection('states-in-use')
                    .where('name', '==', document.address2.state)
                    .get();

                await increaseItem(queryState, document.address2.state, 'states-in-use');
            }

            // get specialty1
            if (document.specialty1 && document.specialty1.id) {
                // search specialty
                const queryState = await db
                    .collection('specialties-in-use')
                    .where('id', '==', Number(document.specialty1.id))
                    .get();

                await increaseItem(queryState, document.specialty1.id, 'specialties-in-use');
            }
            // get specialty2
            if (document.specialty2 && document.specialty2.id) {
                // search specialty
                const queryState = await db
                    .collection('specialties-in-use')
                    .where('id', '==', Number(document.specialty2.id))
                    .get();

                await increaseItem(queryState, document.specialty2.id, 'specialties-in-use');
            }
            // get specialty3
            if (document.specialty3 && document.specialty3.id) {
                // search specialty
                const queryState = await db
                    .collection('specialties-in-use')
                    .where('id', '==', Number(document.specialty3.id))
                    .get();

                await increaseItem(queryState, document.specialty3.id, 'specialties-in-use');
            }
            // get specialty4
            if (document.specialty4 && document.specialty4.id) {
                // search specialty
                const queryState = await db
                    .collection('specialties-in-use')
                    .where('id', '==', Number(document.specialty4.id))
                    .get();

                await increaseItem(queryState, document.specialty4.id, 'specialties-in-use');
            }
            // get specialty5
            if (document.specialty5 && document.specialty5.id) {
                // search specialty
                const queryState = await db
                    .collection('specialties-in-use')
                    .where('id', '==', Number(document.specialty5.id))
                    .get();

                await increaseItem(queryState, document.specialty5.id, 'specialties-in-use');
            }

            // create meta-data
            await createMetaData(document, change.after.id);
        } else if (!document) {
            console.log('delete');
            // get address1 state
            if (oldDocument.address1 && oldDocument.address1.state) {
                // search state
                const queryState = await db
                    .collection('states-in-use')
                    .where('name', '==', oldDocument.address1.state)
                    .get();

                await decreaseItem(queryState, 'states-in-use');
            }
            // get address2 state
            if (oldDocument.address2 && oldDocument.address2.state) {
                // search state
                const queryState = await db
                    .collection('states-in-use')
                    .where('name', '==', oldDocument.address2.state)
                    .get();

                await decreaseItem(queryState, 'states-in-use');
            }

            // get specialty1
            if (oldDocument.specialty1 && oldDocument.specialty1.id) {
                const queryState = await db
                    .collection('specialties-in-use')
                    .where('id', '==', Number(oldDocument.specialty1.id))
                    .get();

                await decreaseItem(queryState, 'specialties-in-use');
            }
            // get specialty2
            if (oldDocument.specialty2 && oldDocument.specialty2.id) {
                const queryState = await db
                    .collection('specialties-in-use')
                    .where('id', '==', Number(oldDocument.specialty2.id))
                    .get();

                await decreaseItem(queryState, 'specialties-in-use');
            }
            // get specialty3
            if (oldDocument.specialty3 && oldDocument.specialty3.id) {
                const queryState = await db
                    .collection('specialties-in-use')
                    .where('id', '==', Number(oldDocument.specialty3.id))
                    .get();

                await decreaseItem(queryState, 'specialties-in-use');
            }
            // get specialty4
            if (oldDocument.specialty4 && oldDocument.specialty4.id) {
                const queryState = await db
                    .collection('specialties-in-use')
                    .where('id', '==', Number(oldDocument.specialty4.id))
                    .get();

                await decreaseItem(queryState, 'specialties-in-use');
            }
            // get specialty5
            if (oldDocument.specialty5 && oldDocument.specialty5.id) {
                const queryState = await db
                    .collection('specialties-in-use')
                    .where('id', '==', Number(oldDocument.specialty5.id))
                    .get();

                await decreaseItem(queryState, 'specialties-in-use');
            }
        } else if (oldDocument) {
            console.log('change');
            //address1 is new
            if (!oldDocument.address1 && document.address1 && document.address1.state) {
                console.log('address1 is new');
                const queryStateNew = await db
                    .collection('states-in-use')
                    .where('name', '==', document.address1.state)
                    .get();
                // increase new
                await increaseItem(queryStateNew, document.address1.state, 'states-in-use');
            }
            // address1 already exists
            if (oldDocument.address1 && document.address1 && oldDocument.address1.state && document.address1.state) {
                // make change if they are different
                if (oldDocument.address1.state !== document.address1.state) {
                    console.log('address1 already exists-make change if they are different');
                    // search states
                    const queryStateOld = await db
                        .collection('states-in-use')
                        .where('name', '==', oldDocument.address1.state)
                        .get();
                    const queryStateNew = await db
                        .collection('states-in-use')
                        .where('name', '==', document.address1.state)
                        .get();

                    // decrease old
                    await decreaseItem(queryStateOld, 'states-in-use');
                    // increase new
                    await increaseItem(queryStateNew, document.address1.state, 'states-in-use');
                }
            }
            // if address2 already exists
            if (oldDocument.address2 && document.address2 && oldDocument.address2.state && document.address2.state) {
                // make change if they are different
                if (oldDocument.address2.state !== document.address2.state) {
                    console.log('address2 already exists-make change if they are different');
                    const queryStateOld = await db
                        .collection('states-in-use')
                        .where('name', '==', oldDocument.address2.state)
                        .get();
                    // decrease old
                    await decreaseItem(queryStateOld, 'states-in-use');
                    if (document.address2.state !== document.address1.state) {
                        console.log('address2 already exists-make change if they are different && different from address1.state');
                        // search states
                        const queryStateNew = await db
                            .collection('states-in-use')
                            .where('name', '==', document.address2.state)
                            .get();
                        // increase new
                        await increaseItem(queryStateNew, document.address2.state, 'states-in-use');
                    }
                }
            }
            // if address2 is new
            if (!oldDocument.address2 && document.address2 && document.address2.state) {
                console.log('if address2 is new');
                if (document.address2.state !== document.address1.state) {
                    console.log('if address2 is new && different from address1.state');
                    const queryStateNew = await db
                        .collection('states-in-use')
                        .where('name', '==', document.address2.state)
                        .get();
                    // increase new
                    await increaseItem(queryStateNew, document.address2.state, 'states-in-use');
                }
            }
            // if address2 is gone
            if (oldDocument.address2 && !document.address2 && oldDocument.address2.state) {
                console.log('if address2 is gone');
                if (oldDocument.address2.state !== document.address1.state) {
                    console.log('if address2 is gone && different from current address1.state');
                    // decrease old
                    const queryStateOld = await db
                        .collection('states-in-use')
                        .where('name', '==', oldDocument.address2.state)
                        .get();
                    await decreaseItem(queryStateOld, 'states-in-use');
                }
            }

            // if specialty1 is new
            if (!oldDocument.specialty1 && document.specialty1 && document.specialty1.id) {
                console.log('if specialty1 is new');
                const queryStateNew = await db
                    .collection('specialties-in-use')
                    .where('id', '==', Number(document.specialty1.id))
                    .get();
                // increase new
                await increaseItem(queryStateNew, document.specialty1.id, 'specialties-in-use');
            }
            // specialty1 already exists
            if (oldDocument.specialty1 && document.specialty1 && oldDocument.specialty1.id && document.specialty1.id) {
                // make change if they are different
                if (oldDocument.specialty1.id !== document.specialty1.id) {
                    console.log('specialty1 already exists-make change if they are different');
                    // search id
                    const queryStateOld = await db
                        .collection('specialties-in-use')
                        .where('id', '==', Number(oldDocument.specialty1.id))
                        .get();
                    const queryStateNew = await db
                        .collection('specialties-in-use')
                        .where('id', '==', Number(document.specialty1.id))
                        .get();

                    // decrease old
                    await decreaseItem(queryStateOld, 'specialties-in-use');
                    // increase new
                    await increaseItem(queryStateNew, document.specialty1.id, 'specialties-in-use');
                }
            }
            // if specialty2 already exists
            if (oldDocument.specialty2 && document.specialty2 && oldDocument.specialty2.id && document.specialty2.id) {
                // make change if they are different
                if (oldDocument.specialty2.id !== document.specialty2.id) {
                    console.log('specialty2 already exists-make change if they are different');
                    // search states
                    const queryStateOld = await db
                        .collection('specialties-in-use')
                        .where('id', '==', Number(oldDocument.specialty2.id))
                        .get();
                    const queryStateNew = await db
                        .collection('specialties-in-use')
                        .where('id', '==', Number(document.specialty2.id))
                        .get();

                    // decrease old
                    await decreaseItem(queryStateOld, 'specialties-in-use');
                    // increase new
                    await increaseItem(queryStateNew, document.specialty2.id, 'specialties-in-use');
                }
            }
            // if specialty2 is new
            if (!oldDocument.specialty2 && document.specialty2 && document.specialty2.id) {
                console.log('if specialty2 is new');
                const queryStateNew = await db
                    .collection('specialties-in-use')
                    .where('id', '==', Number(document.specialty2.id))
                    .get();
                // increase new
                await increaseItem(queryStateNew, document.specialty2.id, 'specialties-in-use');
            }
            // if specialty2 is gone
            if (oldDocument.specialty2 && !document.specialty2 && oldDocument.specialty2.id) {
                console.log('if specialty2 is gone');
                const queryStateOld = await db
                    .collection('specialties-in-use')
                    .where('id', '==', Number(oldDocument.specialty2.id))
                    .get();
                // decrease old
                await decreaseItem(queryStateOld, 'specialties-in-use');
            }

            // if specialty3 is new
            if (!oldDocument.specialty3 && document.specialty3 && document.specialty3.id) {
                console.log('if specialty3 is new');
                const queryStateNew = await db
                    .collection('specialties-in-use')
                    .where('id', '==', Number(document.specialty3.id))
                    .get();
                // increase new
                await increaseItem(queryStateNew, document.specialty3.id, 'specialties-in-use');
            }
            // specialty3 already exists
            if (oldDocument.specialty3 && document.specialty3 && oldDocument.specialty3.id && document.specialty3.id) {
                // make change if they are different
                if (oldDocument.specialty3.id !== document.specialty3.id) {
                    console.log('specialty3 already exists-make change if they are different');
                    // search id
                    const queryStateOld = await db
                        .collection('specialties-in-use')
                        .where('id', '==', Number(oldDocument.specialty3.id))
                        .get();
                    const queryStateNew = await db
                        .collection('specialties-in-use')
                        .where('id', '==', Number(document.specialty3.id))
                        .get();

                    // decrease old
                    await decreaseItem(queryStateOld, 'specialties-in-use');
                    // increase new
                    await increaseItem(queryStateNew, document.specialty3.id, 'specialties-in-use');
                }
            }
            // if specialty3 is gone
            if (oldDocument.specialty3 && !document.specialty3 && oldDocument.specialty3.id) {
                console.log('if specialty3 is gone');
                const queryStateOld = await db
                    .collection('specialties-in-use')
                    .where('id', '==', Number(oldDocument.specialty3.id))
                    .get();
                // decrease old
                await decreaseItem(queryStateOld, 'specialties-in-use');
            }

            // if specialty4 is new
            if (!oldDocument.specialty4 && document.specialty4 && document.specialty4.id) {
                console.log('if specialty4 is new');
                const queryStateNew = await db
                    .collection('specialties-in-use')
                    .where('id', '==', Number(document.specialty4.id))
                    .get();
                // increase new
                await increaseItem(queryStateNew, document.specialty4.id, 'specialties-in-use');
            }
            // specialty4 already exists
            if (oldDocument.specialty4 && document.specialty4 && oldDocument.specialty4.id && document.specialty4.id) {
                // make change if they are different
                if (oldDocument.specialty4.id !== document.specialty4.id) {
                    console.log('specialty4 already exists-make change if they are different');
                    // search id
                    const queryStateOld = await db
                        .collection('specialties-in-use')
                        .where('id', '==', Number(oldDocument.specialty4.id))
                        .get();
                    const queryStateNew = await db
                        .collection('specialties-in-use')
                        .where('id', '==', Number(document.specialty4.id))
                        .get();

                    // decrease old
                    await decreaseItem(queryStateOld, 'specialties-in-use');
                    // increase new
                    await increaseItem(queryStateNew, document.specialty4.id, 'specialties-in-use');
                }
            }
            // if specialty4 is gone
            if (oldDocument.specialty4 && !document.specialty4 && oldDocument.specialty4.id) {
                console.log('if specialty4 is gone');
                const queryStateOld = await db
                    .collection('specialties-in-use')
                    .where('id', '==', Number(oldDocument.specialty4.id))
                    .get();
                // decrease old
                await decreaseItem(queryStateOld, 'specialties-in-use');
            }

            // if specialty5 is new
            if (!oldDocument.specialty5 && document.specialty5 && document.specialty5.id) {
                console.log('if specialty5 is new');
                const queryStateNew = await db
                    .collection('specialties-in-use')
                    .where('id', '==', Number(document.specialty5.id))
                    .get();
                // increase new
                await increaseItem(queryStateNew, document.specialty5.id, 'specialties-in-use');
            }
            // specialty5 already exists
            if (oldDocument.specialty5 && document.specialty5 && oldDocument.specialty5.id && document.specialty5.id) {
                // make change if they are different
                if (oldDocument.specialty5.id !== document.specialty5.id) {
                    console.log('specialty5 already exists-make change if they are different');
                    // search id
                    const queryStateOld = await db
                        .collection('specialties-in-use')
                        .where('id', '==', Number(oldDocument.specialty5.id))
                        .get();
                    const queryStateNew = await db
                        .collection('specialties-in-use')
                        .where('id', '==', Number(document.specialty5.id))
                        .get();

                    // decrease old
                    await decreaseItem(queryStateOld, 'specialties-in-use');
                    // increase new
                    await increaseItem(queryStateNew, document.specialty5.id, 'specialties-in-use');
                }
            }
            // if specialty5 is gone
            if (oldDocument.specialty5 && !document.specialty5 && oldDocument.specialty5.id) {
                console.log('if specialty5 is gone');
                const queryStateOld = await db
                    .collection('specialties-in-use')
                    .where('id', '==', Number(oldDocument.specialty5.id))
                    .get();
                // decrease old
                await decreaseItem(queryStateOld, 'specialties-in-use');
            }

            // create meta-data
            return await createMetaData(document, change.after.id);
        }
    } catch (error) {
        console.log(error);
        return error;
    } finally {
        if (admin && admin.apps && admin.apps.length) {
            admin.database().goOffline();
        }
    }
    return true;
};

async function decreaseItem(queryState, collect) {
    queryState.forEach(async stateDoc => {
        console.log('decrease =======>', JSON.stringify(stateDoc.data(), collect));
        const key = stateDoc.id;
        let count = stateDoc.data().count - 1;

        if (count > 0) {
            // decrease counter
            console.log('decrease =======>', JSON.stringify(key, collect));
            await db
                .collection(collect)
                .doc(key)
                .update({ count: count });
        } else {
            // delete node
            console.log('delete =======>', JSON.stringify(key, collect));
            await db
                .collection(collect)
                .doc(key)
                .delete();
        }
    });
}

async function increaseItem(queryState, nameState, collect) {
    if (queryState.size === 1) {
        queryState.forEach(async stateDoc => {
            console.log('increase =======>', JSON.stringify(stateDoc.data(), nameState, collect));
            const key = stateDoc.id;
            let count = stateDoc.data().count + 1;
            // increase counter
            await db
                .collection(collect)
                .doc(key)
                .update({ count: count });
        });
    } else if (queryState.size > 1) {
        // remove one
        let counter = 0;
        let key = '';
        let first = {};

        for (const stateDoc of queryState.docs) {
            if (counter === 0) {
                key = stateDoc.id;
                let count = stateDoc.data().count + 1;
                first = stateDoc.data();
                first.count = count;
                // increase counter
                console.log('increase =======>', JSON.stringify(key, nameState, collect));
                await db
                    .collection(collect)
                    .doc(key)
                    .update({ count: count });
            } else {
                let count = stateDoc.data().count;
                first.count += count;
                // update first
                console.log('update =======>', JSON.stringify(key, nameState, collect));
                await db
                    .collection(collect)
                    .doc(key)
                    .update({ count: first.count });
                //delete other
                console.log('delete =======>', JSON.stringify(stateDoc.id, nameState, collect));
                await db
                    .collection(collect)
                    .doc(stateDoc.id)
                    .delete();
            }
            counter++;
        }
    } else {
        // create new document
        let stateIn = {
            count: 1
        };
        if (collect === 'states-in-use') {
            stateIn.name = nameState;
        } else {
            stateIn.id = Number(nameState);
        }
        console.log('create =======>', JSON.stringify(nameState, collect));
        await db.collection(collect).add(stateIn);
    }
}

async function createMetaData(document, key) {
    const unique = (value, index, self) => {
        return self.indexOf(value) === index;
    };
    const user = document;
    let filterMetaData = [];
    let metaData = {
        state1: '',
        state2: '',
        specialty1: '',
        specialty2: '',
        specialty3: '',
        specialty4: '',
        specialty5: ''
    };
    if (user && user.address1 && user.address1.state && user.address1.state !== '') {
        filterMetaData.push(user.address1.state);
        metaData.state1 = user.address1.state;
    }
    if (user && user.address2 && user.address2.state && user.address2.state !== '') {
        filterMetaData.push(user.address2.state);
        metaData.state2 = user.address2.state;
    }
    if (user && user.specialty1) {
        const num = Number(user.specialty1.id);
        if (num > 0) {
            filterMetaData.push(String(num));
            metaData.specialty1 = String(num);
        }
    }
    if (user && user.specialty2) {
        const num = Number(user.specialty2.id);
        if (num > 0) {
            filterMetaData.push(String(num));
            metaData.specialty2 = String(num);
        }
    }
    if (user && user.specialty3) {
        const num = Number(user.specialty3.id);
        if (num > 0) {
            filterMetaData.push(String(num));
            metaData.specialty3 = String(num);
        }
    }
    if (user && user.specialty4) {
        const num = Number(user.specialty4.id);
        if (num > 0) {
            filterMetaData.push(String(num));
            metaData.specialty4 = String(num);
        }
    }
    if (user && user.specialty5) {
        const num = Number(user.specialty5.id);
        if (num > 0) {
            filterMetaData.push(String(num));
            metaData.specialty5 = String(num);
        }
    }
    filterMetaData.push(String(metaData.state1) + metaData.specialty1);
    filterMetaData.push(String(metaData.state1) + metaData.specialty2);
    filterMetaData.push(String(metaData.state1) + metaData.specialty3);
    filterMetaData.push(String(metaData.state1) + metaData.specialty4);
    filterMetaData.push(String(metaData.state1) + metaData.specialty5);
    filterMetaData.push(String(metaData.state2) + metaData.specialty1);
    filterMetaData.push(String(metaData.state2) + metaData.specialty2);
    filterMetaData.push(String(metaData.state2) + metaData.specialty3);
    filterMetaData.push(String(metaData.state2) + metaData.specialty4);
    filterMetaData.push(String(metaData.state2) + metaData.specialty5);
    filterMetaData = filterMetaData.filter(unique);

    console.log(JSON.stringify(filterMetaData, key));

    return await db
        .collection('users')
        .doc(key)
        .update({
            'filter-meta-data': filterMetaData
        });
}

module.exports = { onWriteDoctorsHandler };