'use strict';

/**
 * XmlDeclarationValidator — single responsibility: parse and validate the
 * `<?xml version="..." encoding="..." standalone="..."?>` prolog.
 *
 * Behaviour is controlled by the `xmlDeclaraion` config block:
 *
 *   xmlDeclaraion: {
 *     optional: true,     // when false, the document MUST start with a decl
 *     argPosition: true,  // when true, version/encoding/standalone must
 *                          // appear in that fixed order (spec-mandated);
 *                          // set false to allow any order.
 *   }
 *
 * (`argPostion` — the spelling used in the original design note — is also
 * accepted as an alias for `argPosition`.)
 */
export default class XmlDeclarationValidator {
  constructor(options = {}, throwError) {
    this.optional = options.optional !== undefined ? options.optional : true;
    this.argPosition = options.argPosition !== undefined
      ? options.argPosition
      : (options.argPostion !== undefined ? options.argPostion : true);
    this._throwError = throwError;
  }

  /**
   * @param {string} xmlData - full document (BOM already stripped)
   * @returns {{ version: string, end: number }} version defaults to '1.0'
   *   and end is 0 when there is no declaration present.
   */
  validate(xmlData) {
    const hasDecl = xmlData.startsWith('<?xml');

    if (!hasDecl) {
      if (!this.optional) {
        this._throwError('InvalidXml', 'XML declaration is required but missing.', { line: 1, col: 1 });
      }
      return { version: '1.0', end: 0 };
    }

    const piEnd = xmlData.indexOf('?>');
    if (piEnd === -1) {
      this._throwError('InvalidXml', 'XML declaration is not closed with "?>".', { line: 1, col: 1 });
    }

    const declBody = xmlData.substring(5, piEnd);
    const end = piEnd + 2;

    const ALLOWED = ['version', 'encoding', 'standalone'];
    const attrRe = /\s+([\w]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

    let version = '1.0';
    let lastAllowedIdx = -1;
    let match;

    while ((match = attrRe.exec(declBody)) !== null) {
      const attrName = match[1];
      const attrValue = match[2] !== undefined ? match[2] : match[3];
      const attrPos = match.index;

      const allowedIdx = ALLOWED.indexOf(attrName);
      if (allowedIdx === -1) {
        this._throwError('InvalidXml',
          'XML declaration contains unknown attribute "' + attrName + '". Allowed: version, encoding, standalone.',
          { line: 1, col: 6 + attrPos });
      }

      if (this.argPosition && allowedIdx <= lastAllowedIdx) {
        this._throwError('InvalidXml',
          'XML declaration attribute "' + attrName + '" is out of order. Required order: version, encoding, standalone.',
          { line: 1, col: 6 + attrPos });
      }
      lastAllowedIdx = allowedIdx;

      if (attrName === 'version') {
        if (attrValue !== '1.0' && attrValue !== '1.1') {
          this._throwError('InvalidXml',
            'XML declaration version "' + attrValue + '" is not supported. Must be "1.0" or "1.1".',
            { line: 1, col: 6 + attrPos });
        }
        version = attrValue;
      } else if (attrName === 'standalone') {
        if (attrValue !== 'yes' && attrValue !== 'no') {
          this._throwError('InvalidXml',
            'XML declaration standalone "' + attrValue + '" is invalid. Must be "yes" or "no".',
            { line: 1, col: 6 + attrPos });
        }
      }
      // encoding: value format validation is out of scope
    }

    const leftover = declBody.replace(/\s+[\w]+\s*=\s*(?:"[^"]*"|'[^']*')/g, '').trim();
    if (leftover.length > 0) {
      this._throwError('InvalidXml',
        'XML declaration contains invalid content: "' + leftover + '".',
        { line: 1, col: 1 });
    }

    return { version, end };
  }
}
