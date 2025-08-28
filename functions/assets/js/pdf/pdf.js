const { defineSecret } = require('firebase-functions/params');
const html_to_pdf = require('html-pdf-node');
const apiUrl = defineSecret('CONFIGFB_API_URL');
const { slugify } = require('../Tools');

/**
 * 
 * @param { import('express').Request } req 
 * @param { import('express').Response } res 
 * @returns 
 */

async function generatePDFHandler(req, res) {
    res.header('Content-Type', 'application/pdf');
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.status(204).send('');
    }
    if (req && req.method === 'GET') {
        if (req && req.query && req.query.cuid) {
            const name =
                req && req.query && req.query.name ? slugify(decodeURI(req.query.name)) : 'certificado';
            let options = { format: 'A4' };
            let file = [{ url: `${apiUrl.value()}generateHtmlCertificate?cuid=${req.query.cuid}` }];
            console.log(file);

            res.header('Content-Disposition', `attachment; filename=${name}.pdf`);
            const output = await html_to_pdf.generatePdfs(file, options);
            return res.status(200).send(output[0].buffer);
        } else {
            return res.status(401).send({ message: 'missing parameters' });
        }
    } else {
        return res.status(405).send({ code: 405, message: `${req.method} Method Not Allowed` });
    }
}

module.exports = {
    generatePDFHandler
};