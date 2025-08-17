# Userscript Manager

A barebone user script manager for Chrome, with Manifest V3 support.

Third-party userscript manager requires a lot of permission by design. So, the probability of securiy compromise increases dramaticaly. The goal of this extension is to be-

- Small as possible, easily auditable
- No fancy features, only what give a value
- Not to be published in any extension store
- Auditing first and then loading unpacked

**Warning: This extension is intended to run scripts that are self-written, as there is no extra security measures taken for injecting content scripts in the browser.**

## Resources

- [Hellow World extension](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world)
- [Inject scripts into the active tab](https://developer.chrome.com/docs/extensions/get-started/tutorial/scripts-activetab)
- [chrome.scripting](https://developer.chrome.com/docs/extensions/reference/api/scripting)
- [chrome.userScript](https://developer.chrome.com/docs/extensions/reference/api/userScripts)
- [@types/chrome](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/chrome/index.d.ts)
- [GoogleChrome/chrome-extensions-samples](https://github.com/GoogleChrome/chrome-extensions-samples)