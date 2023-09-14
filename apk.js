const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
const https = require("https");
const http = require("http");
const util = require("util");
const QRCode = require("qrcode-reader");

let apkInfos = [];
let mCallbackSetList;
exports.apkEnter = async (action, callbackSetList) => {
  const downloadRes = await downloadConfig();
  if (!downloadRes) {
    return;
  }
  const adbRes = await adbConfig();
  console.info(adbRes);
  if (!adbRes) {
    return;
  }
  mCallbackSetList = callbackSetList;
  if ((action.type = "files")) {
    console.log(typeof action.payload);
    if (typeof action.payload == "string") {
      if (action.payload.startsWith("data:image")) {
        // str 是字符串
        window.showMsg("解析二维码");
        scanImage(action.payload);
      } else {
        window.showMsg("下载并安装apk链接");
        apkDownloadAndInstall(action.payload);
      }
    } else {
      window.showMsg(`安装APK ${action.payload[0]}`);
      apkInstall(action.payload[0].path);
    }
  } else if ((action.type = "img")) {
    window.showMsg("解析二维码");
    scanImage(action.payload);
  } else if ((action.type = "regex")) {
    window.showMsg("下载并安装apk链接");
    apkDownloadAndInstall(action.payload);
  }
};

exports.apkPathEnter = async (action) => {
  switch (action.payload) {
    case "APK环境清除":
      window.removeDBItem("downloadPath");
      window.removeDBItem("adbPath");
      window.showMsg("APK环境清除成功", false, true);
      break;
    case "ADB环境配置":
      window.removeDBItem("adbPath");
      const adbRes = await adbConfig(true);
      console.info(adbRes);
      if (adbRes) {
        window.showMsg("ADB环境配置成功", false, true);
      }
      break;
    case "APK下载路径":
      window.removeDBItem("downloadPath");
      const downloadRes = await downloadConfig();
      if (downloadRes) {
        window.showMsg("APK下载路径配置成功", false, true);
      }
      break;

    default:
      break;
  }
};

exports.getApkInfos = () => {
  return downloads;
};

async function apkDownloadAndInstall(url) {
  let apkUrl;
  if (url == "apkt") {
    apkUrl =
      "https://storage.jd.com/com.bamboo.android.product/490/13763356/JDMALLLITE-6.11.5-22710-tjDebugUseReleaseSign_64bit_resguard-202309081159_sec_signed.apk";
    // runAdbCommand(
    //   "shell getprop ro.product.model",
    //   (res) => {
    //     console.info(res);
    //     window.showMsg(`安装完成:${res}`, false, true);
    //   },
    //   (error) => {
    //     var lines = error.message.trim().split("\n");
    //     var lastLine = lines[lines.length - 1];
    //     window.showMsg(`安装失败:${lastLine}`, false, true);
    //     return;
    //   }
    // );
    // return;
  } else {
    apkUrl = url;
  }
  downloadApk(apkUrl, window.getDBItem("downloadPath"))
    .then((apkInfo) => {
      // saveApkInfo(url, fileName, apkPath);
      const [url, fileName, apkPath] = apkInfo;
      window.showMsg(`下载完成，安装中 ${apkPath}`);
      apkInstall(apkPath);
    })
    .catch((err) => {
      window.showMsg("下载失败:" + err);
    });
}

let apkInstall = (apkPath) => {
  runAdbCommand(
    `安装中`,
    `install -t -d -r ${apkPath}`,
    (res) => {
      console.info(res);
      window.showMsg(`安装完成:${res}`, false, true);
    },
    (error) => {
      var lines = error.message.trim().split("\n");
      var lastLine = lines[lines.length - 1];
      window.showMsg(`安装失败:${lastLine}`, false, true);
      return;
    }
  );
  // child_process.exec(
  //   getCmd(apkPath, window.getDBItem("adbPath")),
  //   (error, stdout, stderr) => {
  //     if (error) {
  //       var lines = error.message.trim().split("\n");
  //       var lastLine = lines[lines.length - 1];
  //       window.showMsg(`安装失败:${lastLine}`, false, true);
  //       return;
  //     }
  //     window.showMsg(`安装完成:${stdout}`, false, true);
  //   }
  // );
};

async function downloadConfig() {
  if (window.getDBItem("downloadPath") == null) {
    window.showMsg("请设置apk下载路径", false, true);
    const path = await window.showOpenDialog({
      properties: ["openDirectory"],
      title: "选择下载位置",
      defaultPath: window.getUtoolPath("downloads"),
    });
    console.warn(path);

    window.setDBItem("downloadPath", path ? path[0] : null);
    if (path == null) {
      window.showMsg("下载路径未配置", false, true);
      return false;
    } else {
      return true;
    }
  }
  return true;
}

