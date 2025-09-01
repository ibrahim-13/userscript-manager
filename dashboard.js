import { MetadataParser } from './meta-parser.js';
import { isUserScriptsAvailable, generateRandomId } from './modules/utils.js';

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

/**
 * @function get_logs
 * @param {number} index index of the script
 * @returns {Promise<string[]>}
 */
function get_logs(index) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'USER_SCRIPT_MSG_GET_SCRIPT_LOGS', scriptId: index }, resolve);
    });
}

/**
 * @name userscripts list of userscripts
 * @type {Array<UserScriptData>}
 */
let userscripts = [];
/**
 * @name globalSettings global settings
 * @type {GlobalSettings}
 */
let globalSettings = {};
let editingIndex = -1;

const toggleAllScripts = document.getElementById('toggleAllScripts');
const globalDisabledMsg = document.getElementById('globalDisabledMsg');
const userScriptPermissionErr = document.getElementById('userscriptPermissionsErrorMsg');
const scriptListTableBody = document.querySelector('#scriptList tbody');
const addScriptBtn = document.getElementById('addScriptBtn');
const editor = document.getElementById('editor');
const editorTitle = document.getElementById('editorTitle');
const scriptCodeInput = document.getElementById('scriptCode');
const saveScriptBtn = document.getElementById('saveScriptBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const logPanel = document.getElementById('logPanel');

const tabs = {
  scriptsTab: document.getElementById('scriptsTab'),
  storageTab: document.getElementById('storageTab'),
  tabScriptsBtn: document.getElementById('tabScriptsBtn'),
  tabStorageBtn: document.getElementById('tabStorageBtn'),
};

const storageScriptSelect = document.getElementById('storageScriptSelect');
const refreshStorageBtn = document.getElementById('refreshStorageBtn');
const storageTableBody = document.querySelector('#storageTable tbody');
const addStorageEntryBtn = document.getElementById('addStorageEntryBtn');
const addStorageEntryForm = document.getElementById('addStorageEntryForm');
const newStorageKeyInput = document.getElementById('newStorageKey');
const newStorageValueInput = document.getElementById('newStorageValue');
const saveStorageEntryBtn = document.getElementById('saveStorageEntryBtn');
const cancelStorageEntryBtn = document.getElementById('cancelStorageEntryBtn');

function saveScriptsToStorage() {
  chrome.runtime.sendMessage({type: 'USER_SCRIPT_MSG_SET_USERSCRIPT_ALL', data: userscripts});
}

async function loadScriptsFromStorage() {
  if(!isUserScriptsAvailable()) {
    userScriptPermissionErr.style.display = "block";
    return;
  }

  const resultScripts = await chrome.runtime.sendMessage({type: 'USER_SCRIPT_MSG_GET_USERSCRIPT_ALL'});
  const resultGlobalSettings = await chrome.runtime.sendMessage({type: 'USER_SCRIPT_MSG_GET_GLOBAL_SETTINGS'});
  userscripts = resultScripts.scripts || [];
  globalSettings = resultGlobalSettings || {};
  renderScriptList();
  populateStorageScriptSelect();
}

function renderScriptList() {
  toggleAllScripts.checked = !!globalSettings.enabled;
  toggleAllScripts.addEventListener('change', () => {
    globalSettings.enabled = toggleAllScripts.checked;
    chrome.runtime.sendMessage({type: 'USER_SCRIPT_MSG_SET_GLOBAL_SETTINGS', data: globalSettings });
    loadScriptsFromStorage();
  });
  globalDisabledMsg.style.display = !!globalSettings.enabled ? 'none' : 'block';

  scriptListTableBody.innerHTML = '';
  userscripts.forEach((script, index) => {
    const tr = document.createElement('tr');

    const toggleEnabled = document.createElement('input');
    toggleEnabled.type = 'checkbox';
    toggleEnabled.checked = script.enabled !== false;
    toggleEnabled.title = 'Enable/Disable Script';
    toggleEnabled.addEventListener('change', () => {
      script.enabled = toggleEnabled.checked;
      saveScriptsToStorage();
    });

    const toggleTd = document.createElement('td');
    toggleTd.classList = "action-column";
    toggleTd.appendChild(toggleEnabled);

    const nameTd = document.createElement('td');
    nameTd.textContent = script.name || `Unnamed Script ${index + 1}`;

    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => {
      openEditor(index);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => {
      if (confirm(`Delete script "${script.name}"?`)) {
        userscripts.splice(index, 1);
        saveScriptsToStorage();
        loadScriptsFromStorage();
      }
    });

    const viewLogsBtn = document.createElement('button');
    viewLogsBtn.textContent = 'View Logs';
    viewLogsBtn.addEventListener('click', () => {
      loadLogsForScript(index);
    });

    const actionTd = document.createElement('td');
    actionTd.classList = "action-column";
    actionTd.appendChild(editBtn);
    actionTd.appendChild(deleteBtn);
    actionTd.appendChild(viewLogsBtn);

    const versionTd = document.createElement('td');
    versionTd.textContent = script.version;

    const descriptinTd = document.createElement('td');
    descriptinTd.textContent = script.description;

    const authorTd = document.createElement('td');
    authorTd.textContent = script.author;

    tr.appendChild(toggleTd);
    tr.appendChild(nameTd);
    tr.appendChild(versionTd);
    tr.appendChild(descriptinTd);
    tr.appendChild(authorTd);
    tr.appendChild(actionTd);

    scriptListTableBody.appendChild(tr);
  });
}

function openEditor(index) {
  editingIndex = index;
  const script = userscripts[index];
  editorTitle.textContent = 'Edit Script';
  scriptCodeInput.value = script.code || '';
  editor.classList.remove('hidden');
}

function clearEditor() {
  editingIndex = -1;
  scriptCodeInput.value = '';
  editor.classList.add('hidden');
}

function addPlaceholderInfoInEditor() {
  scriptCodeInput.value = `// ==UserScript==
// @name         Script Name
// @match        https://*.example.com/*
// @exclude      https://*.example.com/*
// @version      0.0.1
// @author       Author Name
// @description  User script description
// @grant        GM_functionName
// ==/UserScript==
`;
}

addScriptBtn.addEventListener('click', () => {
  editingIndex = -1;
  editorTitle.textContent = 'Add Script';
  clearEditor();
  addPlaceholderInfoInEditor();
  editor.classList.remove('hidden');
});

cancelEditBtn.addEventListener('click', () => {
  clearEditor();
});

saveScriptBtn.addEventListener('click', () => {
  const code = scriptCodeInput.value;

  // Parse metadata from code: @name, @version, @author, @description, @match, @exclude, @grant
  const metaParser = new MetadataParser(code);
  const match = metaParser.GetArrayFromMetaEntry("@match");
  if (match.length === 0) {
    alert('At least one match pattern is required');
    return;
  }

  /**
   * @type {UserScriptData} script data
   */
  const scriptData = {
    name: metaParser.GetFirstFromMetaEntry("@name", 'No name script'),
    version: metaParser.GetFirstFromMetaEntry("@version", '0.0.1'),
    author: metaParser.GetFirstFromMetaEntry("@author", ''),
    description: metaParser.GetFirstFromMetaEntry("@description", ''),
    match,
    exclude: metaParser.GetArrayFromMetaEntry("@exclude"),
    grant: metaParser.GetArrayFromMetaEntry("@grant"),
    code,
    enabled: true,
    meta: metaParser.GetMetadata(),
  };

  if (editingIndex >= 0) {
    userscripts[editingIndex] = {...userscripts[editingIndex], ...scriptData};
  } else {
    userscripts.push({...scriptData, id: generateRandomId()});
  }

  saveScriptsToStorage();
  loadScriptsFromStorage();
  clearEditor();
});

// Storage Inspector related functions

function populateStorageScriptSelect() {
  storageScriptSelect.innerHTML = '';
  userscripts.forEach((script, idx) => {
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = script.name || `Unnamed Script ${idx + 1}`;
    storageScriptSelect.appendChild(opt);
  });
  loadStorageForSelectedScript();
}

function loadStorageForSelectedScript() {
  storageTableBody.innerHTML = '';
  const selectedIndex = parseInt(storageScriptSelect.value, 10);
  if (isNaN(selectedIndex) || !userscripts[selectedIndex]) return;
  const scriptId = userscripts[selectedIndex].id;
  chrome.runtime.sendMessage({type: 'USER_SCRIPT_MSG_GET_STORAGE', scriptId})
    .then((items) => {
      Object.keys(items).forEach(key => {
        const val = items[key];
        const tr = document.createElement('tr');

        const keyCell = document.createElement('td');
        keyCell.textContent = key;

        const valCell = document.createElement('td');
        valCell.textContent = val;

        const actionsCell = document.createElement('td');
        actionsCell.classList = "action-column";

        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', () => {
          editStorageEntry(scriptId, key, val);
        });

        const delBtn = document.createElement('button');
        delBtn.textContent = 'Delete';
        delBtn.addEventListener('click', () => {
          if (confirm(`Delete key "${keyCell.textContent}"?`)) {
            chrome.runtime.sendMessage({type: 'USER_SCRIPT_MSG_GM_DELVALUE', scriptId, keys: [key]})
              .then(() => {
                loadStorageForSelectedScript();
              });
          }
        });

        actionsCell.appendChild(editBtn);
        actionsCell.appendChild(delBtn);

        tr.appendChild(keyCell);
        tr.appendChild(valCell);
        tr.appendChild(actionsCell);
        storageTableBody.appendChild(tr);
      });
    });
}

