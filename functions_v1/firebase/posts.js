const Tools = require('../Tools');
const moment = require('moment');
const admin = Tools.getFBAdminInstance();
const db = admin.firestore();

exports.onRun_scheduled_posts = async function() {
  try {
    console.log(`'*** ${moment().toDate()} ***`);
    await scheduled_posts_main();
    return true;
  } catch (error) {
    console.error(error);
    return error;
  }
};

exports.onRun_delete_curses_and_congresses = async function() {
  try {
    console.log(`'*** ${moment().toDate()} ***`);
    await delete_curses_and_congresses_main();
    return true;
  } catch (error) {
    console.error(error);
    return error;
  }
};

//////////////////////////////////

exports.request_scheduled_posts = async function(request, response) {
  response.header('Content-Type', 'application/json');
  response.header('Access-Control-Allow-Origin', '*');
  response.header('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return response.status(204).send('');
  }

  if (request && request.method === 'POST') {
    const resp = await scheduled_posts_main();
    return response.status(200).send({ response: resp });
  } else {
    return response.status(405).send({ code: 405, message: `${request.method} Method Not Allowed` });
  }
};

exports.request_delete_curses_and_congresses = async function(request, response) {
  response.header('Content-Type', 'application/json');
  response.header('Access-Control-Allow-Origin', '*');
  response.header('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return response.status(204).send('');
  }

  if (request && request.method === 'POST') {
    const resp = await delete_curses_and_congresses_main();
    return response.status(200).send({ response: resp });
  } else {
    return response.status(405).send({ code: 405, message: `${request.method} Method Not Allowed` });
  }
};

///////////////////////////////

async function scheduled_posts_main() {
  try {
    const resp = await db
      .collection('posts')
      .where('status', '==', 'pending')
      .where('publication_date', '<=', moment().toDate())
      .limit(50)
      .get();

    for (let doc of resp.docs) {
      await doc.ref.update({ status: 'active' });
    }
    return true;
  } catch (e) {
    console.error(e);
    return e;
  }
}

async function delete_curses_and_congresses_main() {
  try {
    //const array = [];
    let today = moment().toDate();

    const resp = await db
      .collection('posts')
      .where('status', '==', 'active')
      .where('type', '==', 'curso_o_congreso')
      .where('fecha_fin', '<=', today)
      .get();

    for (let doc of resp.docs) {
      try {
        await doc.ref.update({ status: 'inactive' });
        // array.push(
        //   {
        //     title: doc.get('title'),
        //     fecha_fin: moment(doc && doc.get('fecha_fin') && doc.get('fecha_fin').toDate() ? doc.get('fecha_fin').toDate() : '').format('YYYY-MM-DD HH:mm'),
        //     milliseconds: moment(doc.get('fecha_fin').toDate()).unix(),
        //   });
      } catch (e) {
        console.error(e);
      }
    }
    return true;
    //return array.sort((a, b) => a.milliseconds - b.milliseconds).reverse();
  } catch (e) {
    console.error(e);
    return e;
  }
}
