const fs = require("fs");
const os = require("os");
const child_process = require("child_process");

window.exports = {
  apkInstall: {
    // 注意：键对应的是 plugin.json 中的 features.code
    mode: "none", // 用于无需 UI 显示，执行一些简单的代码
    args: {
      enter: (action) => {
        console.log(`action: ${action.payload}`);
        child_process.exec(
          getCmd(
            action.payload,
            "/Users/xiangjuncheng/Android/sdk/platform-tools/adb"
          ),
          (error, stdout, stderr) => {
            if (error) {
              console.error(`执行的错误: ${error}`);
              return;
            }
            console.log(`stdout: ${stdout}`);
            console.error(`stderr: ${stderr}`);
          }
        );
        //runInTerminal("adb devices", "/Users/xiangjuncheng/Downloads");
        utools.onPluginEnter(({ code, type, payload, option }) => {
          console.log("用户进入插件应用", code, type, payload);
        });
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

let getCmd = (url, adb) => {
  command = `cd /Users/xiangjuncheng/Downloads && curl ${url} --output temp.apk && ${adb} install -r temp.apk`;
  console.log(command);
  return command;
};

// 在终端中执行
if (process.platform !== "linux")
  runInTerminal = function (cmdline, dir) {
    let command = getCommandToLaunchTerminal(cmdline, dir);
    child_process.exec(command);
  };

let getCommandToLaunchTerminal = (cmdline, dir) => {
  let cd, command;
  if (utools.isWindows()) {
    let appPath = path.join(
      utools.getPath("home"),
      "/AppData/Local/Microsoft/WindowsApps/"
    );
    // 直接 existsSync wt.exe 无效
    if (fs.existsSync(appPath) && fs.readdirSync(appPath).includes("wt.exe")) {
      cmdline = cmdline.replace(/"/g, `\\"`);
      cd = dir ? `-d "${dir.replace(/\\/g, "/")}"` : "";
      command = `${appPath}wt.exe ${cd} cmd /k "${cmdline}"`;
    } else {
      cmdline = cmdline.replace(/"/g, `^"`);
      cd = dir ? `cd /d "${dir.replace(/\\/g, "/")}" &&` : "";
      command = `${cd} start "" cmd /k "${cmdline}"`;
    }
  } else if (utools.isMacOs()) {
    cmdline = cmdline.replace(/"/g, `\\"`);
    cd = dir ? `cd ${dir.replace(/ /g, "\\\\ ")} &&` : "";
    command = fs.existsSync("/Applications/iTerm.app")
      ? `osascript -e 'tell application "iTerm"
                if application "iTerm" is running then
                  create window with default profile
                end if
                tell current session of first window to write text "clear && ${cd} ${cmdline}"
                activate
              end tell'`
      : `osascript -e 'tell application "Terminal"
                if application "Terminal" is running then
                  do script "clear && ${cd} ${cmdline}"
                else
                  do script "clear && ${cd} ${cmdline}" in window 1
                end if
                activate
              end tell'`;
  }
  return command;
};
