const fs = require("fs");
const path = require("path");
const os = require("os");
const child_process = require("child_process");
// const https = require("https");
// const http = require("http");
const { http, https } = require("follow-redirects");
const util = require("util");
const QRCode = require("qrcode-reader");
const cancelToken = new AbortController();

let apkInfos = [];
let mCallbackSetList;
exports.apkEnter = async (action, callbackSetList) => {
  console.warn("apkEnter");
  console.warn(action);
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
  if (action.type == "files") {
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
  } else if (action.type == "img") {
    window.showMsg("解析二维码");
    scanImage(action.payload);
  } else if (action.type == "regex") {
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

exports.cancel = () => {
  if (cancelToken) {
    cancelToken.abort();
    window.showMsg("取消下载", false, true);
  }
};

exports.adbCmdInput = (action, callbackSetList) => {
  mCallbackSetList = callbackSetList;
  if (action.payload == "APK代理端口设置") {
    resetProxyPort();
  } else if (action.payload == "设置代理") {
    proxyPortConfig(null, (port) => {
      setProxy(port);
    });
  } else if (action.payload == "清除代理") {
    delProxy();
  } else if (action.payload == "设备截图") {
    screenshot();
  } else {
    runAdbCommand(
      "输入中",
      `shell input text "${action.payload}"`,
      (res) => {
        const [stdout, deviceInfo] = res;
        console.info(stdout);
        window.showMsg(`输入完成.`, false, true);
      },
      (error) => {
        const [errorInfo, deviceInfo] = error;
        lastLine = "";
        if (
          errorInfo &&
          errorInfo.message &&
          errorInfo.message.indexOf("INJECT_EVENTS") != -1
        ) {
          lastLine = "若是MIUI系统请检查是否开启了USB调试(安全模式)";
        }
        window.showMsg(`输入失败 ${lastLine}`, false, true);
        return;
      }
    );
  }
};
async function apkDownloadAndInstall(url) {
  let apkUrl;
  if (url == "apkt") {
    apkUrl =
      "https://storage.jd.com/com.bamboo.android.product/490/13763356/JDMALLLITE-6.11.5-22710-tjDebugUseReleaseSign_64bit_resguard-202309081159_sec_signed.apk";
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
    `install -t -d -r "${apkPath}"`,
    (res) => {
      const [stdout, deviceInfo] = res;
      console.info(stdout);
      window.showMsg(`安装完成:${stdout}`, false, true);
    },
    (error) => {
      const [errorInfo, deviceInfo] = error;
      var lines = errorInfo.message.trim().split("\n");
      var lastLine = lines[lines.length - 1];
      window.showMsg(`安装失败:${lastLine}`, false, true);
      return;
    }
  );
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
      const [stdout, stderr] = await runCommand("adb");
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
      https.get(url, { signal: cancelToken.signal }, (res) => {
        resolve(res);
        res.on("error", (err) => {
          reject(err);
        });
      });
    } else {
      http.get(url, { signal: cancelToken.signal }, (res) => {
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
    const isApkUrl = /^http.*/.test(result);
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
        resolve([stdout, stderr]);
      }
    });
  });
}

const exec = util.promisify(child_process.exec);
exports.runAdbCommand = async (
  text,
  command,
  onSuccess,
  onError,
  deviceInfo
) => {
  runAdbCommand(text, command, onSuccess, onError, deviceInfo);
};

/**
 * Runs an ADB command and handles the response based on the number of devices connected.
 *
 * @param {string} command - The ADB command to run.
 * @param {function} onSuccess - The callback function to execute on success.
 * @param {function} onError - The callback function to execute on error.
 * @return {Promise} The promise that resolves with the output of the command.
 */