function editStorageEntry(scriptId, key, value) {
  addStorageEntryForm.classList.remove('hidden');
  newStorageKeyInput.value = key;
  newStorageKeyInput.disabled = true; // key cannot be changed on edit
  newStorageValueInput.value = value;
  saveStorageEntryBtn.onclick = () => {
    const newVal = newStorageValueInput.value;
    if(!newVal) {
      alert("Value can not be empty");
      return;
    }
    chrome.runtime.sendMessage({type: 'USER_SCRIPT_MSG_GM_SETVALUE', scriptId, kv: {[newStorageKeyInput.value]: newVal}})
      .then(() => {
        addStorageEntryForm.classList.add('hidden');
        loadStorageForSelectedScript();
      });
  };
}

addStorageEntryBtn.addEventListener('click', () => {
  const selectedIndex = parseInt(storageScriptSelect.value, 10);
  if (isNaN(selectedIndex) || !userscripts[selectedIndex]) return;
  const scriptId = userscripts[selectedIndex].id;
  addStorageEntryForm.classList.remove('hidden');
  newStorageKeyInput.value = '';
  newStorageKeyInput.disabled = false;
  newStorageValueInput.value = '';
  saveStorageEntryBtn.onclick = () => {
    const key = newStorageKeyInput.value.trim();
    if (!key) {
      alert('Key cannot be empty.');
      return;
    }
    const val = newStorageValueInput.value;
    if(!val) {
      alert("Value can not be empty");
      return;
    }
    chrome.runtime.sendMessage({type: 'USER_SCRIPT_MSG_GM_SETVALUE', scriptId, kv: {[key]: val}})
      .then(() => {
        addStorageEntryForm.classList.add('hidden');
        loadStorageForSelectedScript();
      });
  };
});

cancelStorageEntryBtn.addEventListener('click', () => {
  addStorageEntryForm.classList.add('hidden');
});

refreshStorageBtn.addEventListener('click', loadStorageForSelectedScript);

storageScriptSelect.addEventListener('change', loadStorageForSelectedScript);

// Tabs switching
tabs.tabScriptsBtn.addEventListener('click', () => {
  tabs.scriptsTab.classList.remove('hidden');
  tabs.storageTab.classList.add('hidden');
});
tabs.tabStorageBtn.addEventListener('click', () => {
  tabs.scriptsTab.classList.add('hidden');
  tabs.storageTab.classList.remove('hidden');
});

// Logs

function loadLogsForScript(index) {
  const script = userscripts[index];
  if (!script) {
    logPanel.textContent = 'Invalid script index';
    return;
  }
  get_logs(script.id).then((logs) => {
    if (!logs || logs.length === 0) {
      logPanel.textContent = 'No logs for this script.';
      return;
    }
    logPanel.textContent = logs.map(e => `[${e.time}] ${e.data}`).join('\n');
  });
}

// Initial load
loadScriptsFromStorage();
