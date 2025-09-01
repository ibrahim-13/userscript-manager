/**
 * @typedef {import("./chrome.js")} chrome
 */

/**
 * @typedef {import('./types.js').TabData} TabData
 * @typedef {import('./types.js').UserScriptData} UserScriptData
 * @typedef {import('./types.js').UserScriptLog} UserScriptLog
 * @typedef {import('./types.js').UserScriptMenu} UserScriptMenu
 * @typedef {import('./types.js').UserScriptMetadata} UserScriptMetadata
 */

async function gmApi(scriptId) {
  chrome.runtime.sendMessage({type: 'USER_SCRIPT_MSG_GM_REGISTER_SCRIPT_RUN', scriptId});

  /**
   * @type {Array<UserScriptMenu>}
   */
  let menus = [];
  /**
   * @type {{ [key: string]: string }}
   */
  let scriptStorage = {};

  const idChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  function generateId() {
    return [...Array(16)]
      .map(() => idChars.charAt(Math.floor(Math.random() * idChars.length)))
      .join('');
  }

  const getValue = (k, v) => {
    try {
      return JSON.parse(scriptStorage[k]) || v;
    } catch(e) {}
    return v;
  }
  const getValues = (kv) => {
    if(Array.isArray(kv) && kv.length > 0) {
      const keys = kv.filter(Boolean);
      const ret = {};
      for(const key of keys) {
        try {
          ret[key] = JSON.parse(scriptStorage[key]);
        } catch(e) {}
      }
      return ret;
    } else if(typeof kv === 'object' && Object.keys(kv).length > 0) {
      const ret = {};
      for(const key in kv) {
        try {
          ret[key] = JSON.parse(scriptStorage[key]) || kv[key];
        } catch(e) {
          ret[key] = kv[key];
        }
      }
      return ret;
    }
    
    return {};
  }
  const setValue = (k, v) => {
    const strv = JSON.stringify(v, null, 4);
    scriptStorage[k] = strv;
    chrome.runtime.sendMessage({ type: 'USER_SCRIPT_MSG_GM_SETVALUE', kv: {[k]: strv}, scriptId });
  }
  const setValues = (kv) => {
    if(typeof kv !== 'object' || Object.keys(kv).length < 1) return;
    const payload = {};
    for(const key in kv) {
      const strv = JSON.stringify(kv[key], null, 4);
      payload[key] = strv;
      scriptStorage[key] = strv;
    }
    chrome.runtime.sendMessage({ type: 'USER_SCRIPT_MSG_GM_SETVALUE', kv: payload, scriptId });
  }
  const deleteValue = (key) => {
    deleteValues([key]);
  }
  const deleteValues = (keys) => {
    if(!Array.isArray(keys) || keys.length < 1) return;
    const _keys = keys.filter(Boolean);
    const currentKeys = Object.keys(scriptStorage);
    for(const k of _keys) {
      if(currentKeys.includes(k)) delete scriptStorage[k];
    }
    chrome.runtime.sendMessage({type: 'USER_SCRIPT_MSG_GM_DELVALUE', scriptId, keys})
  }
  const openInTab = (url, inBackground) => {
    if(!url) return;
    chrome.runtime.sendMessage({type: 'USER_SCRIPT_MSG_GM_OPEN_TAB', scriptId, url, inBackground: !!inBackground})
  }
  const listValues = () => {
    return Object.keys(scriptStorage);
  }
  const log = (msg) => {
    chrome.runtime.sendMessage({
      type: 'USER_SCRIPT_MSG_GM_LOG',
      data: msg,
      scriptId,
    });
  }
  const registerMenu = (name, callback, opt) => {
    const menuId = (opt || {}).id || generateId();
    const menuIndex = menus.findIndex(i => menuId === i.id);
    if(menuIndex !== -1) {
      menus[menuIndex].name = name;
      menus[menuIndex].callback = callback;
    } else {
      menus.push({menuId, name, callback});
    }
    chrome.runtime.sendMessage({ type: 'USER_SCRIPT_MSG_GM_REGISTER_MENU', menuId, name, scriptId });
    return menuId;
  }
  const unregisterMenu = (nameOrId) => {
    menus = menus.filter(i => !(nameOrId === i.id || nameOrId === i.name));
    chrome.runtime.sendMessage({ type: 'USER_SCRIPT_MSG_GM_UNREGISTER_MENU', scriptId, nameOrId });
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if(message.type == 'USER_SCRIPT_MSG_TRIGGER_MENU') {
      const m = menus.findIndex(i => i.menuId === message.menuId);
      if(m != -1 && !!menus[m].callback) {
        menus[m].callback();
      }
    }
  });

  scriptStorage = await chrome.runtime.sendMessage({ type: 'USER_SCRIPT_MSG_GET_STORAGE', scriptId }) ;

  return {
    GM_setValue: setValue,
    GM_setValues: setValues,
    GM_getValue: getValue,
    GM_getValues: getValues,
    GM_deleteValue: deleteValue,
    GM_deleteValues: deleteValues,
    GM_listValues: listValues,
    GM_registerMenuCommand: registerMenu,
    GM_unregisterMenuCommand: unregisterMenu,
    GM_openInTab: openInTab,
    GM_log: log,
  };
}

/**
 * @function wrapErrorCatcher wrap try-catch and script name for the user script
 * @param {UserScriptData} usData user script data
 * @returns {string}
 */
export function withGmApi(usData) {
  const grantedGmApi = usData.grant.join(",");
  return `//# sourceURL=${chrome.runtime.getURL(`/${encodeURI(usData.name)}.user.js`)}
try {
  (async () => {
    const scriptId = "${usData.id}";
    const gmApi = ${gmApi.toString()};
    const {${grantedGmApi}} = await gmApi(scriptId);
    ${usData.code}
  })();
} catch (e) {
  console.error("================================");
  console.error("error executing userscript ${encodeURI(usData.name)}.user.js");
  console.error("================================");
  console.error(e);
}`;
}