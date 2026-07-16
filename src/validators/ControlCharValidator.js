'use strict';

import { isIllegalControlCode } from '../util.js';

/**
 * ControlCharValidator — single responsibility: detect illegal control
 * characters (0x00-0x08, 0x0B, 0x0C, 0x0E-0x1F) anywhere they appear as
 * literal characters in the document (element text, attribute values,
 * comments, CDATA, PI content, etc.).
 *
 * This check is always on — it is not gated by any option — since illegal
 * control characters make a document non-well-formed per the XML spec.
 */
export default class ControlCharValidator {
  /**
   * Scan `str` for the first illegal control character.
   * @param {string} str
   * @returns {number} local index (within `str`) of the first offending
   *   character, or -1 if none found.
   */
  static findIllegalIndex(str) {
    const len = str.length;
    for (let i = 0; i < len; i++) {
      if (isIllegalControlCode(str.charCodeAt(i))) return i;
    }
    return -1;
  }

  /**
   * @param {string} str
   * @returns {boolean}
   */
  static hasIllegalChar(str) {
    return this.findIllegalIndex(str) !== -1;
  }

  /**
   * Convenience formatter for error messages.
   * @param {number} code - char code
   */
  static describe(code) {
    return `0x${code.toString(16).padStart(2, '0')}`;
  }
}