let runAdbCommand = async (text, command, onSuccess, onError, deviceInfo) => {
  try {
    let output = [];
    const adb = window.getDBItem("adbPath");
    console.log(`start ${command} ${onSuccess}`);
    // if (command.indexOf("-s ") == -1) {
    //   const { stdout } = await exec(`${adb} devices -l`);
    //   output = stdout.split("\n"); // Split on new line
    //   output = output.slice(1, output.length - 2); // Remove first line and last empty line
    // }
    if (deviceInfo == null) {
      const { stdout } = await exec(`${adb} devices -l`);
      output = stdout.split("\n"); // Split on new line
      output = output.slice(1, output.length - 2); // Remove first line and last empty line
    }

    if (output.length > 1) {
      // More than one device connected
      let deviceInfos = [];
      for (let device of output) {
        console.log(`Device: ${device}`);
        deviceInfos.push({
          description: device.split(" ")[0],
          title: device.match(/model:(\S+)/)[1],
          type: "adb",
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
      let finalCommond = "";
      if (deviceInfo != null) {
        finalCommond = `${adb} -s ${deviceInfo} ${command}`;
      } else {
        finalCommond = `${adb} ${command}`;
      }
      const { stdout } = await exec(finalCommond);
      console.log(stdout);
      onSuccess ? onSuccess([stdout, deviceInfo]) : null;
    }
  } catch (error) {
    console.error(`exec error: ${error}`);
    onError ? onError([error, deviceInfo]) : "";
  }
};

let screenshot = () => {
  runAdbCommand(
    "截图获取中",
    `shell screencap /sdcard/screen.png`,
    (res) => {
      const [stdout, deviceInfo] = res;
      console.info(`er${stdout}`);
      const savePath = path.join(
        window.getDBItem("downloadPath"),
        "设备截图.png"
      );
      runAdbCommand(
        "截图获取中",
        `pull /sdcard/screen.png "${savePath}"`,
        (res) => {
          const [stdout, deviceInfo] = res;
          console.info(stdout);
          window.showMsg(`截图完成.`, false, true);
          setTimeout(() => {
            window.shellShowItemInFolder(savePath);
            window.outPlugin();
          }, 900);
        },
        (error) => {
          const [errorInfo, deviceInfo] = error;
          lastLine = "";
          if (errorInfo && errorInfo.message) {
            var lines = errorInfo.message.trim().split("\n");
            var lastLine = lines[lines.length - 1];
          }
          window.showMsg(`截图失败 ${lastLine}`, false, true);
          return;
        },
        deviceInfo
      );
    },
    (error) => {
      const [errorInfo, deviceInfo] = error;
      lastLine = "";
      if (errorInfo && errorInfo.message) {
        var lines = errorInfo.message.trim().split("\n");
        var lastLine = lines[lines.length - 1];
      }
      window.showMsg(`截图失败 ${lastLine}`, false, true);
      return;
    }
  );
};
let resetProxyPort = () => {
  window.setDBItem("proxyPort", null);
  proxyPortConfig(
    null,
    (port) => {
      window.showMsg(`设备代理端口:${port} 设置成功`, false, true);
      window.outPlugin();
    },
    (error) => {
      window.showMsg(`设备代理端口设置失败`, false, true);
    }
  );
};
let delProxy = () => {
  runAdbCommand(
    `清除代理中`,
    `shell settings put global http_proxy :0`,
    (res) => {
      const [stdout, deviceInfo] = res;
      runAdbCommand(
        "清理代理中",
        "shell settings delete global http_proxy",
        null,
        null,
        deviceInfo
      );
      runAdbCommand(
        "清理代理中",
        "shell settings delete global global_http_proxy_host",
        null,
        null,
        deviceInfo
      );
      runAdbCommand(
        "清理代理中",
        "shell settings delete global global_http_proxy_port",
        (res) => {
          window.showMsg(`清除代理成功`, false, true);
          window.outPlugin();
        },
        (error) => {
          const [errorInfo, deviceInfo] = error;
          var lines = errorInfo.message.trim().split("\n");
          var lastLine = lines[lines.length - 1];
          window.showMsg(`清除代理失败:${lastLine}`, false, true);
          return;
        },
        deviceInfo
      );
    },
    (error) => {
      const [errorInfo, deviceInfo] = error;
      var lines = errorInfo.message.trim().split("\n");
      var lastLine = lines[lines.length - 1];
      window.showMsg(`清除代理失败:${lastLine}`, false, true);
      return;
    }
  );
};

let setProxy = (port) => {
  let interfaces = os.networkInterfaces();
  let ip;
  for (let interfaceName in interfaces) {
    const interface = interfaces[interfaceName];
    for (let i = 0; i < interface.length; i++) {
      const address = interface[i];
      if (address.family === "IPv4" && !address.internal) {
        if (!address.address.startsWith(0)) {
          ip = address.address;
          console.warn(ip);
          break;
        }
      }
    }
  }
  if (ip) {
    runAdbCommand(
      `设置代理${ip}:${port}中`,
      `shell settings put global http_proxy '${ip}:${port}'`,
      (res) => {
        const [stdout, deviceInfo] = res;
        console.info(stdout);
        window.showMsg(`设置代理成功,如要清除请输入"清除代理"`, false, true);
        window.outPlugin();
      },
      (error) => {
        const [errorInfo, deviceInfo] = error;
        var lines = errorInfo.message.trim().split("\n");
        var lastLine = lines[lines.length - 1];
        window.showMsg(`设置代理失败:${lastLine}`, false, true);
        return;
      }
    );
  } else {
    system.showMsg("获取ip失败", false, true);
  }
};
exports.proxyPortConfig = async (port, onSuccess, onError) => {
  proxyPortConfig(port, onSuccess, onError);
};

let proxyPortConfig = async (port, onSuccess, onError) => {
  if (port) {
    window.setDBItem("proxyPort", port);
    onSuccess(port);
    return;
  }
  if (window.getDBItem("proxyPort") == null) {
    let proxy = null;

    console.log(`不存在proxyPort参数`);
    utools.setSubInput(({ text }) => {
      console.warn(text);
      proxy = text;
      mCallbackSetList([
        {
          description: "设置后如需修改可输入:APK代理端口设置",
          title: `设置端口:${text}`,
          type: "proxy",
          text,
          onSuccess,
          onError,
        },
      ]);
    }, "请输入代理端口,如8899");
  } else {
    onSuccess(window.getDBItem("proxyPort"));
  }
};

const DB_FAVORITES_KEY = "adb_launch_favorites";
const DB_HISTORY_KEY = "adb_launch_history";
let mLaunchMode = "normal";

function getFavorites() {
  const data = window.getDBItem(DB_FAVORITES_KEY);
  return Array.isArray(data) ? data : [];
}

function saveFavorites(list) {
  window.setDBItem(DB_FAVORITES_KEY, list);
}

function getHistory() {
  const data = window.getDBItem(DB_HISTORY_KEY);
  return Array.isArray(data) ? data : [];
}

function saveHistory(list) {
  window.setDBItem(DB_HISTORY_KEY, list);
}

function addHistoryItem(cmd) {
  let history = getHistory();
  history = history.filter(item => item !== cmd);
  history.unshift(cmd);
  if (history.length > 20) {
    history = history.slice(0, 20);
  }
  saveHistory(history);
}

function addFavoriteItem(cmd) {
  let favorites = getFavorites();
  if (!favorites.includes(cmd)) {
    favorites.push(cmd);
    saveFavorites(favorites);
  }
}

const renderAdbLaunchList = (searchWord, callbackSetList) => {
  if (mLaunchMode === "manage") {
    const favorites = getFavorites();
    const history = getHistory();
    const list = [];

    // 1. Show existing favorites to let user unfavorite them
    favorites.forEach(cmd => {
      list.push({
        title: `❌ 取消收藏：adb ${cmd}`,
        description: "点击从收藏列表中移除此命令",
        type: "unfavorite",
        command: cmd
      });
    });

    // 2. Show history items not in favorites to let user favorite them
    history.forEach(cmd => {
      if (!favorites.includes(cmd)) {
        list.push({
          title: `⭐ 收藏历史：adb ${cmd}`,
          description: "点击将此历史命令加入收藏列表",
          type: "favorite_history",
          command: cmd
        });
      }
    });

    list.push({
      title: "⬅️ 返回主菜单",
      description: "返回历史与收藏列表",
      type: "back"
    });
    callbackSetList(list);
    return;
  }

  const favorites = getFavorites();
  const history = getHistory();

  if (searchWord && searchWord.trim()) {
    const word = searchWord.trim();
    let cleanCmd = word;
    if (cleanCmd.toLowerCase().startsWith("adb ")) {
      cleanCmd = cleanCmd.substring(4).trim();
    }

    const list = [
      {
        title: `⚡ 运行: adb ${cleanCmd}`,
        description: "运行此命令并记入历史",
        type: "run_custom",
        command: cleanCmd
      },
      {
        title: `⭐ 收藏并运行: adb ${cleanCmd}`,
        description: "收藏并运行此命令",
        type: "favorite_run_custom",
        command: cleanCmd
      }
    ];

    const wordLower = cleanCmd.toLowerCase();
    const matchedFavorites = favorites.filter(cmd => cmd.toLowerCase().includes(wordLower) && cmd.toLowerCase() !== wordLower);
    const matchedHistory = history.filter(cmd => cmd.toLowerCase().includes(wordLower) && cmd.toLowerCase() !== wordLower && !favorites.map(f => f.toLowerCase()).includes(cmd.toLowerCase()));

    matchedFavorites.forEach(cmd => {
      list.push({
        title: `★ adb ${cmd}`,
        description: "⭐ 收藏的命令 - 点击直接运行",
        type: "run_saved",
        command: cmd
      });
    });

    matchedHistory.forEach(cmd => {
      list.push({
        title: `🕒 adb ${cmd}`,
        description: "历史命令 - 点击直接运行",
        type: "run_saved",
        command: cmd
      });
    });

    callbackSetList(list);
  } else {
    const list = [];

    favorites.forEach(cmd => {
      list.push({
        title: `★ adb ${cmd}`,
        description: "⭐ 收藏的命令 - 点击直接运行",
        type: "run_saved",
        command: cmd
      });
    });

    history.forEach(cmd => {
      list.push({
        title: `🕒 adb ${cmd}`,
        description: "历史命令 - 点击直接运行",
        type: "run_saved",
        command: cmd
      });
    });

    if (list.length === 0) {
      list.push({
        title: "暂无历史或收藏命令",
        description: "请在输入框中输入命令（如 shell am start -n ...）后执行",
        type: "tip"
      });
    } else {
      list.push({
        title: "⚙️ 清空所有历史命令",
        description: "清除所有历史记录",
        type: "clear_history"
      });
      if (favorites.length > 0 || history.length > 0) {
        list.push({
          title: "⚙️ 管理收藏与历史 (点击收藏历史/取消收藏)",
          description: "进入管理模式，从历史命令中添加收藏，或取消已有收藏",
          type: "manage_favorites"
        });
      }
    }

    callbackSetList(list);
  }
};

function executeAdbLaunchCommand(cmd) {
  runAdbCommand(
    `执行 adb ${cmd} 中`,
    cmd,
    (res) => {
      const [stdout, deviceInfo] = res;
      console.log(`执行成功: ${stdout}`);
      const summary = stdout.trim() ? stdout.trim().substring(0, 100) : "执行成功，无输出";
      window.showMsg(summary, false, true);
    },
    (error) => {
      const [errorInfo, deviceInfo] = error;
      console.error(`执行失败:`, errorInfo);
      const lastLine = errorInfo && errorInfo.message 
        ? errorInfo.message.trim().split("\n").pop() 
        : "未知错误";
      window.showMsg(`执行失败: ${lastLine}`, false, true);
    }
  );
}

exports.adbLaunchEnter = async (action, callbackSetList) => {
  mCallbackSetList = callbackSetList;
  mLaunchMode = "normal";
  const downloadRes = await downloadConfig();
  if (!downloadRes) return;
  const adbRes = await adbConfig();
  if (!adbRes) return;

  if (action.type === "regex" && action.payload) {
    let cleanCmd = action.payload.trim();
    const isUrl = /^https?:\/\//i.test(cleanCmd);
    if (isUrl) {
      cleanCmd = `shell am start -a android.intent.action.VIEW -d "${cleanCmd}"`;
    } else if (cleanCmd.toLowerCase().startsWith("adb ")) {
      cleanCmd = cleanCmd.substring(4).trim();
    }
    addHistoryItem(cleanCmd);
    renderAdbLaunchList("", callbackSetList);
    executeAdbLaunchCommand(cleanCmd);
    return;
  }

  renderAdbLaunchList("", callbackSetList);
};

exports.adbLaunchSearch = (action, searchWord, callbackSetList) => {
  mCallbackSetList = callbackSetList;
  renderAdbLaunchList(searchWord, callbackSetList);
};

exports.adbLaunchSelect = (action, itemData) => {
  const type = itemData.type;
  const cmd = itemData.command;

  if (type === "tip") {
    return;
  }

  if (type === "adb") {
    mCallbackSetList([]);
    runAdbCommand(
      itemData.text,
      itemData.command,
      itemData.onSuccess,
      itemData.onError,
      itemData.description
    );
    return;
  }

  if (type === "back") {
    mLaunchMode = "normal";
    renderAdbLaunchList("", mCallbackSetList);
    return;
  }

  if (type === "manage_favorites") {
    mLaunchMode = "manage";
    renderAdbLaunchList("", mCallbackSetList);
    return;
  }

  if (type === "clear_history") {
    saveHistory([]);
    window.showMsg("历史命令已清空", false, true);
    renderAdbLaunchList("", mCallbackSetList);
    return;
  }

  if (type === "unfavorite") {
    let favorites = getFavorites();
    favorites = favorites.filter(f => f !== cmd);
    saveFavorites(favorites);
    window.showMsg("取消收藏成功", false, true);
    renderAdbLaunchList("", mCallbackSetList);
    return;
  }

  if (type === "favorite_history") {
    addFavoriteItem(cmd);
    window.showMsg("加入收藏成功", false, true);
    renderAdbLaunchList("", mCallbackSetList);
    return;
  }

  if (type === "run_saved") {
    addHistoryItem(cmd);
    executeAdbLaunchCommand(cmd);
  }

  if (type === "run_custom") {
    addHistoryItem(cmd);
    executeAdbLaunchCommand(cmd);
  }

  if (type === "favorite_run_custom") {
    addFavoriteItem(cmd);
    addHistoryItem(cmd);
    executeAdbLaunchCommand(cmd);
  }
};

