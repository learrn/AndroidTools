const fs = require("fs");
const path = require('path')
const child_process = require("child_process");
const https = require('https');
const QRCode = require('qrcode-reader');

let apkInfos = [];


exports.apkEnter = async (action) => {
    // window.removeDBItem('adbPath')
    // window.removeDBItem('downloadPath')
    const downloadRes = await downloadConfig();
    if (!downloadRes) {
        return;
    }
    const adbRes = await adbConfig()
    if (!adbRes) {
        return;
    }
    if (action.type = 'files') {
        console.log(typeof (action.payload))
        if (typeof (action.payload) == 'string') {
            if (action.payload.startsWith('data:image')) {
                // str 是字符串 
                window.showMsg('解析二维码')
                scanImage(action.payload)
            } else {
                window.showMsg('下载并安装apk链接')
                apkDownloadAndInstall(action.payload)
            }
        } else {
            window.showMsg(`安装APK ${action.payload[0]}`)
            apkInstall(action.payload[0].path)
        }
    } else if (action.type = 'img') {
        window.showMsg('解析二维码')
        scanImage(action.payload)
    } else if (action.type = 'regex') {
        window.showMsg('下载并安装apk链接')
        apkDownloadAndInstall(action.payload)
    }
}

exports.getApkInfos = () => {
    return downloads
}


function apkDownloadAndInstall(url) {
    let apkUrl;
    if (url == 'apkt') {
        apkUrl = "https://storage.jd.com/com.bamboo.android.product/490/13763356/JDMALLLITE-6.11.5-22710-tjDebugUseReleaseSign_64bit_resguard-202309081159_sec_signed.apk";
    } else {
        apkUrl = url;
    }
    downloadApk(apkUrl, window.getDBItem('downloadPath'))
        .then((apkInfo) => {
            // saveApkInfo(url, fileName, apkPath);
            const [url, fileName, apkPath] = apkInfo;
            window.showMsg(`下载完成，安装中 ${apkPath}`);
            apkInstall(apkPath);
        })
        .catch(err => {
            window.showMsg('下载失败:' + err);
        });
}

let apkInstall = (apkPath) => {
    child_process.exec(
        getCmd(
            apkPath,
            window.getDBItem('adbPath')
        ),
        (error, stdout, stderr) => {
            if (error) {
                var lines = error.message.trim().split("\n");
                var lastLine = lines[lines.length - 1];
                window.showMsg(`安装失败:${lastLine}`, false, true);
                return;
            }
            window.showMsg(`安装完成:${stdout}`, false, true);
        }
    );
}

async function downloadConfig() {
    if (window.getDBItem('downloadPath') == null) {
        const path = await window.showOpenDialog({
            properties: ['openDirectory'],
            title: '选择下载位置',
            defaultPath: window.getUtoolPath('downloads')
        })
        console.warn(path)

        window.setDBItem('downloadPath', path ? path[0] : null)
        if (path == null) {
            window.showMsg("下载路径未配置", false, true)
            return false;
        } else {
            return true;
        }
    }
    return true;
}

async function adbConfig() {
    if (window.getDBItem('adbPath') == null) {
        const { stdout, stderr } = await child_process.exec('adb');
        let path = null
        if (stdout) {
            path = ['adb']
        } else {
            path = await window.showOpenDialog({
                properties: ['openFile'],
                title: '选择adb位置'
            })
        }

        window.setDBItem('adbPath', path ? path[0] : null)
        if (path == null) {
            window.showMsg("adb环境未配置", false, true)
            return false;
        } else {
            return true;
        }

    }
    return true;
}

const downloadApk = async (url, savePath) => {
    // const fileName = url.split('/').pop();
    const fileName = 'downTemp.apk';
    savePath = path.join(savePath, fileName);
    const file = window.createWriteStream(savePath);

    const response = await new Promise((resolve, reject) => {
        https.get(url, res => {
            resolve(res);

            res.on('error', err => {
                reject(err);
            });
        });
    });

    response.pipe(file);

    return new Promise((resolve, reject) => {

        let totalBytes = 0;
        response.on('data', chunk => {
            totalBytes += chunk.length;
            const progress = (totalBytes / response.headers['content-length']) * 100;
            window.showMsg(`下载进度: ${progress.toFixed(2)}%`, true);
        });
        file.on('finish', () => {
            console.log(savePath)
            resolve([url, fileName, savePath])
        });
        file.on('error', err => reject(err));

    });

};

let getCmd = (filePath, adb) => {
    command = `${adb} install -r ${filePath}`;
    console.log(command);
    return command;
};

let saveApkInfo = (url, fileName, apkPath) => {
    let downloads = getApkInfos();
    downloads.push({
        name: fileName,
        path: filePath,
        time: new Date()
    });
    if (downloads.length > 5) {
        let fileInfo = downloads.shift();
        fs.rm(fileInfo.path, { recursive: true }, (err) => {
            if (err) throw err;
            console.log(`${fileInfo.path} Directory deleted!`);
        });
    }
}

let scanImage = (imageBase64) => {
    const qr = new QRCode();
    qr.callback = (err, value) => {
        if (err) {
            window.showMsg('无法识别图片中二维码', false, true)
            return
        }

        let result = value.result
        console.log(result)
        const isApkUrl = /^http.*\.apk$/.test(result)
        if (isApkUrl) {
            apkDownloadAndInstall(result)
        } else {
            window.showMsg('图片中二维码非apk url', false, true)
        }
    }

    qr.decode(imageBase64);
}

