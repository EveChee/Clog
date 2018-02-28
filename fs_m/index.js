/**
 * Created by evechee on 2017/9/19.
 */
const fs = require('fs');
const path = require('path');
const clog_config = require('./clog_config.json');
let conf = {
    lv: 'ALL',
    maxSize: 1024000,
    replaceConsole: true,
    dateFormat: 'YYYY-MM-DD hh:mm:ss',
    confjson: './clog_config.json',
    mypath: './logdir',
    maxSave: 10,
    maxSumSize: 5368709120
};

let custom_config = require(conf.confjson);
let cwd = process.cwd();

function configuration(obj) {
    return Object.assign(conf, obj);
}

if (conf.replaceConsole) global.console.error = consoleError;


function writeFs(obj) {
    checkDate(conf.mypath);

    let ndate = `${clog_config.today}-${clog_config.numbering}`;

    let url = conf.mypath !== './logdir' ? `${conf.mypath}/${custom_config.today}-${custom_config.numbering}.log` : `./logdir/${ndate}.log`;
    let purl = conf.mypath !== './logdir' ? path.join(cwd, url) : path.join(__dirname, url);

    obj.lv = obj.lv ? obj.lv : 'INFO';
    if (conf.lv !== 'ALL' && obj.lv !== conf.lv) return false;
    let content;
    if (obj.lv === 'ERROR') {
        if (obj.content instanceof Object) {
            try {
                content = obj.content.stack
            } catch (e) {
                content = obj.content
            }
        } else {
            content = 'Clog 提醒您该错误不是一个标准的错误对象 请手动检查';
        }
    } else {
        content = obj.content
    }

    let text = `\n[${conFormat(conf.dateFormat)}] LV:[${obj.lv}] ${content}`;
    if (!fs.existsSync(purl)) {
        fs.writeFile(purl, text, err => {
            console.log(err);
            if (err && err.code === 'ENOENT') mkdir({path: url, file: obj});
        })
    } else {
        checkSize(purl, conf.mypath);
        fs.appendFile(purl, text, 'utf8', err => console.log(err))
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
                if (arr[i - k]) s += '/' + arr[i - k];
            }
            narr.push(s);
        }
    }
    fmkdir(narr, 0, obj.file);
    callback && callback()
}

function fmkdir(arr, num, file) {
    if (num < arr.length) {
        let url = conf.mypath !== './logdir' ? path.join(cwd, arr[num]) : path.join(__dirname, arr[num]);
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
            fs.writeFile(conf.confjson, JSON.stringify(custom_config), err => console.log(err));
        } else {
            clog_config.numbering++;
            fs.writeFile(path.join(__dirname, './clog_config.json'), JSON.stringify(clog_config), err => console.log(err));
        }
        return false
    }
    return true
}

function rdDir(_path = conf.mypath, bl = conf.mypath !== './logdir' ? 1 : 0) {
    let dirPath = path.join(!bl ? __dirname : cwd, _path);
    fs.readdir(dirPath, async (err, files) => {
        if (err) return console.log(err);
        let nowTime = Date.parse(new Date(custom_config.today));
        let sumSize = 0;
        for (let i = 0, val; val = files[i++];) {
            let str = val.substring(0, val.lastIndexOf('-'));
            let time = (nowTime - Date.parse(new Date(str))) / 86400000;
            let stat = await fileStat(dirPath + '/' + val);
            sumSize += stat.size;
            if (sumSize > conf.maxSumSize) {//业务级数设置在10G
                if (files.length < 3) return console.log('日志大小异常，请手动处理');
                for (let j = 0; j < 3; j++) {
                    //删除前三个
                    rmDir(`${conf.mypath || './logdir'}/${files[j]}`, conf.mypath !== './logdir' ? 1 : 0);
                }
            }
            if (time > conf.maxSave) rmDir(`${conf.mypath || './logdir'}/${val}`, conf.mypath !== './logdir' ? 1 : 0);
        }
    });
    setTimeout(() => rdDir(_path, bl), 86400000);//一天检查一次
}

function rmDir(_path, bl) {
    fs.unlink(path.join(!bl ? __dirname : cwd, _path), function (err) {
        if (err) return;
        console.log(_path + '文件删除成功');
    })
}

function fileStat(filePath) {
    return new Promise((resolve, reject) => fs.stat(filePath, (err, data) => resolve(data)))
}

function checkDate(custom) {
    let ndate = conFormat('YYYY-MM-DD');
    custom
        ? configINIT(custom_config, ndate, conf.confjson)
        : configINIT(clog_config, ndate, path.join(__dirname, './clog_config.json'));
    return true
}

function configINIT(obj, day, url) {
    if (obj.today !== day) {
        obj.today = day;
        obj.numbering = 0;
        fs.writeFile(url, JSON.stringify(obj), err => console.log(err));
        return false
    }
}

function consoleError(err, normal) {
    writeFs({
        lv: 'ERROR',
        content: err
    })
}

process.on('uncaughtException', function (err) {
    writeFs({
        lv: 'ERROR',
        content: err
    });
});

module.exports = {
    log: writeFs,
    use: cuse,
    configuration,
    rdDir
};
