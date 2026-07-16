'use strict';

import { getAllMatches, getPositionFromMatch } from '../util.js';
import ControlCharValidator from './ControlCharValidator.js';

const validAttrStrRegxp = new RegExp('(\\s*)([^\\s=]+)(\\s*=)?(\\s*([\'"])(([\\s\\S])*?)\\5)?', 'g');

/**
 * AttributeStringValidator — single responsibility: validate the raw
 * attribute-expression substring of a start tag (everything between the tag
 * name and the closing `>`/`/>`).
 *
 * Checks performed (always on):
 *   - proper whitespace separation between attributes
 *   - attribute names are valid QNames
 *   - no duplicate attribute names
 *   - `=` present without a value -> "without value"
 *   - value present but not quoted -> UnquotedAttributeValue
 *   - boolean attributes rejected unless `allowBooleanAttributes`
 *   - illegal control characters inside the attribute value
 *   - `xmlns:x=""` only allowed in XML 1.1
 *
 * Checks performed (opt-in via `invalidCharSequence.attrLt`):
 *   - literal `<` inside an attribute value
 */
export default class AttributeStringValidator {
  /**
   * @param {object} options - the full validation options object
   * @param {import('./XmlNameValidator.js').default} nameValidator
   * @param {string} xmlVersion
   */
  constructor(options, nameValidator, xmlVersion) {
    this.options = options;
    this.nameValidator = nameValidator;
    this.xmlVersion = xmlVersion;
  }

  /**
   * @param {string} attrStr
   * @returns {true | { err: { code: string, msg: string, line: number } }}
   */
  validate(attrStr) {
    const matches = getAllMatches(attrStr, validAttrStrRegxp);
    const attrNames = {};
    const checkAttrLt = this.options.invalidCharSequence?.attrLt === true;

    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];

      if (m[1].length === 0) {
        return this._err('InvalidAttr', "Attribute '" + m[2] + "' has no space in starting.", m);
      }

      const hasEquals = m[3] !== undefined;
      const hasQuotedValue = m[4] !== undefined;

      if (hasEquals && !hasQuotedValue) {
        // Either `attr=` with nothing after it, or `attr=value` where value
        // isn't wrapped in quotes — XML requires every attribute value to be
        // quoted, so both shapes are rejected as UnquotedAttributeValue.
        return this._err(
          'UnquotedAttributeValue',
          "Attribute '" + m[2] + "' is without value.",
          m
        );
      } else if (!hasEquals && !this.options.allowBooleanAttributes) {
        return this._err('InvalidAttr', "boolean attribute '" + m[2] + "' is not allowed.", m);
      }

      const attrName = m[2];

      if (!this.nameValidator.isValidQName(attrName)) {
        return this._err('InvalidAttr', "Attribute '" + attrName + "' is an invalid name.", m);
      }

      const attrValue = m[6] || '';

      if (hasQuotedValue) {
        const illegalIdx = ControlCharValidator.findIllegalIndex(attrValue);
        if (illegalIdx !== -1) {
          const code = attrValue.charCodeAt(illegalIdx);
          return this._err(
            'IllegalCharacter',
            `Illegal control character ${ControlCharValidator.describe(code)} in attribute '${attrName}' value.`,
            m
          );
        }

        if (checkAttrLt && attrValue.indexOf('<') !== -1) {
          return this._err('InvalidAttr', `Attribute '${attrName}' value must not contain '<'.`, m);
        }
      }

      if (attrName.startsWith('xmlns:') && m[6] === '' && this.xmlVersion === '1.0') {
        return this._err(
          'InvalidAttr',
          `Undeclaring the prefixed namespace ${attrName}="" is only permitted in XML 1.1 documents.`,
          m
        );
      }

      if (!Object.prototype.hasOwnProperty.call(attrNames, attrName)) {
        attrNames[attrName] = 1;
      } else {
        return this._err('InvalidAttr', "Attribute '" + attrName + "' is repeated.", m);
      }
    }

    return true;
  }

  _err(code, msg, match) {
    return { err: { code, msg, line: getPositionFromMatch(match) } };
  }
}
