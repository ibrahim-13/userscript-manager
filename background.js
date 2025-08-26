import { StorageHandler } from './modules/storage_handler.js'
import { EventHandler } from './modules/event_handler.js'

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

const evt_hndlr = new EventHandler(new StorageHandler());

chrome.runtime.onInstalled.addListener(evt_hndlr.onInstalledListener.bind(evt_hndlr));
chrome.tabs.onRemoved.addListener(evt_hndlr.onTabsRemovedListener.bind(evt_hndlr));
chrome.tabs.onUpdated.addListener(evt_hndlr.onTabsUpdatedListener.bind(evt_hndlr));
chrome.tabs.onActivated.addListener(evt_hndlr.onTabsActivatedListener.bind(evt_hndlr));
chrome.runtime.onUserScriptMessage.addListener(evt_hndlr.onUserScriptMessageListener.bind(evt_hndlr));
chrome.runtime.onMessage.addListener(evt_hndlr.onMessageListener.bind(evt_hndlr));
