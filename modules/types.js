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

export const placeholder = null;