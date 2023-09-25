const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
const https = require("https");
const {
  apkEnter,
  apkPathEnter,
  runAdbCommand,
  cancel,
  adbCmdInput,
  proxyPortConfig,
} = require("./apk");

utools.onPluginOut((processExit) => {
  if (processExit) {
    cancel();
  } else {
    console.log("插件应用隐藏后台");
  }
});

let mCallbackSetList;
window.exports = {
  apkInstall: {
    // 注意：键对应的是 plugin.json 中的 features.code
    mode: "list", // 用于无需 UI 显示，执行一些简单的代码
    args: {
      enter: async (action, callbackSetList) => {
        console.log(action);
        mCallbackSetList = callbackSetList;
        try {
          apkEnter(action, callbackSetList);
        } catch (e) {
          console.error(e);
        }
        // console.log('运行成功')
        // alert('运行成功')
      },
      select: (action, itemData) => {
        mCallbackSetList([]);
        runAdbCommand(
          itemData.text,
          itemData.command,
          itemData.onSuccess,
          itemData.onError,
          itemData.description
        );
        // window.utools.hideMainWindow();
        // window.utools.show();
      },
    },
  },
  apkPath: {
    // 注意：键对应的是 plugin.json 中的 features.code
    mode: "none", // 用于无需 UI 显示，执行一些简单的代码
    args: {
      enter: async (action) => {
        console.log(action);
        try {
          apkPathEnter(action);
        } catch (e) {
          console.error(e);
        }
        // console.log('运行成功')
        // alert('运行成功')
      },
    },
  },
  adbTool: {
    // 注意：键对应的是 plugin.json 中的 features.code
    mode: "list",
    args: {
      enter: async (action, callbackSetList) => {
        console.log(action);
        mCallbackSetList = callbackSetList;
        adbCmdInput(action, callbackSetList);
      },
      select: (action, itemData) => {
        console.log(`select ${itemData}`);
        mCallbackSetList([]);
        if (itemData.type == "proxy") {
          proxyPortConfig(itemData.text, itemData.onSuccess, itemData.onError);
        } else {
          runAdbCommand(
            itemData.text,
            itemData.command,
            itemData.onSuccess,
            itemData.onError,
            itemData.description
          );
        }
        // window.utools.hideMainWindow();
        // window.utools.show();
      },
    },
  },
};

window.showMsg = (msg, noLog, needNotify) => {
  if (!noLog) {
    console.log(msg);
  }
  utools.setSubInput(({ text }) => {
    console.log(text);
  }, msg);
  if (needNotify) {
    showNotification(msg);
  }
};

let showNotification = (content) => {
  utools.showNotification(content);
};

window.getDBItem = (key) => {
  return utools.dbStorage.getItem(key);
};

window.setDBItem = (key, value) => {
  utools.dbStorage.setItem(key, value);
};

window.removeDBItem = (key) => {
  utools.dbStorage.removeItem(key);
};

window.hideMainWindow = () => {
  window.utools.hideMainWindow();
};

window.showOpenDialog = async (obj) => {
  return await utools.showOpenDialog(obj);
};

window.getUtoolPath = (path) => {
  return utools.getPath(path);
};

window.createWriteStream = (savePath) => {
  return fs.createWriteStream(savePath);
};

window.shellShowItemInFolder = (path) => {
  utools.shellShowItemInFolder(`${path}`);
};

window.outPlugin = (path) => {
  utools.outPlugin();
};
