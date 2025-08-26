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

/**********************************
 * @class Handle storage operation
 **********************************/
export class StorageHandler {
  #_key_script_storage = 'storage';
  #_key_user_scripts = 'userscripts';

  /**
   * @async
   * @returns {Promise<Array<UserScriptData>>} user script data
   */
  LoadScripts() {
    return new Promise(resolve => {
      chrome.storage.local.get(this.#_key_user_scripts, (result) => {
        const userscripts = result.userscripts || [];
        resolve(userscripts);
      });
    })
  }

  /**
   * @async
   * @param {UserScriptData} data script data
   * @returns {Promise<Array<UserScriptData>>} user script data
   */
  SaveScript(data) {
    return new Promise(resolve => {
      chrome.storage.local.get(this.#_key_user_scripts, (result) => {
        /**
         * @type {Array<UserScriptData>}
         */
        const userscripts = result.userscripts || [];
        const index = userscripts.findIndex(i => i.id == data.id);
        if(index !== -1) {
          userscripts[index] = data;
        } else {
          userscripts.push(data);
        }
        chrome.storage.local.set({ [this.#_key_user_scripts]: userscripts });
        resolve(userscripts);
      });
    })
  }

  /**
   * @param {Array<UserScriptData>} data script data
   */
  SaveAllScripts(data) {
    return new Promise(resolve => chrome.storage.local.set({ [this.#_key_user_scripts]: data }).then(() => resolve(data)));
  }

  /**
   * @async
   * @returns {Promise<Array<{[scriptId: string]: {[key: string]: string}}>>} user script storage data
   */
  LoadScriptValue() {
    return new Promise(resolve => {
      chrome.storage.local.get(this.#_key_script_storage, (result) => {
        const storage = result.storage || {};
        resolve(storage);
      });
    })
  }

  /**
   * @async
   * @param {string} scriptId id of the script
   * @param {{[key: string]: string}} data data stored by the script
   * @returns {Promise<{[scriptId: string]: {[key: string]: string}}>} user script storage data
   */
  SaveScriptValue(scriptId, data) {
    return new Promise(resolve => {
      chrome.storage.local.get(this.#_key_script_storage, (result) => {
        const storage = result.storage || {};
        storage[scriptId] = data;
        chrome.storage.local.set({ [this.#_key_script_storage]: storage });
        resolve(storage);
      });
    })
  }

  /**
   * @async
   * @param {string} scriptId id of the script
   * @param {string} key
   * @param {string} value
   * @returns {Promise<{[scriptId: string]: {[key: string]: string}}>} user script storage data
   */
  SaveScriptValueByKey(scriptId, key, value) {
    return new Promise(resolve => {
      chrome.storage.local.get(this.#_key_script_storage, (result) => {
        const storage = result.storage || {};
        if(!storage[scriptId]) storage[scriptId] = {};
        storage[scriptId][key] = value;
        chrome.storage.local.set({ [this.#_key_script_storage]: storage });
        resolve(storage);
      });
    })
  }

  /**
   * @async
   * @param {string} scriptId id of the script
   * @param {string} key
   * @returns {Promise<{[scriptId: string]: {[key: string]: string}}>} user script storage data
   */
  DeleteScriptValueByKey(scriptId, key) {
    return new Promise(resolve => {
      chrome.storage.local.get(this.#_key_script_storage, (result) => {
        const storage = result.storage || {};
        if(!storage[scriptId]) storage[scriptId] = {};
        delete storage[scriptId][key];
        chrome.storage.local.set({ [this.#_key_script_storage]: storage });
        resolve(storage);
      });
    })
  }
}