const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
const https = require("https");
const { apkEnter, apkPathEnter } = require("./apk");

window.exports = {
  apkInstall: {
    // 注意：键对应的是 plugin.json 中的 features.code
    mode: "none", // 用于无需 UI 显示，执行一些简单的代码
    args: {
      enter: async (action) => {
        console.log(action);
        try {
          if (action.code == "apkInstall") {
            apkEnter(action);
          } else if (action.code == "apkPath") {
            apkPathEnter(action);
          }
        } catch (e) {
          console.error(e);
        }
        // console.log('运行成功')
        // alert('运行成功')
      },
      search: (action, searchWord, callbackSetList) => {
        console.log(searchWord);
        if (!searchWord) return callbackSetList();
        return callbackSetList(getCmd(searchWord));
      },
      select: (action, itemData) => {
        window.utools.hideMainWindow();
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
      }
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
