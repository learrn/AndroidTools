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
  adbLaunchEnter,
  adbLaunchSearch,
  adbLaunchSelect,
} = require("./apk");

utools.onPluginOut((processExit) => {
  if (processExit) {
    cancel();
  } else {
    console.log("插件应用隐藏后台");
  }
});

let mCallbackSetList;
// Keep a single MCP child process per plugin lifecycle.
let mcpProcess = null;

const MCP_COMMANDS = {
  START: "start-mcp-service",
  STOP: "stop-mcp-service",
  STATUS: "mcp-service-status",
};

const isMcpRunning = () => mcpProcess && !mcpProcess.killed && mcpProcess.exitCode === null;

const startMcpService = () => {
  if (isMcpRunning()) {
    showNotification(`MCP service is already running. PID: ${mcpProcess.pid}`);
    return;
  }

  const mcpServerPath = path.join(__dirname, "mcp-server.js");
  mcpProcess = child_process.spawn(process.execPath, [mcpServerPath], {
    cwd: __dirname,
    windowsHide: true,
    stdio: ["pipe", "pipe", "pipe"],
  });

  mcpProcess.on("error", (err) => {
    showNotification(`Failed to start MCP service: ${err.message}`);
  });

  mcpProcess.on("exit", (code, signal) => {
    const msg = code !== null ? `exit code ${code}` : `signal ${signal || "unknown"}`;
    mcpProcess = null;
    showNotification(`MCP service stopped (${msg})`);
  });

  showNotification(`MCP service started. PID: ${mcpProcess.pid}`);
};

const stopMcpService = () => {
  if (!isMcpRunning()) {
    showNotification("MCP service is not running");
    mcpProcess = null;
    return;
  }
  mcpProcess.kill();
};

const showMcpServiceStatus = () => {
  if (isMcpRunning()) {
    showNotification(`MCP service is running. PID: ${mcpProcess.pid}`);
  } else {
    showNotification("MCP service is not running");
  }
};

// Map uTools action payloads to MCP service operations.
const mcpServiceEnter = (action) => {
  const cmd = action?.payload;
  if (!cmd || cmd === MCP_COMMANDS.START) {
    startMcpService();
    return;
  }
  if (cmd === MCP_COMMANDS.STOP) {
    stopMcpService();
    return;
  }
  if (cmd === MCP_COMMANDS.STATUS) {
    showMcpServiceStatus();
    return;
  }
  startMcpService();
};


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
  mcpService: {
    mode: "none",
    args: {
      enter: async (action) => {
        try {
          mcpServiceEnter(action);
        } catch (e) {
          console.error(e);
          showNotification(`MCP service error: ${e.message}`);
        }
      },
    },
  },
  adbLaunch: {
    mode: "list",
    args: {
      enter: async (action, callbackSetList) => {
        console.log(action);
        mCallbackSetList = callbackSetList;
        try {
          adbLaunchEnter(action, callbackSetList);
        } catch (e) {
          console.error(e);
        }
      },
      search: async (action, searchWord, callbackSetList) => {
        try {
          adbLaunchSearch(action, searchWord, callbackSetList);
        } catch (e) {
          console.error(e);
        }
      },
      select: (action, itemData) => {
        mCallbackSetList([]);
        try {
          adbLaunchSelect(action, itemData);
        } catch (e) {
          console.error(e);
        }
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
