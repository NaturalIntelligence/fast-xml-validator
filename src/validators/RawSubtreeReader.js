'use strict';

/**
 * RawSubtreeReader — single responsibility: given the index right after a
 * skipped tag's opening `>`, consume raw characters until the literal
 * closing tag `</tagName>` (optional whitespace before `>`) is found.
 *
 * Deliberately does NOT try to parse anything in between: skipped content is
 * assumed to be non-XML or otherwise not meant to be validated (script/style
 * bodies, vendor blobs, etc.), so it may contain unmatched `<`, quotes, or
 * anything else. This mirrors how CDATA content is treated — opaque text,
 * found by looking for its one true terminator.
 *
 * Same-name tags never "nest" under this strategy — the first `</tagName>`
 * found ends the skip, matching the common script/style use case. Use a more
 * specific skip expression (e.g. targeting only the outermost occurrence) if
 * your skipped content can itself contain literal `</tagName>` text.
 */
export default class RawSubtreeReader {
  /**
   * @param {string} xmlData
   * @param {string} tagName
   * @param {number} i - index right after the opening tag's '>'
   * @returns {number} index of the matching closing tag's own '>'
   */
  static consume(xmlData, tagName, i) {
    const needle = '</' + tagName;
    let searchFrom = i;

    while (true) {
      const idx = xmlData.indexOf(needle, searchFrom);
      if (idx === -1) {
        throw new Error(`Unclosed skipped tag '${tagName}'.`);
      }

      let j = idx + needle.length;
      while (j < xmlData.length && /\s/.test(xmlData[j])) j++;

      if (xmlData[j] === '>') {
        return j;
      }
      // Not actually a match (e.g. tagName is a prefix of a longer name) —
      // keep looking further in the string.
      searchFrom = idx + needle.length;
    }
  }
}
