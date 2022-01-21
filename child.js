require('dotenv').config();

const localtunnel = require('localtunnel');

process.on('message', (msg) => {
    const { USERNAME } = msg;

    localtunnel(process.env.PORT, { subdomain: `file-share-${USERNAME.toLowerCase()}` }).catch(e => {
        throw e;
    })
})
