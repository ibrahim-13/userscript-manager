import { parseMetadata } from './meta-parser.js';

/**
 * @typedef {import("./chrome.js")} chrome
 */

/**
 * @typedef {{[key: string]: string | string[]}} UserScriptMetadata
 */

/**
 * @typedef {object} UserScriptData
 * @property {string} id id of the userscript
 * @property {string} name name of the userscript
 * @property {string} match matching pattern for not runing the userscript
 * @property {string} exclude exclude pattern for not running the userscript
 * @property {string} code code of the userscript
 * @property {boolean} enabled flag to control if the userscript should run or not
 * @property {UserScriptMetadata} meta metadata of the userscript
 */

/**
 * @typedef {object} UserScriptMenu
 * @property {string} scriptId id of the script
 * @property {string} menuId id of the menu
 * @property {string} name name of the menu
 * @property {() => void} callback function to call when menu is clicked
 */


/**
 * @typedef {object} TabData
 * @property {Array<UserScriptMenu>} menu userscript menus for tab
 * @property {Array<UserScriptData>} scriptIds script ids registered for tab
 */
/**
 * @typedef {object} UserScriptLog
 * @property {string} time timestamp
 * @property {string} data log data
 */

/**
 * @function generateId
 * @returns {string} id generated from timestamp
 */
function generateId() {
  return btoa(''+Date.now());
}

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
let editingIndex = -1;

const scriptList = document.getElementById('scriptList');
const addScriptBtn = document.getElementById('addScriptBtn');
const editor = document.getElementById('editor');
const editorTitle = document.getElementById('editorTitle');
const scriptNameInput = document.getElementById('scriptName');
const scriptMatchInput = document.getElementById('scriptMatch');
const scriptExcludeInput = document.getElementById('scriptExclude');
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
  chrome.storage.local.set({ userscripts });
  chrome.runtime.sendMessage({type: 'USER_SCRIPT_MSG_LOAD_USERSCRIPT'});
}

function loadScriptsFromStorage() {
  chrome.storage.local.get('userscripts', (result) => {
    userscripts = result.userscripts || [];
    renderScriptList();
    populateStorageScriptSelect();
  });
}

function renderScriptList() {
  scriptList.innerHTML = '';
  userscripts.forEach((script, index) => {
    const li = document.createElement('li');

    const nameSpan = document.createElement('span');
    nameSpan.textContent = script.name || `Unnamed Script ${index + 1}`;

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

    const toggleEnabled = document.createElement('input');
    toggleEnabled.type = 'checkbox';
    toggleEnabled.checked = script.enabled !== false;
    toggleEnabled.title = 'Enable/Disable Script';
    toggleEnabled.addEventListener('change', () => {
      script.enabled = toggleEnabled.checked;
      saveScriptsToStorage();
    });

    const viewLogsBtn = document.createElement('button');
    viewLogsBtn.textContent = 'View Logs';
    viewLogsBtn.addEventListener('click', () => {
      loadLogsForScript(index);
    });

    li.appendChild(toggleEnabled);
    li.appendChild(nameSpan);
    li.appendChild(editBtn);
    li.appendChild(deleteBtn);
    li.appendChild(viewLogsBtn);

    scriptList.appendChild(li);
  });
}

function openEditor(index) {
  editingIndex = index;
  const script = userscripts[index];
  editorTitle.textContent = 'Edit Script';
  scriptNameInput.value = script.name || '';
  scriptMatchInput.value = (script.match || []).join(', ');
  scriptExcludeInput.value = (script.exclude || []).join(', ');
  scriptCodeInput.value = script.code || '';
  editor.classList.remove('hidden');
}

function clearEditor() {
  editingIndex = -1;
  scriptNameInput.value = '';
  scriptMatchInput.value = '';
  scriptExcludeInput.value = '';
  scriptCodeInput.value = '';
  editor.classList.add('hidden');
}

addScriptBtn.addEventListener('click', () => {
  editingIndex = -1;
  editorTitle.textContent = 'Add Script';
  clearEditor();
  editor.classList.remove('hidden');
});

