/**
 * @typedef {import('./dashboard.js').UserScriptMetadata} UserScriptMetadata
 * @typedef {import('./dashboard.js').UserScriptData} UserScriptData
 */

/**
 * @function isUserScriptsAvailable
 * @returns {boolean} returns true if userscript api is available, otherwise false
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

function gmApi(scriptId, extensionId) {
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
  return {
    GM_setValue: setValue,
    GM_getValue: getValue,
    GM_log: log,
  };
}

/**
 * @function wrapErrorCatcher wrap try-catch and script name for the userscript
 * @param {UserScriptData} usdata userscript data
 * @returns {string}
 */
function wrapErrorCatcher(usdata) {
  return `//# sourceURL=${chrome.runtime.getURL(`/${encodeURI(usdata.name)}.user.js`)}
try {
  (async () => {
    const scriptId = ${usdata.id};
    const extensionId = "${chrome.runtime.id}";
    const gmApi = ${gmApi.toString()};
    const {GM_setValue, GM_getValue, GM_log} = gmApi(scriptId, extensionId);
    ${usdata.code}
  })();
} catch (e) {
  console.error("error executing userscript ${encodeURI(usdata.name)}.user.js");
  console.error(e);
}`;
}

/**
 * @async
 * @returns {Promise<Array<UserScriptData>>} userscript data
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
 * @function loadUserContentScripts load userscripts
 */
async function loadUserContentScripts() {
    if (!isUserScriptsAvailable()) {
        console.log("please enable userscript option for extension");
        return;
    }
    chrome.userScripts.configureWorld({
      csp: "script-src 'self'",
      messaging: true,
    });
    const userscripts = await loadScriptsFromStorage();
    const installedScripts = await chrome.userScripts.getScripts();
    userscripts.forEach(async elem => {
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
      if (userscripts.findIndex(i => i.id == script.id) == -1) {
        removedScripts.push(script.id);
      }
    }
    chrome.userScripts.unregister({ ids: removedScripts });
}

let scriptLogs = {};

chrome.runtime.onInstalled.addListener(() => {
  console.log('Userscript Manager installed')
  loadUserContentScripts()
    .then(() => console.log('userscripts loaded'))
    .catch(() => console.log('error loading userscripts'));
});

chrome.runtime.onUserScriptMessage.addListener((message, sender, sendResponse) => {
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
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'USER_SCRIPT_MSG_GET_SCRIPT_LOGS') {
    const logs = scriptLogs[message.scriptId] || [];
    sendResponse(logs);
  } else if (message.type === 'USER_SCRIPT_MSG_SET_SCRIPT_COUNT') {
    chrome.action.setBadgeText({
      text: message.scriptCount,
    });
  } else if (message.type === 'USER_SCRIPT_MSG_LOAD_USERSCRIPT') {
    loadUserContentScripts()
      .then(() => console.log('userscripts loaded from message handler'))
      .catch(() => console.log('error loading userscriptsfrom message handler'));
  }
  return false;
});
