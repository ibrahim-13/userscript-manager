/**
 * @typedef {import('./dashboard.js').UserScriptMetadata} UserScriptMetadata
 * @typedef {import('./dashboard.js').UserScriptData} UserScriptData
 * @typedef {import('./dashboard.js').UserScriptMenu} UserScriptMenu
 * @typedef {import('./dashboard.js').TabData} TabData
 * @typedef {import('./dashboard.js').UserScriptLog} UserScriptLog
 */

/**
 * @type {{[key: string]: UserScriptLog[]}}
 */
let scriptLogs = {};
/**
 * @type {{[key: string]: TabData}}
 */
let tabData = {};

/**
 * @function isUserScriptsAvailable
 * @returns {boolean} returns true if user script api is available, otherwise false
 */
function isUserScriptsAvailable() {
  try {
    // Method call which throws if API permission or toggle is not enabled.
    chrome.userScripts.getScripts();
    return true;
  } catch {
    // Not available.
    return false;
  }
}

/**
 * @function generateId
 * @returns {string} id generated from timestamp
 */
function generateId() {
  return btoa(''+Date.now());
}

function gmApi(scriptId) {
  chrome.runtime.sendMessage({type: 'USER_SCRIPT_MSG_GM_REGISTER_SCRIPT', scriptId});

  /**
   * @type {Array<UserScriptMenu>}
   */
  let menus = [];

  function generateId() {
    return btoa(''+Date.now());
  }

  const getValue = (k, v) => {
    chrome.runtime.sendMessage({
      type: 'USER_SCRIPT_MSG_GM_SETVALUE',
      key: k,
      value: v,
      scriptId,
    });
  }
  const setValue = (k, v) => {
    chrome.runtime.sendMessage({
      type: 'USER_SCRIPT_MSG_GM_SETVALUE',
      key: k,
      value: v,
      scriptId,
    });
  }
  const log = (msg) => {
    chrome.runtime.sendMessage({
      type: 'USER_SCRIPT_MSG_GM_LOG',
      data: msg,
      scriptId,
    });
  }
  const registerMenu = (name, callback, opt) => {
    const menuId = generateId();
    const menuIndex = menus.findIndex(i => (opt || {}).id === i.id);
    if(menuIndex !== -1) {
      menus[menuIndex].name = name;
      menus[menuIndex].callback = callback;
    } else {
      menus.push({menuId, name, callback});
    }
    chrome.runtime.sendMessage({
      type: 'USER_SCRIPT_MSG_GM_REGISTER_MENU',
      menuId,
      name,
      scriptId,
    });
    return menuId;
  }
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if(message.type == 'USER_SCRIPT_MSG_TRIGGER_MENU') {
      const m = menus.findIndex(i => i.menuId);
      if(m != -1 && !!menus[m].callback) {
        menus[m].callback();
      }
    }
  });
  return {
    GM_setValue: setValue,
    GM_getValue: getValue,
    GM_registerMenuCommand: registerMenu,
    GM_log: log,
  };
}

/**
 * @function wrapErrorCatcher wrap try-catch and script name for the user script
 * @param {UserScriptData} usData user script data
 * @returns {string}
 */
function wrapErrorCatcher(usData) {
  return `//# sourceURL=${chrome.runtime.getURL(`/${encodeURI(usData.name)}.user.js`)}
try {
  (async () => {
    const scriptId = "${usData.id}";
    const gmApi = ${gmApi.toString()};
    const {GM_setValue, GM_getValue, GM_log, GM_registerMenuCommand} = gmApi(scriptId);
    ${usData.code}
  })();
} catch (e) {
  console.error("================================");
  console.error("error executing userscript ${encodeURI(usData.name)}.user.js");
  console.error("================================");
  console.error(e);
}`;
}

/**
 * @async
 * @returns {Promise<Array<UserScriptData>>} user script data
 */
function loadScriptsFromStorage() {
  return new Promise(resolve => {
    chrome.storage.local.get('userscripts', (result) => {
      const userscripts = result.userscripts || [];
      resolve(userscripts);
    });
  })
}

/**
 * @function loadUserContentScripts load user scripts
 */
