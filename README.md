# Userscript Manager

A barebone user script manager for Chrome, with Manifest V3 support.

Third-party userscript manager requires a lot of permission by design. So, the probability of securiy compromise increases dramaticaly. The goal of this extension is to be-

- Small as possible, easily auditable
- No fancy features, only what give a value
- Not to be published in any extension store
- Auditing first and then loading unpacked

## Sample User Script metadata

```
// ==UserScript==
// @name         Script Name
// @match        https://*.example.com/*
// @exclude      https://*.example.com/*
// @version      0.0.1
// @author       Author Name
// @description  User script description
// @grant        GM_functionName
// ==/UserScript==

```

## List of available GM Api

- `GM_setValue(key: string, value: string)`

| Name | Type | Description |
|---|---|---|
| key | string | Key |
| value | string | Value |

- `string GM_getValue(key: string, value: string)`

| Name | Type | Description |
|---|---|---|
| key | string | Key |
| value | string | Default value to return if key does not exist |

- `string GM_registerMenuCommand(name: string, callback: () => void, opt?: { id: string })`

| Name | Type | Description |
|---|---|---|
| name | string | Display name of the menu |
| callback | () => void | Callback function to run when menu clicked |
| opt | { id: string } | Options |
| RETURN | string | Menu Id |

If an existing menu id is passed to the options, then it will replace the existing menu instead of adding a new one.



### Extened Api

- `GM_log(msg: string)`

| Name | Type | Description |
|---|---|---|
| msg | string | Log message |

**Warning: This extension is intended to run scripts that are self-written, as there is no extra security measures taken for injecting content scripts in the browser.**

## Resources

- [Hellow World extension](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world)
- [Inject scripts into the active tab](https://developer.chrome.com/docs/extensions/get-started/tutorial/scripts-activetab)
- [chrome.scripting](https://developer.chrome.com/docs/extensions/reference/api/scripting)
- [chrome.userScript](https://developer.chrome.com/docs/extensions/reference/api/userScripts)
- [@types/chrome](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/chrome/index.d.ts)
- [GoogleChrome/chrome-extensions-samples](https://github.com/GoogleChrome/chrome-extensions-samples)