cancelEditBtn.addEventListener('click', () => {
  clearEditor();
});

saveScriptBtn.addEventListener('click', () => {
  const name = scriptNameInput.value.trim();
  const matches = scriptMatchInput.value.split(',').map(s => s.trim()).filter(Boolean);
  const excludes = scriptExcludeInput.value.split(',').map(s => s.trim()).filter(Boolean);
  const code = scriptCodeInput.value;

  if (!name) {
    alert('Name is required');
    return;
  }

  // Validate match patterns with simple check
  if (matches.length === 0) {
    alert('At least one match pattern is required');
    return;
  }

  // Parse metadata from code and enforce @match, @exclude, @grant, @require support here (simplified)
  const meta = parseMetadata(code);
  if (meta.match) {
    // Override with meta @match if present
    const metaMatches = Array.isArray(meta.match) ? meta.match : [meta.match];
    metaMatches.forEach(pat => {
      if (!matches.includes(pat)) matches.push(pat);
    });
  }
  if (meta.exclude) {
    const metaExcludes = Array.isArray(meta.exclude) ? meta.exclude : [meta.exclude];
    metaExcludes.forEach(pat => {
      if (!excludes.includes(pat)) excludes.push(pat);
    });
  }

  /**
   * @type {UserScriptData} script data
   */
  const scriptData = {
    name,
    match: matches,
    exclude: excludes,
    code,
    enabled: true,
    meta
  };

  if (editingIndex >= 0) {
    userscripts[editingIndex] = {...userscripts[editingIndex], ...scriptData};
  } else {
    userscripts.push({...scriptData, id: generateId()});
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
  const prefix = selectedIndex + '_';
  chrome.storage.local.get(null, (items) => {
    Object.keys(items).forEach(key => {
      if (key.startsWith(prefix)) {
        const val = items[key];
        const tr = document.createElement('tr');

        const keyCell = document.createElement('td');
        keyCell.textContent = key.substring(prefix.length);

        const valCell = document.createElement('td');
        valCell.textContent = JSON.stringify(val);

        const actionsCell = document.createElement('td');

        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', () => {
          editStorageEntry(key, val);
        });

        const delBtn = document.createElement('button');
        delBtn.textContent = 'Delete';
        delBtn.addEventListener('click', () => {
          if (confirm(`Delete key "${keyCell.textContent}"?`)) {
            chrome.storage.local.remove(key, () => {
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
      }
    });
  });
}

function editStorageEntry(fullKey, value) {
  addStorageEntryForm.classList.remove('hidden');
  newStorageKeyInput.value = fullKey.substring(storageScriptSelect.value.length + 1);
  newStorageKeyInput.disabled = true; // key cannot be changed on edit
  newStorageValueInput.value = JSON.stringify(value);
  saveStorageEntryBtn.onclick = () => {
    try {
      const newVal = JSON.parse(newStorageValueInput.value);
      const newKey = storageScriptSelect.value + '_' + newStorageKeyInput.value;
      chrome.storage.local.set({ [newKey]: newVal }, () => {
        addStorageEntryForm.classList.add('hidden');
        loadStorageForSelectedScript();
      });
    } catch (e) {
      alert('Value must be valid JSON.');
    }
  };
}

addStorageEntryBtn.addEventListener('click', () => {
  addStorageEntryForm.classList.remove('hidden');
  newStorageKeyInput.value = '';
  newStorageKeyInput.disabled = false;
  newStorageValueInput.value = '';
  saveStorageEntryBtn.onclick = () => {
    try {
      const key = newStorageKeyInput.value.trim();
      if (!key) {
        alert('Key cannot be empty.');
        return;
      }
      const fullKey = storageScriptSelect.value + '_' + key;
      const val = JSON.parse(newStorageValueInput.value);
      chrome.storage.local.set({ [fullKey]: val }, () => {
        addStorageEntryForm.classList.add('hidden');
        loadStorageForSelectedScript();
      });
    } catch (e) {
      alert('Value must be valid JSON.');
    }
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
