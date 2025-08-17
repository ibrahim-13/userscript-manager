/**
 * @typedef {import('./dashboard.js').UserScriptMetadata} UserScriptMetadata
 * @typedef {import('./dashboard.js').UserScriptData} UserScriptData
 */

const scriptList = document.getElementById('scriptList');

function loadScripts() {
  chrome.storage.local.get('userscripts', (result) => {
    const userscripts = result.userscripts || [];
    renderScripts(userscripts);
  });
}

/**
 * @function renderScripts render scripts in the popup menu
 * @param {Array<UserScriptData>} userscripts 
 */
function renderScripts(userscripts) {
  scriptList.innerHTML = '';
  userscripts.forEach((script) => {
    const li = document.createElement('li');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = script.enabled !== false; // default enabled true
    checkbox.id = script.id;

    checkbox.addEventListener('change', () => {
      const index = userscripts.findIndex(i => i.id === checkbox.id);
      if(index != -1) {
        userscripts[index].enabled = checkbox.checked;
        chrome.storage.local.set({ userscripts });
        chrome.runtime.sendMessage({type: 'USER_SCRIPT_MSG_LOAD_USERSCRIPT'});
      }
    });

    const label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.textContent = script.name || `Unnamed Script ${i + 1}`;

    li.appendChild(checkbox);
    li.appendChild(label);
    scriptList.appendChild(li);
  });
}

loadScripts();
