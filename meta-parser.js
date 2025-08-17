/**
 * @typedef {import("./userscript.js").UserScriptMetadata} UserScriptMetadata
 */

/**
 * @function parseMetadata
 * @param {string} code userscript code
 * @returns {UserScriptMetadata} userscript metadata in key-value pairs
 */
export function parseMetadata(code) {
  const meta = {};
  const metaRegex = /\/\/\s*==UserScript==([\s\S]*?)\/\/\s*==\/UserScript==/;
  const match = code.match(metaRegex);
  if (!match) return meta;

  const lines = match[1].split('\n');
  for (let line of lines) {
    line = line.trim();
    if (!line.startsWith('// @')) continue;
    const spaceIndex = line.indexOf(' ', 4);
    if (spaceIndex < 0) continue;
    const key = line.substring(3, spaceIndex).trim();
    const val = line.substring(spaceIndex + 1).trim();

    // Support multiple values per key, like @match and @exclude
    if (key in meta) {
      if (Array.isArray(meta[key])) {
        meta[key].push(val);
      } else {
        meta[key] = [meta[key], val];
      }
    } else {
      meta[key] = val;
    }
  }
  return meta;
}
