/**
 * @typedef {import('./dashboard.js').UserScriptMetadata} UserScriptMetadata
 * @typedef {import('./dashboard.js').UserScriptData} UserScriptData
 * @typedef {import('./dashboard.js').TabData} TabData
 */

const scriptList = document.getElementById('scriptList');
const userScriptPermissionErr = document.getElementById('userscript_permissions_error');

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

async function loadScripts() {
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
  renderScripts(tabId, userScripts.filter(i => tabData.scriptIds.includes(i.id)), tabData);
}

/**
 * @function renderScripts render scripts in the popup menu
 * @param {Array<UserScriptData>} userScripts
 * @param {TabData} tabData
 */
function renderScripts(tabId, userScripts, tabData) {
  if(!isUserScriptsAvailable()) {
    userScriptPermissionErr.style.display = "block";
  }

  scriptList.innerHTML = '';
  userScripts.forEach((script) => {
    const script_info = document.createElement('div');
    script_info.className = "script_info";

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = script.enabled !== false; // default enabled true
    checkbox.id = script.id;

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
