/**
 * Created by evechee on 2017/9/8.
 */
const fs = require('fs');
const path = require('path');
const clog_config = require('./clog_config.json');
let conf = {
    lv: 'ALL',
    maxSize: 1024000,
    replaceConsole: false,
    dateFormat: 'YYYY-MM-DD hh:mm:ss',
    confjson: './clog_config.json',
    mypath: ''
};

let custom_config = require(conf.confjson);
let cwd = process.cwd();

function configuration(obj) {
    for (let i in obj) {
        conf[i] = obj[i]
    }
    return conf
}

function writeFs(obj) {
    checkDate(conf.mypath);

    let ndate = `${clog_config.today}-${clog_config.numbering}`;

    let url = conf.mypath ? `${conf.mypath}-${custom_config.today}-${custom_config.numbering}.log` : `./logdir/${ndate}.log`;
    let purl = conf.mypath ? path.join(cwd, url) : path.join(__dirname, url);

    obj.lv = obj.lv ? obj.lv : 'INFO';
    if (conf.lv !== 'ALL' && obj.lv !== conf.lv) return false;
    let content;
    if(obj.lv === 'ERROR') {
        if (typeof obj.content === 'object') {
            if (obj.content.stack) {
                content = obj.content.stack
            }
        } else {
            content ='argument is not an object';
        }
    } else {
        content = obj.content
    }

    let text = `\n[${conFormat(conf.dateFormat)}] LV:[${obj.lv}] ${content}`;
    if (!fs.existsSync(purl)) {
        fs.writeFile(purl, text, err => {
            console.log('27:' + err);
            if (err && err.code === 'ENOENT') {
                mkdir({path: url, file: obj})
            }
        })
    } else {
        checkSize(purl, conf.mypath);
        fs.appendFile(purl, text, 'utf8', err => {
            console.log(err)
        })
    }

}

function mkdir(obj, callback) {
    let str = obj.path.substring(0, obj.path.lastIndexOf('/'));
    let arr = str.split('/');
    let i,
        j = -1,
        narr = [];
    for (i = 0; i < arr.length; i++, j++) {
        if (i > 0) {
            let s = '';
            for (let k = j; k >= 0; k--) {
                if (arr[i - k]) {
                    s += '/' + arr[i - k]
                }
            }
            narr.push(s);
        }
    }
    fmkdir(narr, 0, obj.file);
    callback && callback()
}
function fmkdir(arr, num, file) {
    console.log(arr[num])
    if (num < arr.length) {
        let url =  conf.mypath ? path.join(cwd, arr[num]) : path.join(__dirname, arr[num]);
        !fs.existsSync(url) && fs.mkdir(url, err => {
            if (err) return console.error(err);
            num++;
            fmkdir(arr, num, file);
        });
    } else {
        writeFs(file);
    }
}


function conFormat(str) {
    let ndate = new Date(),
        year = ndate.getFullYear(),
        month = mend(ndate.getMonth() + 1),
        day = mend(ndate.getDate()),
        hours = mend(ndate.getHours()),
        minutes = mend(ndate.getMinutes()),
        seconds = mend(ndate.getSeconds());
    if (str && typeof str === 'string') {
        str = str.replace(/YYYY/gm, year).replace(/MM/gm, month).replace(/DD/gm, day).replace(/hh/gm, hours).replace(/mm/gm, minutes).replace(/ss/gm, seconds);
        return str
    } else {
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
    }
}
function mend(str) {
    str = str + '';
    return str.length === 2 ? str : `0${str}`
}

function cuse(req, res, next) {
    let URL = req.url,
        USER = req.headers['user-agent'],
        METHOD = req.method,
        HOST = req.headers.host,
        STR = `HOST: ${HOST} URL: ${URL} METHOD: ${METHOD} USER: ${USER}`;
    writeFs({
        content: STR
    });
    next()
}

function checkSize(furl, custom) {
    let states = fs.statSync(furl);
    if (states.size > conf.maxSize) {
        if (custom) {
            custom_config.numbering++;
            fs.writeFile(conf.confjson, JSON.stringify(custom_config), err => {
                console.log('113:' + err);
            });
        } else {
            clog_config.numbering++;
            fs.writeFile(path.join(__dirname, './clog_config.json'), JSON.stringify(clog_config), err => {
                console.log('113:' + err);
            });
        }
        return false
    }
    return true
}

function checkDate(custom) {
    let ndate = conFormat('YYYY-MM-DD');
    if (custom) {
        configINIT(custom_config, ndate, conf.confjso);
    } else {
        configINIT(clog_config, ndate, path.join(__dirname, './clog_config.json'));
    }

    return true
}

function configINIT(obj, day, url) {
    if (obj.today !== day) {
        obj.today = day;
        obj.numbering = 0;
        fs.writeFile(url, JSON.stringify(obj), err => {
            console.log('113:' + err);
        });
        return false
    }
}

process.on('uncaughtException', function (err) {
    console.log(2131)
    writeFs({
        lv: 'ERROR',
        content: err
    });
});

module.exports = {
    log: writeFs,
    use: cuse,
    configuration
};
