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