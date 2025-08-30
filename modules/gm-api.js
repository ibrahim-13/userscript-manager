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
  const setValue = (k, v) => {
    const strv = JSON.stringify(v, null, 4);
    scriptStorage[k] = strv;
    chrome.runtime.sendMessage({ type: 'USER_SCRIPT_MSG_GM_SETVALUE', key: k, value: strv, scriptId });
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