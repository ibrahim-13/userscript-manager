// gm-api.js
// Simplified GM_* API emulation for userscripts

const GMAPI = (() => {
  const prefix = (scriptId) => scriptId + '_';

  async function getValue(scriptId, key, defaultValue) {
    return new Promise((resolve) => {
      chrome.storage.local.get(prefix(scriptId) + key, (items) => {
        if (items && items[prefix(scriptId) + key] !== undefined) {
          resolve(items[prefix(scriptId) + key]);
        } else {
          resolve(defaultValue);
        }
      });
    });
  }

  async function setValue(scriptId, key, value) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [prefix(scriptId) + key]: value }, () => {
        resolve();
      });
    });
  }

  async function deleteValue(scriptId, key) {
    return new Promise((resolve) => {
      chrome.storage.local.remove(prefix(scriptId) + key, () => {
        resolve();
      });
    });
  }

  function log(scriptId, ...args) {
    chrome.runtime.sendMessage({
      type: 'LOG',
      scriptId,
      level: 'log',
      args
    });
    console.log(...args);
  }

  return {
    getValue,
    setValue,
    deleteValue,
    log
  };
})();

export default GMAPI;
