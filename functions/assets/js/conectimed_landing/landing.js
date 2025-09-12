const { defineSecret } = require('firebase-functions/params');
const { getFBAdminInstance } = require('../Tools');
const moment = require('moment');
const appUrlAplicacion = defineSecret('CONFIGAPP_URL');
/**
 * Request Admin Messaging
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns
**/

async function handler_onRequest(req, res) {
    res.header('Content-Type', 'application/json');
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.send('');
    }
    if (req && req.method === 'GET') {
        try {
            const admin = getFBAdminInstance();
            const db = admin.firestore();
            const type = req && req.query && req.query.type ? String(req.query.type) : '';
            const limit = req && req.query && req.query.limit ? String(req.query.limit) : 4;
            let docs = [];
            let route = '';
            switch (type) {
                case 'banners':
                    docs = (await db.collection('banners')
                        .where('status', '==', 'active')
                        .orderBy('order', 'asc')
                        .get()).docs;

                    docs = docs.filter(item => {
                        const todatMillis = moment()
                            .toDate()
                            .valueOf();
                        const slideMillis = moment(item.get('publication_date').toDate()).valueOf();

                        if (todatMillis >= slideMillis) {
                            return true;
                        } else {
                            return false;
                        }
                    });

                    docs = docs.map(e => {
                        const data = e.data();
                        return {
                            // id: e.id,
                            // status: data.status,
                            url: data.valueS,
                            date: moment(data.date.toDate()).format('YYYY-MM-DD'),
                            title: data.title,
                            image: data.image
                        }
                    });
                    break;
                case 'notimed':
                    docs = (await db.collection('posts')
                        .where('category', '==', db.doc('categories_video/50'))
                        .where('status', '==', 'active')
                        .orderBy('publication_date', 'desc')
                        .limit(limit)
                        .get()).docs;
                    route = 'multimedia/videos/notimed';
                    docs = mapPost(docs, route);
                    break;
                case 'courses':
                    docs = (await db.collection('posts')
                        .where('category', '==', db.doc('categories/53'))
                        .where('status', '==', 'active')
                        .orderBy('publication_date', 'desc')
                        .limit(limit)
                        .get()).docs;
                    route = 'multimedia/courses-and-congresses';
                    docs = mapPost(docs, route);
                    break;
                case 'algorithms':
                    docs = (await db.collection('posts')
                        .where('category', '==', db.doc('categories/85'))
                        .where('status', '==', 'active')
                        .orderBy('publication_date', 'desc')
                        .limit(limit)
                        .get()).docs;
                    route = 'multimedia/posts/calculators-and-algorithms';
                    docs = mapPost(docs, route);
                    break;
                case 'webinars':
                    docs = (await db.collection('posts')
                        .where('category', '==', db.doc('categories_video/6748'))
                        .where('status', '==', 'active')
                        .orderBy('publication_date', 'desc')
                        .limit(limit)
                        .get()).docs;
                    route = 'multimedia/videos/webinars';
                    docs = mapPost(docs, route);
                    break;
                case 'articles':
                    docs = (await db.collection('posts')
                        .where('category', '==', db.doc('categories/52'))
                        .where('status', '==', 'active')
                        .orderBy('publication_date', 'desc')
                        .limit(limit)
                        .get()).docs;
                    route = 'multimedia/posts/articles';
                    docs = mapPost(docs, route);
                    break;
                case 'interviews':
                    docs = (await db.collection('posts')
                        .where('category', '==', db.doc('categories_video/6749'))
                        .where('status', '==', 'active')
                        .orderBy('publication_date', 'desc')
                        .limit(limit)
                        .get()).docs;
                    route = 'multimedia/videos/interviews';
                    docs = mapPost(docs, route);
                    break;
                case 'webinars_normal':
                    docs = (await db.collection('posts')
                        .where('category', '==', db.doc('categories/6748'))
                        .where('status', '==', 'active')
                        .where('type', '==', 'post')
                        .orderBy('publication_date', 'desc')
                        .get()).docs;
                    route = 'multimedia/videos/webinars';
                    docs = mapPost(docs, route);
                    break;
                case 'terms':
                    docs = (await db.collection('pages')
                        .where('status', '==', 'active')
                        .where('slug', '==', 'terminos-y-condiciones')
                        .get()).docs.map(e => e.get('content'));
                    break;
                case 'privacy':
                    docs = (await db.collection('pages')
                        .where('status', '==', 'active')
                        .where('slug', '==', 'aviso-de-privacidad')
                        .get()).docs.map(e => e.get('content'));
                    break;
            }
            if (type) {
                if (type === 'terms' || type === 'privacy') {
                    return res.send({ content: docs[0] });
                } else {
                    return res.send({
                        size: docs.length,
                        items: docs
                    });
                }
            } else {
                return res.send({ error: 'El \'tipo\' es requerido.' });
            }
        } catch (e) {
            console.error(e);
            return res.send(e);
        }
    } else {
        return res.send({ message: `${req.method} Method Not Allowed` });
    }
};

function mapPost(docs, route) {
    return docs.map(e => {
        const data = e.data();
        return {
            // id: e.id,
            // status: data.status,
            video_url: data.type === 'video' ? data.video_url : null,
            url: `${appUrlAplicacion.value()}/${route}/${e.id}/${Buffer.from(data.title).toString('base64')}`,
            publication_date: moment(data.publication_date.toDate()).format('YYYY-MM-DD'),
            title: data.title,
            content: data.content,
            image: data.image
        }
    })
}


module.exports = { handler_onRequest };