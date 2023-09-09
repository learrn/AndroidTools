const fs = require("fs");
const path = require('path')
const child_process = require("child_process");
const https = require('https');

window.exports = {
  apkInstall: {
    // 注意：键对应的是 plugin.json 中的 features.code
    mode: "none", // 用于无需 UI 显示，执行一些简单的代码
    args: {
      enter: async (action) => {
        // utools.dbStorage.removeItem('adbPath')
        // utools.dbStorage.removeItem('downloadPath')
        await downloadConfig()
        await adbConfig()
        // showMsg('apkDownloadAndInstall')
        apkDownloadAndInstall(action.payload)
      },
      search: (action, searchWord, callbackSetList) => {
        console.log(searchWord);
        if (!searchWord) return callbackSetList();
        return callbackSetList(getCmd(searchWord));
      },
      select: (action, itemData) => {
        window.utools.hideMainWindow();
        runInTerminal(itemData, "/Users/xiangjuncheng/Downloads");
      },
    },
  },
};

function apkDownloadAndInstall(url) {
  if (utools.dbStorage.getItem('downloadPath') == null) {
    showMsg('未配置下载路径')
    return
  }

  if (utools.dbStorage.getItem('adbPath') == null) {
    showMsg('未配置adb路径')
    return
  }

  let apkUrl;
  if (url == 'apk') {
    apkUrl = "https://storage.jd.com/com.bamboo.android.product/490/13763356/JDMALLLITE-6.11.5-22710-tjDebugUseReleaseSign_64bit_resguard-202309081159_sec_signed.apk";
  } else {
    apkUrl = url;
  }
  let apkPath = path.join(utools.dbStorage.getItem('downloadPath'), 'demo.apk')
  let adbPath = utools.dbStorage.getItem('adbPath')
  request(apkUrl, apkPath)
    .then(() => {
      showMsg(`下载完成，安装中`);
      child_process.exec(
        getCmd(
          apkPath,
          adbPath
        ),
        (error, stdout, stderr) => {
          if (error) {
            showNotification('安装失败', `执行的错误: ${error}`);
            return;
          }
          showNotification('安装完成', `${stdout}`);
        }
      );
    })
    .catch(err => {
      showMsg('下载失败:' + err);
    });
}

async function downloadConfig() {
  if (utools.dbStorage.getItem('downloadPath') == null) {
    const path = await utools.showOpenDialog({
      properties: ['openDirectory'],
      title: '选择下载位置',
      defaultPath: utools.getPath('downloads')
    })

    showMsg('123' + path[0])
    utools.dbStorage.setItem('downloadPath', path ? path[0] : null)
  }
}

async function adbConfig() {
  if (utools.dbStorage.getItem('adbPath') == null) {
    const path = await utools.showOpenDialog({
      properties: ['openFile'],
      title: '选择adb位置'
    })

    utools.dbStorage.setItem('adbPath', path ? path[0] : null)

  }
}

const request = async (url, savePath) => {

  const file = fs.createWriteStream(savePath);

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
      showMsg(`下载进度: ${progress.toFixed(2)}%`, true);
    });
    file.on('finish', () => {
      resolve()
    });
    file.on('error', err => reject(err));

  });

};

let getCmd = (filePath, adb) => {
  command = `${adb} install -r ${filePath}`;
  console.log(command);
  return command;
};

let showMsg = (msg, noLog) => {
  if (!noLog) {
    console.log(msg)
  }
  utools.setSubInput(({ text }) => {
    console.log(text)
  }, msg);
}

let showNotification = (title, content) => {
  utools.showNotification({
    title: title,
    body: content,
    // icon: '图标路径', // 可选

    // 点击通知的回调函数
    onclick: () => {
      console.log('通知被点击了')
    }
  })
}