async function loadUserContentScripts() {
    if (!isUserScriptsAvailable()) {
        console.log("please enable user script option for extension");
        return;
    }
    chrome.userScripts.configureWorld({
      csp: "script-src 'self'",
      messaging: true,
    });
    const userScripts = await loadScriptsFromStorage();
    const installedScripts = await chrome.userScripts.getScripts();
    userScripts.forEach(async elem => {
      const scriptExists = installedScripts.findIndex(i => i.id === elem.id) != -1;
      if(elem.enabled) {
        const opt = [{
          id: elem.id,
          matches: elem.match,
          excludeMatches: elem.exclude,
          js: [{code: wrapErrorCatcher(elem)}],
          //world: "MAIN",
        }];
        if (scriptExists) {
            chrome.userScripts.update(opt);
        } else {
            chrome.userScripts.register(opt);
        }
      } else {
        if (scriptExists) {
          chrome.userScripts.unregister({ ids: [elem.id] });
        }
      }
    });
    let removedScripts = new Array();
    for(const script of installedScripts) {
      if (userScripts.findIndex(i => i.id == script.id) == -1) {
        removedScripts.push(script.id);
      }
    }
    chrome.userScripts.unregister({ ids: removedScripts });
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('User script Manager installed')
  loadUserContentScripts()
    .then(() => console.log('user scripts loaded'))
    .catch(() => console.log('error loading user scripts'));
});

chrome.runtime.onUserScriptMessage.addListener((message, sender, sendResponse) => {const tabDataKey = '' + sender.tab.id;
  if (!tabData[tabDataKey]) {
    tabData[tabDataKey] = {};
    tabData[tabDataKey].menu = [];
    tabData[tabDataKey].scriptIds = [];
  }
  if (message.type === 'USER_SCRIPT_MSG_GM_LOG') {
    const { scriptId, data } = message;
    if (!scriptLogs[scriptId]) {
      scriptLogs[scriptId] = [];
    }
    const entry = {
      time: new Date().toLocaleTimeString(),
      data,
    };
    scriptLogs[scriptId].push(entry);
    // Limit log history length (e.g. 100 entries)
    if (scriptLogs[scriptId].length > 100) {
      scriptLogs[scriptId].shift();
    }
  } else if (message.type === 'USER_SCRIPT_MSG_GM_REGISTER_MENU') {
    const { scriptId, menuId, name } = message;
    const menuIndex = tabData[tabDataKey].menu.findIndex(i => i.menuId === menuId && i.scriptId === scriptId);
    if (menuIndex !== -1) {
      tabData[tabDataKey].menu[menuIndex].name = name;
    } else {
      tabData[tabDataKey].menu.push({scriptId, menuId, name});
    }
  } else if (message.type === 'USER_SCRIPT_MSG_GM_REGISTER_SCRIPT') {
    tabData[tabDataKey].scriptIds.push(message.scriptId);
  }
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  tabData[tabId] = null;
});

function extensionBadgeUpdater(tabId) {
  if(tabData[tabId]) {
    chrome.action.setBadgeText({ text: '' + tabData[tabId].scriptIds.length });
  } else {
    chrome.action.setBadgeText({});
  }
}

chrome.tabs.onUpdated.addListener(extensionBadgeUpdater);
chrome.tabs.onActivated.addListener((activeInfo) => extensionBadgeUpdater(activeInfo.tabId));

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'USER_SCRIPT_MSG_GET_SCRIPT_LOGS') {
    const logs = scriptLogs[message.scriptId] || [];
    sendResponse(logs);
  } else if (message.type === 'USER_SCRIPT_MSG_GET_USERSCRIPT_ALL') {
    loadScriptsFromStorage()
      .then(res => sendResponse({ scripts: res }))
      .catch(() => sendResponse({ scripts: [] }));
    return true;
  } else if (message.type === 'USER_SCRIPT_MSG_GET_TAB_DATA') {
    const ret = tabData[message.tabId] || {menu: [], scriptIds: []};
    sendResponse(ret);
  } else if (message.type === 'USER_SCRIPT_MSG_LOAD_USERSCRIPT') {
    loadUserContentScripts()
      .then(() => console.log('user scripts loaded from message handler'))
      .catch(() => console.log('error loading user scripts from message handler'));
  }
});
