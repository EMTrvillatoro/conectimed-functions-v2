/**
 * Request Admin Messaging
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns
**/
const admin = require('firebase-admin');

async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        return res.status(204).send('');
    }
    try {
        let posts = [];

        let docs = await admin
            .firestore()
            .collection('foro')
            .limit(10)
            .get();
        docs = await docs.docChanges();

        for (const doc of docs) {
            const id = doc._document._ref._path.segments[1];
            let img = await admin
                .firestore()
                .collection(`foro/${id}/files`)
                .limit(1)
                .get();
            let urlImg = null;

            if (!img.empty) {
                img = await img.docChanges();
                urlImg = img[0]._document._fieldsProto.file.stringValue;
            }

            let content = doc._document._fieldsProto.content.stringValue;
            if (content.length > 60) {
                content = content.substring(0, 60) + '...';
            }

            const post = {
                id,
                urlImg,
                title: doc._document._fieldsProto.title.stringValue,
                createdAt: doc._document._fieldsProto.createdAt.timestampValue,
                content
            };
            posts.push(post);
        }

        return res.status(200).send(posts);
    } catch (e) {
        console.error('Error', e);
        return res.status(500).send(e);
    }
};

module.exports = {
    handler
}