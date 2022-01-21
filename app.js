// import { dc } from 'dotenv';
require('dotenv').config();
// import { createReadStream, existsSync, readFileSync, statSync, writeFileSync } from 'fs';
const { createReadStream, existsSync, readFileSync, statSync, writeFileSync, createWriteStream } = require('fs');
// import { fork } from 'child_process';
const { fork } = require('child_process');
// import http from 'http';
const http = require('http');
const { default: axios } = require('axios');

const COLORS = {
    Reset: "\x1b[0m",
    Bright: "\x1b[1m",
    Dim: "\x1b[2m",
    Underscore: "\x1b[4m",
    Blink: "\x1b[5m",
    Reverse: "\x1b[7m",
    Hidden: "\x1b[8m",

    FgBlack: "\x1b[30m",
    FgRed: "\x1b[31m",
    FgGreen: "\x1b[32m",
    FgYellow: "\x1b[33m",
    FgBlue: "\x1b[34m",
    FgMagenta: "\x1b[35m",
    FgCyan: "\x1b[36m",
    FgWhite: "\x1b[37m",

    BgBlack: "\x1b[40m",
    BgRed: "\x1b[41m",
    BgGreen: "\x1b[42m",
    BgYellow: "\x1b[43m",
    BgBlue: "\x1b[44m",
    BgMagenta: "\x1b[45m",
    BgCyan: "\x1b[46m",
    BgWhite: "\x1b[47m",

    ErrorMessage(msg) {
        console.log(`${COLORS.FgRed}ERROR: ${COLORS.Reset}${msg}`);
    },

    InfoMessage(msg) {
        console.log(`${COLORS.FgCyan}INFO: ${COLORS.Reset}${msg}`);
    },

    SuccessMessage(msg) {
        console.log(`${COLORS.FgGreen}Success: ${COLORS.Reset}${msg}`);
    },

    WarningMessage(msg) {
        console.log(`${COLORS.FgYellow}Warning:${COLORS.Reset} ${msg}`);
    }
}

if (!existsSync('./config.json'))
    writeFileSync('./config.json', '{}');

let config = new Proxy(require('./config.json'), {
    set(obj, prop, value) {
        (() => {
            if (prop == "USERS" && (JSON.stringify(value) ?? "[]") != "[]") {
                const verify = (e) => e?.user == value.user;

                //Verifica se já existe um usuário
                if (obj.USERS.filter(verify).length > 0)
                    return obj.USERS.filter(verify)[0].password = value.password;

                return obj.USERS.push({ user, password } = value);
            }

            obj[prop] = value
        })()

        writeFileSync('./config.json', JSON.stringify(obj));
    }
})

if (!config.USERS)
    config.USERS = [];

main();

