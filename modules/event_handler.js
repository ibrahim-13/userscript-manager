import { withGmApi } from './gm-api.js'

/**
 * @typedef {import("./chrome.js")} chrome
 */

/**
 * @typedef {import('./types.js').TabData} TabData
 * @typedef {import('./types.js').UserScriptData} UserScriptData
 * @typedef {import('./types.js').UserScriptLog} UserScriptLog
 * @typedef {import('./types.js').UserScriptMenu} UserScriptMenu
 * @typedef {import('./types.js').UserScriptMetadata} UserScriptMetadata
 * @typedef {import('./storage_handler.js').StorageHandler} StorageHandler
 */

/***************************
 * @class Handle all events
 ***************************/
export class EventHandler {
  #storageHandler;
  /**
   * @type {{[key: string]: UserScriptLog[]}}
   */
  #scriptLogs = {};
  /**
   * @type {{[key: string]: TabData}}
   */
  #tabData = {};

  /**
   * @constructor
   * @param {StorageHandler} storageHandler 
   */
  constructor(storageHandler) {
    this.#storageHandler = storageHandler;
  }

  /**
   * @function isUserScriptsAvailable
   * @returns {boolean} returns true if user script api is available, otherwise false
   */
  #isUserScriptsAvailable() {
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
  * @function loadUserContentScripts load user scripts
  */
  async #loadUserContentScripts() {
    this.#tabData = {};
    if (!this.#isUserScriptsAvailable()) {
        console.log("please enable user script option for extension");
        return;
    }
    chrome.userScripts.configureWorld({
      csp: "script-src 'self'",
      messaging: true,
    });
    const userScripts = await this.#storageHandler.LoadScripts();
    const installedScripts = await chrome.userScripts.getScripts();
    userScripts.forEach(elem => {
      const isScriptInstalled = installedScripts.findIndex(i => i.id === elem.id) != -1;
      if(elem.enabled) {
        const opt = [{
          id: elem.id,
          matches: elem.match,
          excludeMatches: elem.exclude,
          js: [{code: withGmApi(elem)}],
          //world: "MAIN",
        }];
        if (isScriptInstalled) {
          chrome.userScripts.update(opt);
        } else {
          chrome.userScripts.register(opt);
        }
      } else {
        console.log("user script is disabled")
        if (isScriptInstalled) {
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

  /**
   * @param {number} tabId 
   */
  #extensionBadgeUpdater(tabId) {
    if(this.#tabData[tabId]) {
      chrome.action.setBadgeText({ text: '' + this.#tabData[tabId].scriptIds.length });
    } else {
      chrome.action.setBadgeText({});
    }
  }

  /**
   * @param {string} tabDataKey
   * @param {{ scriptId: string }} message 
   * @param {chrome.runtime.MessageSender} sender
   * @param {(response: {[key: string]: string}) => void} sendResponse
   * @returns {boolean}
   */
  #getStorage(tabDataKey, message, sender, sendResponse) {
    const { scriptId } = message;
    if(!scriptId) return false;
    this.#storageHandler.LoadScriptValue()
      .then(storage => sendResponse(storage[scriptId] || {}))
      .catch(() => sendResponse({}));
    return true;
  }

  /**
   * @param {string} tabDataKey
   * @param {{ scriptId: string }} message 
   * @param {chrome.runtime.MessageSender} sender
   * @param {(response: Array<UserScriptLog>) => void} sendResponse
   * @returns {boolean}
   */
  #getScriptLog(tabDataKey, message, sender, sendResponse) {
    const logs = this.#scriptLogs[message.scriptId] || [];
    sendResponse(logs);
    return false;
  }

  /**
   * @param {string} tabDataKey
   * @param {none} message 
   * @param {chrome.runtime.MessageSender} sender
   * @param {(response: { scripts: Array<UserScriptData> }) => void} sendResponse
   * @returns {boolean}
   */
  #getAllUserScripts(tabDataKey, message, sender, sendResponse) {
    this.#storageHandler.LoadScripts()
      .then(res => sendResponse({ scripts: res }))
      .catch(() => sendResponse({ scripts: [] }));
    return true;
  }

  /**
   * @param {string} tabDataKey
   * @param {{ data: UserScriptData }} message 
   * @param {chrome.runtime.MessageSender} sender
   * @param {(response?: any) => void} sendResponse
   * @returns {boolean}
   */
  #setUserScript(tabDataKey, message, sender, sendResponse) {
    if (!!message.data) {
      this.#storageHandler.SaveScript(message.data)
        .then(() => this.#loadUserContentScripts()
          .then(() => console.log('user scripts loaded after adding/updating script'))
          .catch(() => console.log('error loading user scripts after adding/updating script')));
    }
    return false;
  }

  /**
   * @param {string} tabDataKey
   * @param {{ data: Array<UserScriptData> }} message 
   * @param {chrome.runtime.MessageSender} sender
   * @param {(response?: any) => void} sendResponse
   * @returns {boolean}
   */
  #setAllUserScript(tabDataKey, message, sender, sendResponse) {
    if (!!message.data) {
      this.#storageHandler.SaveAllScripts(message.data)
        .then(() => this.#loadUserContentScripts()
          .then(() => console.log('user scripts loaded after adding/updating all scripts'))
          .catch(() => console.log('error loading user scripts after adding/updating all scripts')));
    }
    return false;
  }

