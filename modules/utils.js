/**
 * @function isUserScriptsAvailable
 * @returns {boolean} returns true if userscript api is available, otherwise false
 */
export function isUserScriptsAvailable() {
  try {
    // Method call which throws if API permission or toggle is not enabled.
    chrome.userScripts.getScripts();
    return true;
  } catch {
    // Not available.
    return false;
  }
}

const idChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * @function generateRandomId
 * @returns {string} id generated from timestamp
 */
export function generateRandomId() {
  return [...Array(16)]
    .map(() => idChars.charAt(Math.floor(Math.random() * idChars.length)))
    .join('');
}

/**
 * @param {number | undefined} id tab id
 * @returns {string}
 */
export function getTabDataKeyFromId(id) {
  return '' + id;
}