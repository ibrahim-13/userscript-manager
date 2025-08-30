import { isUserScriptsAvailable } from './modules/utils.js'

/**
 * @typedef {import("./chrome.js")} chrome
 */

/**
 * @typedef {import('./modules/types.js').TabData} TabData
 * @typedef {import('./modules/types.js').UserScriptData} UserScriptData
 * @typedef {import('./modules/types.js').UserScriptLog} UserScriptLog
 * @typedef {import('./modules/types.js').UserScriptMenu} UserScriptMenu
 * @typedef {import('./modules/types.js').UserScriptMetadata} UserScriptMetadata
 * @typedef {import('./modules/types.js').GlobalSettings} GlobalSettings
 */

const toggleAllScripts = document.getElementById('toggleAllScripts');
const scriptList = document.getElementById('scriptList');
const userScriptPermissionErr = document.getElementById('userscriptPermissionsErrorMsg');

async function loadScripts() {
  if(!isUserScriptsAvailable()) {
    userScriptPermissionErr.style.display = "block";
    return;
  }
  
  const tabId = (await chrome.tabs.query({active: true, lastFocusedWindow: true}))[0].id;
  const result = await chrome.runtime.sendMessage({type: 'USER_SCRIPT_MSG_GET_USERSCRIPT_ALL'});
  /**
   * @type {Array<UserScriptData>}
   */
  const userScripts = result.scripts || [];
  /**
   * @type {TabData}
   */
  const tabData = await chrome.runtime.sendMessage({type: 'USER_SCRIPT_MSG_GET_TAB_DATA', tabId});
  const globalSettings = await chrome.runtime.sendMessage({type: 'USER_SCRIPT_MSG_GET_GLOBAL_SETTINGS'});
  renderScripts(tabId, userScripts.filter(i => tabData.scriptIds.includes(i.id)), tabData, globalSettings);
}

/**
 * @function renderScripts render scripts in the popup menu
 * @param {Array<UserScriptData>} userScripts
 * @param {TabData} tabData
 * @param {GlobalSettings} globalSettings
 */
function renderScripts(tabId, userScripts, tabData, globalSettings) {
  scriptList.innerHTML = '';

  toggleAllScripts.checked = !!globalSettings.enabled;
  toggleAllScripts.addEventListener('change', () => {
    globalSettings.enabled = toggleAllScripts.checked;
    chrome.runtime.sendMessage({type: 'USER_SCRIPT_MSG_SET_GLOBAL_SETTINGS', data: globalSettings });
  });

  userScripts.forEach((script) => {
    const script_info = document.createElement('div');
    script_info.className = "script_info";

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = script.enabled !== false; // default enabled true
    checkbox.id = script.id;
    checkbox.title = 'Enable/Disable Script';

    checkbox.addEventListener('change', () => {
      const index = userScripts.findIndex(i => i.id === checkbox.id);
      if(index != -1) {
        userScripts[index].enabled = checkbox.checked;
        chrome.runtime.sendMessage({type: 'USER_SCRIPT_MSG_SET_USERSCRIPT', data: userScripts[index] });
      } else {
        console.error("trying to update user script which is not registered");
      }
    });

    const label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.textContent = script.name || `Unnamed Script`;

    script_info.appendChild(checkbox);
    script_info.appendChild(label);
    scriptList.appendChild(script_info);

    const scriptMenus = tabData.menu.filter(i => i.scriptId === script.id);
    let menuList = []
    for(const menu of scriptMenus) {
      const menuBtn = document.createElement('button');
      menuBtn.innerText = menu.name || "Unnamed Menu";
      menuBtn.addEventListener('click',
        () => chrome.tabs.sendMessage(tabId, { type: 'USER_SCRIPT_MSG_TRIGGER_MENU', menuId: menu.menuId }));
      menuList.push(menuBtn);
    }

    if (menuList.length > 0) {
      const menuEntry = document.createElement('div');
      menuEntry.className = "script_menu";
      menuList.forEach(m => menuEntry.appendChild(m));
      scriptList.appendChild(menuEntry);
    }
  });
}

loadScripts();
