/**
 * @typedef {import("./modules/types").UserScriptMetadata} UserScriptMetadata
 */

/**
 * @function parseMetadata
 * @param {string} code userscript code
 * @returns {UserScriptMetadata} userscript metadata in key-value pairs
 */
function parseMetadata(code) {
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

export class MetadataParser {
  /**
   * @type {UserScriptMetadata}
   */
  #data = '';

  /**
   * @param {string} data 
   */
  constructor(data) {
    this.#data = parseMetadata(data || '');
  }

  /**
   * @returns {UserScriptMetadata}
   */
  GetMetadata() {
    return this.#data;
  }

  /**
   * @param {string} key
   * @param {string} fallback
   * @returns {string}
   */
  GetFirstFromMetaEntry(key, fallback) {
    const data = this.#data[key];
    if(Array.isArray(data)) {
      return data.length > 0 ? data[0] : fallback;
    }
    return typeof data === 'string' ? data || fallback
      : fallback;
  }

  /**
   * @param {string} key
   * @returns {string[]}
   */
  GetArrayFromMetaEntry(key) {
    const data = this.#data[key];
    if(Array.isArray(data)) {
      return data.map(s => s.trim()).filter(Boolean);
    }
    return typeof data === 'string' ? [data].map(s => s.trim()).filter(Boolean)
      : [];
  }
}