function main() {
    const USERNAME = findKey('-U') ?? config?.USERNAME;
    const PASSWORD = findKey('-P') ?? config?.PASSWORD;
    const PORT = process.env.PORT;


    if (findKey('-U') || findKey('-P')) {
        config.USERNAME = USERNAME;
        config.PASSWORD = PASSWORD;
    }

    if (!USERNAME)
        return COLORS.ErrorMessage('Nome de usuário não definido, crie o seu com "-U <nome de usuário>"');

    if (!PASSWORD)
        return COLORS.ErrorMessage('Você não possui uma senha, use "-P <senha>" para criar uma!');


    if (hasKey('-S') && hasKey('G'))
        return COLORS.ErrorMessage('Não e possível enviar e receber um arquivo ao mesmo tempo!');

    if (hasKey('-S')) {
        const FileDir = findKey('-S');
        const FileTotalBytes = statSync(FileDir);

        if (!existsSync(FileDir))
            return COLORS.ErrorMessage('Esse arquivo não existe!');

        fork('./child.js').send({ USERNAME });

        http.createServer((req, res) => {
            if (req.method !== "GET") {
                res.statusCode = 405;
                res.write('Somente método GET');
                return res.end();
            }

            const { username, password } = getQuery(req.url);

            if (!username) {
                res.statusCode = 404;
                res.write('Usuário não informado!');
                return res.end();
            }

            if (!password) {
                res.statusCode = 404;
                res.write('Senha não informada!');
                return res.end();
            }

            if (password !== PASSWORD) {
                res.statusCode = 401;
                res.write('Senha incorreta!');
                COLORS.InfoMessage(`Usuário ${username} digitou a senha incorretamente!, senha que ele digitou: ${password}`);
                return res.end();
            }

            const { name, type } = getFileSplitted(FileDir);
            res.setHeader('FILE_TYPE', type);
            res.setHeader('FILE_NAME', name);
            res.setHeader('FILE_TOTAL', FileTotalBytes.size);

            COLORS.InfoMessage(`Enviando o arquivo para o ${username}`);
            createReadStream(FileDir).pipe(res).on('close', () => {
                COLORS.InfoMessage(`Arquivo enviado para ${username}`);
                res.end();
            });
        }).listen(PORT, () => COLORS.SuccessMessage("Arquivo pronto para compartilhamento!\n"));
        return;
    }

    if (hasKey('-G')) {
        const user = findKey('-G');
        const userPassword = config?.USERS?.[user]?.password ?? findKey('-UP');
        const filePath = findKey('-PH');
        const customName = findKey('-FN');

        if (!user)
            return COLORS.ErrorMessage("Usuário não informado!");

        if (!userPassword)
            return COLORS.ErrorMessage(`Não a senha para o usuário '${user}', adicione uma com '-UP <senha>'`);

        if (hasKey('-UP'))
            config.USERS = { user, password: userPassword };

        if (!filePath)
            COLORS.InfoMessage(`O arquivo vai ser salvo em '${__dirname}', para mudar use '-PH <diretório>'`);

        if (!customName)
            COLORS.InfoMessage("Se quiser mudar o nome do arquivo use '-FN <nome do arquivo>'");

        axios.get(`https://file-share-${user.toLowerCase()}.loca.lt?username=${USERNAME}&password=${userPassword}`, { responseType: 'stream', headers: { 'Bypass-Tunnel-Reminder': true } }).then(e => e.data).then(e => {
            const { file_type: type, file_name: name, file_total: length } = findValue(e.rawHeaders, 'file_type', 'file_name', 'file_total');

            const progress = require('progress-stream')({ length: Number(length), time: 1000 });
            const filePathFull = `${customName ?? name}.${type}`;

            progress.on('progress', (pg) => {
                const speed = pg.speed / 1000;

                console.clear();
                COLORS.InfoMessage(`O seu arquivo esta em ${Math.round(pg.percentage)}%`);
                COLORS.InfoMessage(`A velocidade de download e: ${String(speed / 1000).substring(0, 3)}mbs (${Math.round(speed)}kbs)`);
                COLORS.WarningMessage("Não cancele o download antes da hora!");
            })

            e.pipe(progress).pipe(createWriteStream(filePath ? `${filePath}/${filePathFull}` : filePathFull).on('error', e => {
                COLORS.ErrorMessage(`O diretório '${filePath}' não existe!`);
            }));

        }).catch(err => {
            let streamString = '';
            err.response.data.setEncoding('utf8');
            err.response.data.on('data', utf8Chunk => streamString += utf8Chunk).on('end', () => {
                if (streamString === "404")
                    return COLORS.ErrorMessage('Esse usuário não existe ou não esta compartilhando arquivos no momento!');

                COLORS.ErrorMessage(streamString);
            });
        })

        function findValue(data = [], ...values) {
            let final = {};
            for (let value of values)
                final[value] = data.includes(value) ? data[data.indexOf(value) + 1] : null;

            return final;
        }

        return;
    }

    COLORS.InfoMessage("Para compartilhar um arquivo use, '-S <arquivo>'");
    COLORS.InfoMessage("Para abaixar o arquivo use '-G <nome do usuário a receber o arquivo>' e '-UP <senha do usuário a receber o arquivo>'");
}

function getFileSplitted(dir) {
    const fixDir = /(\w+\.)\w+/g.exec(dir)[0];
    const type = fixDir.split('.')[1];
    const name = fixDir.split('.')[0];

    return { name, type };
}

function getQuery(url) {
    if (url === '/' || url === '/?')
        return {};

    const objs = url.substring(2).split('&');
    let final = {};

    for (let obj of objs) {
        const splittedObj = obj.split('=');

        final[splittedObj[0]] = splittedObj[1];
    }

    return final;
}

function hasKey(key) {
    return process.argv.includes(key);
}

function findKey(key) {
    const args = process.argv;

    return args.includes(key) ? args[args.indexOf(key) + 1] ?? null : null;
}