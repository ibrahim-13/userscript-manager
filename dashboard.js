import { parseMetadata } from './meta-parser.js';

/**
 * @typedef {import("./chrome.js")} chrome
 */

/**
 * @typedef {import('./modules/types.js').TabData} TabData
 * @typedef {import('./modules/types.js').UserScriptData} UserScriptData
 * @typedef {import('./modules/types.js').UserScriptLog} UserScriptLog
 * @typedef {import('./modules/types.js').UserScriptMenu} UserScriptMenu
 * @typedef {import('./modules/types.js').UserScriptMetadata} UserScriptMetadata
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
  chrome.runtime.sendMessage({type: 'USER_SCRIPT_MSG_SET_USERSCRIPT_ALL', data: userscripts});
}

function loadScriptsFromStorage() {
  chrome.runtime.sendMessage({type: 'USER_SCRIPT_MSG_GET_USERSCRIPT_ALL'})
    .then((result) => {
      userscripts = result.scripts || [];
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

        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', () => {
          editStorageEntry(scriptId, key, val);
        });

        const delBtn = document.createElement('button');
        delBtn.textContent = 'Delete';
        delBtn.addEventListener('click', () => {
          if (confirm(`Delete key "${keyCell.textContent}"?`)) {
            chrome.runtime.sendMessage({type: 'USER_SCRIPT_MSG_GM_DELVALUE', scriptId, key})
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
    chrome.runtime.sendMessage({type: 'USER_SCRIPT_MSG_GM_SETVALUE', scriptId, key: newStorageKeyInput.value, value: newVal})
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
    chrome.runtime.sendMessage({type: 'USER_SCRIPT_MSG_GM_SETVALUE', scriptId, key, value: val})
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