  /**
   * @param {string} tabDataKey
   * @param {{ tabId: string }} message 
   * @param {chrome.runtime.MessageSender} sender
   * @param {(response: TabData) => void} sendResponse
   * @returns {boolean}
   */
  #getTabData(tabDataKey, message, sender, sendResponse) {
    const ret = this.#tabData[message.tabId] || {menu: [], scriptIds: []};
    sendResponse(ret);
    return false;
  }

  /**
   * @param {string} tabDataKey
   * @param {none} message 
   * @param {chrome.runtime.MessageSender} sender
   * @param {(response?: any) => void} sendResponse
   * @returns {boolean}
   */
  #loadUserScripts(tabDataKey, message, sender, sendResponse) {
    this.#loadUserContentScripts()
      .then(() => console.log('user scripts loaded from message handler'))
      .catch(() => console.log('error loading user scripts from message handler'));
    return false;
  }

  /**
   * @param {string} tabDataKey
   * @param {{ scriptId: string, data: {[key: string]: UserScriptLog[]} }} message 
   * @param {chrome.runtime.MessageSender} sender
   * @param {(response?: any) => void} sendResponse
   * @returns {boolean}
   */
  #GM_log(tabDataKey, message, sender, sendResponse) {
    const { scriptId, data } = message;
    if (!this.#scriptLogs[scriptId]) {
      this.#scriptLogs[scriptId] = [];
    }
    this.#scriptLogs[scriptId].push({
      time: new Date().toLocaleTimeString(),
      data,
    });
    // Limit log history length (e.g. 100 entries)
    if (this.#scriptLogs[scriptId].length > 100) {
      this.#scriptLogs[scriptId].shift();
    }
    return false;
  }

  /**
   * @param {string} tabDataKey
   * @param {{ scriptId: string, menuId: string, name: string }} message 
   * @param {chrome.runtime.MessageSender} sender
   * @param {(response?: any) => void} sendResponse
   * @returns {boolean}
   */
  #GM_regesterMenu(tabDataKey, message, sender, sendResponse) {
    const { scriptId, menuId, name } = message;
    const menuIndex = this.#tabData[tabDataKey].menu.findIndex(i => i.menuId === menuId && i.scriptId === scriptId);
    if (menuIndex !== -1) {
      this.#tabData[tabDataKey].menu[menuIndex].name = name;
    } else {
      this.#tabData[tabDataKey].menu.push({scriptId, menuId, name});
    }
    return false;
  }

  /**
   * @param {string} tabDataKey
   * @param {{ scriptId: string }} message 
   * @param {chrome.runtime.MessageSender} sender
   * @param {(response?: any) => void} sendResponse
   * @returns {boolean}
   */
  #GM_registerScriptRun(tabDataKey, message, sender, sendResponse) {
    const { scriptId } = message;
    if(!scriptId) return;
    if(!this.#tabData[tabDataKey].scriptIds.includes(scriptId)) {
      this.#tabData[tabDataKey].scriptIds.push(message.scriptId);
    }
    return false;
  }

  /**
   * @param {string} tabDataKey
   * @param {{ scriptId: string, key: string, value: string }} message 
   * @param {chrome.runtime.MessageSender} sender
   * @param {(response: {[key: string]: string}) => void} sendResponse
   * @returns {boolean}
   */
  #GM_setValue(tabDataKey, message, sender, sendResponse) {
    const { scriptId, key, value } = message;
    if(!scriptId || !key) return false;
    this.#storageHandler.SaveScriptValueByKey(scriptId, key, value)
      .then(storage => sendResponse(storage[scriptId] || {}))
      .catch(() => sendResponse({}));
    return true;
  }

  /**
   * @param {string} tabDataKey
   * @param {{ scriptId: string, key: string }} message 
   * @param {chrome.runtime.MessageSender} sender
   * @param {(response: {[key: string]: string}) => void} sendResponse
   * @returns {boolean}
   */
  #GM_deleteValue(tabDataKey, message, sender, sendResponse) {
    const { scriptId, key } = message;
    if(!scriptId || !key) return;
    this.#storageHandler.DeleteScriptValueByKey(scriptId, key)
      .then(storage => sendResponse(storage[scriptId] || {}))
      .catch(() => sendResponse({}));
    return true;
  }

  /**
   * @param {chrome.runtime.InstalledDetails} datails 
   */
  onInstalledListener(datails) {
    console.log('User script Manager installed');
    this.#loadUserContentScripts()
      .then(() => console.log('user scripts loaded'))
      .catch(() => console.log('error loading user scripts'));
  }

  /**
   * @param {number} tabId 
   * @param {chrome.tabs.OnRemovedInfo} removeInfo 
   */
  onTabsRemovedListener(tabId, removeInfo) {
    this.#tabData[tabId] = null;
  }

  /**
   * 
   * @param {number} tabId 
   * @param {chrome.tabs.OnUpdatedInfo} changeInfo 
   * @param {chrome.tabs.Tab} tab 
   */
  onTabsUpdatedListener(tabId, changeInfo, tab) {
    if(changeInfo.status === 'loading' && !! this.#tabData[tabId]) {
      this.#tabData[tabId] = null;
    }
    this.#extensionBadgeUpdater(tabId);
  }

  /**
   * @param {chrome.tabs.OnActivatedInfo} activeInfo 
   */
  onTabsActivatedListener(activeInfo) {
    this.#extensionBadgeUpdater(activeInfo.tabId);
  }

  /**
   * @param {any} message 
   * @param {chrome.runtime.MessageSender} sender 
   * @param {(response?: any) => void} sendResponse 
   */
  onUserScriptMessageListener(message, sender, sendResponse) {
    const tabDataKey = '' + sender.tab.id;
    if (!this.#tabData[tabDataKey]) {
      this.#tabData[tabDataKey] = {};
      this.#tabData[tabDataKey].menu = [];
      this.#tabData[tabDataKey].scriptIds = [];
    }

    if (message.type === 'USER_SCRIPT_MSG_GET_STORAGE') {
      return this.#getStorage(tabDataKey, message, sender, sendResponse);
    } else if (message.type === 'USER_SCRIPT_MSG_GM_LOG') {
      return this.#GM_log(tabDataKey, message, sender, sendResponse);
    } else if (message.type === 'USER_SCRIPT_MSG_GM_REGISTER_MENU') {
      return this.#GM_regesterMenu(tabDataKey, message, sender, sendResponse);
    } else if (message.type === 'USER_SCRIPT_MSG_GM_REGISTER_SCRIPT_RUN') {
      return this.#GM_registerScriptRun(tabDataKey, message, sender, sendResponse)
    } else if (message.type === 'USER_SCRIPT_MSG_GM_SETVALUE') {
      return this.#GM_setValue(tabDataKey, message, sender, sendResponse);
    }
  }

  /**
   * @param {any} message 
   * @param {chrome.runtime.MessageSender} sender 
   * @param {(response?: any) => void} sendResponse 
   */
  onMessageListener(message, sender, sendResponse) {
    const tabDataKey = '';
    if (message.type === 'USER_SCRIPT_MSG_GET_STORAGE') {
      return this.#getStorage(tabDataKey, message, sender, sendResponse);
    } else if (message.type === 'USER_SCRIPT_MSG_GET_SCRIPT_LOGS') {
      return this.#getScriptLog(tabDataKey, message, sender, sendResponse);
    } else if (message.type === 'USER_SCRIPT_MSG_GET_USERSCRIPT_ALL') {
      return this.#getAllUserScripts(tabDataKey, message, sender, sendResponse);
    } else if (message.type === 'USER_SCRIPT_MSG_SET_USERSCRIPT') {
      return this.#setUserScript(tabDataKey, message, sender, sendResponse)
    }  else if (message.type === 'USER_SCRIPT_MSG_SET_USERSCRIPT_ALL') {
      return this.#setAllUserScript(tabDataKey, message, sender, sendResponse)
    } else if (message.type === 'USER_SCRIPT_MSG_GET_TAB_DATA') {
      return this.#getTabData(tabDataKey, message, sender, sendResponse);
    } else if (message.type === 'USER_SCRIPT_MSG_LOAD_USERSCRIPT') {
      return this.#loadUserScripts(tabDataKey, message, sender, sendResponse);
    } else if (message.type === 'USER_SCRIPT_MSG_GM_SETVALUE') {
      return this.#GM_setValue(tabDataKey, message, sender, sendResponse);
    } else if (message.type === 'USER_SCRIPT_MSG_GM_DELVALUE') {
      return this.#GM_deleteValue(tabDataKey, message, sender, sendResponse);
    }
  }
}