async function adbConfig(ignoreDefault = false) {
  if (window.getDBItem("adbPath") == null) {
    let path = null;
    try {
      if (ignoreDefault) {
        throw new Error();
      }
      const { stdout, stderr } = await runCommand("adb");
      // 处理成功的情况
      console.log(`存在adb参数:${stdout}`);
      path = ["adb"];
    } catch (error) {
      // 处理错误的情况
      console.log(`不存在adb参数:${error}`);
      window.showMsg("请设置adb环境路径", false, true);
      path = await window.showOpenDialog({
        properties: ["openFile"],
        title: "选择adb位置",
      });
    }
    window.setDBItem("adbPath", path ? path[0] : null);
    if (path == null) {
      window.showMsg("adb环境未配置", false, true);
      return false;
    } else {
      return true;
    }
  } else {
    return true;
  }
}

const downloadApk = async (url, savePath) => {
  // const fileName = url.split('/').pop();
  const fileName = "downTemp.apk";
  savePath = path.join(savePath, fileName);
  const file = window.createWriteStream(savePath);

  const response = await new Promise((resolve, reject) => {
    if (url.startsWith("https")) {
      https.get(url, (res) => {
        resolve(res);
        res.on("error", (err) => {
          reject(err);
        });
      });
    } else {
      http.get(url, (res) => {
        resolve(res);
        res.on("error", (err) => {
          reject(err);
        });
      });
    }
  });

  response.pipe(file);

  return new Promise((resolve, reject) => {
    let totalBytes = 0;
    response.on("data", (chunk) => {
      totalBytes += chunk.length;
      const progress = (totalBytes / response.headers["content-length"]) * 100;
      window.showMsg(`下载进度: ${progress.toFixed(2)}%`, true);
    });
    file.on("finish", () => {
      console.log(savePath);
      resolve([url, fileName, savePath]);
    });
    file.on("error", (err) => reject(err));
  });
};

let getCmd = (filePath, adb) => {
  command = `${adb} install -t -d -r ${filePath}`;
  console.log(command);
  return command;
};

let saveApkInfo = (url, fileName, apkPath) => {
  let downloads = getApkInfos();
  downloads.push({
    name: fileName,
    path: filePath,
    time: new Date(),
  });
  if (downloads.length > 5) {
    let fileInfo = downloads.shift();
    fs.rm(fileInfo.path, { recursive: true }, (err) => {
      if (err) throw err;
      console.log(`${fileInfo.path} Directory deleted!`);
    });
  }
};

let scanImage = (imageBase64) => {
  const qr = new QRCode();
  qr.callback = (err, value) => {
    if (err) {
      window.showMsg("无法识别图片中二维码", false, true);
      return;
    }

    let result = value.result;
    console.log(result);
    const isApkUrl = /^http.*\.apk$/.test(result);
    if (isApkUrl) {
      apkDownloadAndInstall(result);
    } else {
      window.showMsg("图片中二维码非apk url", false, true);
    }
  };

  qr.decode(imageBase64);
};

function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    child_process.exec(cmd, (error, stdout, stderr) => {
      console.info(error, stdout, stderr);
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

const exec = util.promisify(child_process.exec);
exports.runAdbCommand = async (text, command, onSuccess, onError) => {
  runAdbCommand(text, command, onSuccess, onError);
};

/**
 * Runs an ADB command and handles the response based on the number of devices connected.
 *
 * @param {string} command - The ADB command to run.
 * @param {function} onSuccess - The callback function to execute on success.
 * @param {function} onError - The callback function to execute on error.
 * @return {Promise} The promise that resolves with the output of the command.
 */
let runAdbCommand = async (text, command, onSuccess, onError) => {
  try {
    let output = [];
    const adb = window.getDBItem("adbPath");
    console.log(`start ${command} ${onSuccess}`);
    if (command.indexOf("-s ") == -1) {
      const { stdout } = await exec(`${adb} devices -l`);
      output = stdout.split("\n"); // Split on new line
      output = output.slice(1, output.length - 2); // Remove first line and last empty line
    }

    if (output.length > 1) {
      // More than one device connected
      deviceInfos = [];
      for (let device of output) {
        console.log(`Device: ${device}`);
        deviceInfos.push({
          description: device.split(" ")[0],
          title: device.match(/model:(\S+)/)[1],
          command,
          text,
          onSuccess,
          onError,
        });
      }
      mCallbackSetList(deviceInfos);
      window.showMsg("请选择要运行的设备");
      // return deviceInfos;
    } else {
      showMsg(text);
      // Only one device connected
      const { stdout } = await exec(`${adb} ${command}`);
      console.log(stdout);
      onSuccess(stdout);
    }
  } catch (error) {
    console.error(`exec error: ${error}`);
    onError(error);
  }
};
