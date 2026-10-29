/* EK TeX — literal find/replace logic, shared with browser and Node tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.EKTeXFindReplace = api;
})(typeof window === 'undefined' ? null : window, function () {
  'use strict';
  function escapeRegExp(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function occurrences(source, query, options = {}) {
    source = String(source); query = String(query);
    if (!query) return [];
    const re = new RegExp(escapeRegExp(query), 'gu' + (options.caseSensitive ? '' : 'i'));
    const result = [];
    for (const m of source.matchAll(re)) {
      const start = m.index, end = start + m[0].length;
      if (options.wholeWord) {
        const word = /[\p{L}\p{N}_]/u;
        if ((start && word.test(source[start - 1])) || (end < source.length && word.test(source[end]))) continue;
      }
      result.push({ start, end });
    }
    return result;
  }
  function applyOne(source, match, replacement) {
    if (!match || match.start < 0 || match.end < match.start || match.end > source.length) return null;
    return source.slice(0, match.start) + String(replacement) + source.slice(match.end);
  }
  function applyAll(source, matches, replacement) {
    if (!matches.length) return { content: source, count: 0 };
    let out = '', cursor = 0;
    for (const match of matches) {
      if (match.start < cursor) throw new Error('Overlapping matches');
      out += source.slice(cursor, match.start) + String(replacement);
      cursor = match.end;
    }
    return { content: out + source.slice(cursor), count: matches.length };
  }
  return { occurrences, applyOne, applyAll };
});
