'use strict';

import ControlCharValidator from './ControlCharValidator.js';

/**
 * CommentCdataReader — single responsibility: recognize and consume
 * `<!-- comment -->`, `<![CDATA[ ... ]]>` and `<!DOCTYPE ...>` constructs
 * starting at a given index (which points at the `!`), returning the index
 * of the last character consumed (the closing `>`).
 *
 * DOCTYPE handling is fully delegated to a DocTypeValidator instance passed
 * to `read()` by the caller (SyntaxValidator), since DOCTYPE parsing is a
 * large, separate concern in its own right.
 *
 * Opt-in checks (via `invalidCharSequence`):
 *   - `comment: true`  -> literal `--` inside a comment's body is rejected
 *     (besides the sequence immediately before the closing `-->`).
 */
export default class CommentCdataReader {
  constructor(options = {}) {
    this.checkCommentDashes = options.invalidCharSequence?.comment === true;
  }

  /**
   * @param {string} xmlData
   * @param {number} i - index of the '!' character
   * @param {import('./DocTypeValidator.js').default} docTypeValidator
   * @returns {number} index of the last character consumed
   */
  read(xmlData, i, docTypeValidator) {
    if (xmlData.length > i + 2 && xmlData[i + 1] === '-' && xmlData[i + 2] === '-') {
      return this._readComment(xmlData, i);
    } else if (
      xmlData.length > i + 7 &&
      xmlData[i + 1] === 'D' &&
      xmlData[i + 2] === 'O' &&
      xmlData[i + 3] === 'C' &&
      xmlData[i + 4] === 'T' &&
      xmlData[i + 5] === 'Y' &&
      xmlData[i + 6] === 'P' &&
      xmlData[i + 7] === 'E'
    ) {
      return docTypeValidator.validateDocType(xmlData, i - 1);
    } else if (
      xmlData.length > i + 8 &&
      xmlData[i + 1] === '[' &&
      xmlData[i + 2] === 'C' &&
      xmlData[i + 3] === 'D' &&
      xmlData[i + 4] === 'A' &&
      xmlData[i + 5] === 'T' &&
      xmlData[i + 6] === 'A' &&
      xmlData[i + 7] === '['
    ) {
      return this._readCdata(xmlData, i);
    } else {
      throw new Error("Invalid construct starting with '<!'.");
    }
  }

  _readComment(xmlData, i) {
    const bodyStart = i + 3;
    for (i = bodyStart; i < xmlData.length; i++) {
      if (xmlData[i] === '-' && xmlData[i + 1] === '-' && xmlData[i + 2] === '>') {
        i += 2;
        break;
      }
    }
    if (xmlData[i] !== '>') {
      throw new Error('Comment is not closed with "-->".');
    }

    const body = xmlData.substring(bodyStart, i - 2);
    const illegalIdx = ControlCharValidator.findIllegalIndex(body);
    if (illegalIdx !== -1) {
      const code = body.charCodeAt(illegalIdx);
      throw new Error(`Illegal control character ${ControlCharValidator.describe(code)} in comment.`);
    }
    if (this.checkCommentDashes && body.indexOf('--') !== -1) {
      throw new Error(`Comment must not contain '--'.`);
    }

    return i;
  }

  _readCdata(xmlData, i) {
    const bodyStart = i + 8;
    for (i = bodyStart; i < xmlData.length; i++) {
      if (xmlData[i] === ']' && xmlData[i + 1] === ']' && xmlData[i + 2] === '>') {
        i += 2;
        break;
      }
    }
    if (xmlData[i] !== '>') {
      throw new Error('CDATA section is not closed with "]]>".');
    }

    const body = xmlData.substring(bodyStart, i - 2);
    const illegalIdx = ControlCharValidator.findIllegalIndex(body);
    if (illegalIdx !== -1) {
      const code = body.charCodeAt(illegalIdx);
      throw new Error(`Illegal control character ${ControlCharValidator.describe(code)} in CDATA section.`);
    }

    return i;
  }
}
