'use strict';

import { isWhiteSpace } from '../util.js';

function isWordChar(ch) {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9') || ch === '_';
}

/**
 * Walk the `<?xml ... ?>` body once, left to right, pulling out
 * `name="value"` / `name='value'` pairs (each one preceded by required
 * whitespace) and collecting everything else as leftover text.
 *
 * This replaces two regexes that used to do the same job:
 *   /\s+([\w]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g          - to find attributes
 *   /\s+[\w]+\s*=\s*(?:"[^"]*"|'[^']*')/g (via replace)  - to find leftovers
 *
 * Both led with a required-but-greedy `\s+`. On a long run of whitespace
 * that's never followed by a valid `name=value`, the engine backtracks that
 * whitespace group one character at a time before giving up on that
 * starting position — and since none of those backtracked attempts can ever
 * succeed (a whitespace character is never a valid name character, at any
 * backtrack length), all of that retrying was wasted work. A `<?xml ?>`
 * declaration padded with thousands of spaces could make this step take
 * seconds. Scanning forward once, without ever revisiting a position, is
 * both faster and gives the identical result — the retried attempts could
 * never have succeeded anyway.
 *
 * @param {string} declBody
 * @returns {{ matches: Array<{name: string, value: string, index: number}>, leftover: string }}
 */
function scanDeclAttributes(declBody) {
  const matches = [];
  let leftover = '';
  const len = declBody.length;
  let i = 0;

  while (i < len) {
    if (!isWhiteSpace(declBody[i])) {
      leftover += declBody[i];
      i++;
      continue;
    }

    const matchStart = i;
    let p = i;
    while (p < len && isWhiteSpace(declBody[p])) p++;

    const nameStart = p;
    while (p < len && isWordChar(declBody[p])) p++;
    if (p === nameStart) {
      // Whitespace not followed by a name character — can't become a match
      // no matter how much of the whitespace we consider, so it's leftover.
      leftover += declBody.slice(matchStart, p + 1 <= len ? p : len);
      i = p > matchStart ? p : matchStart + 1;
      continue;
    }
    const name = declBody.slice(nameStart, p);

    let q = p;
    while (q < len && isWhiteSpace(declBody[q])) q++;
    if (declBody[q] !== '=') {
      leftover += declBody.slice(matchStart, p);
      i = p;
      continue;
    }
    q++; // skip '='
    while (q < len && isWhiteSpace(declBody[q])) q++;

    const quote = declBody[q];
    if (quote !== '"' && quote !== "'") {
      leftover += declBody.slice(matchStart, p);
      i = p;
      continue;
    }
    const valueStart = q + 1;
    const closeIdx = declBody.indexOf(quote, valueStart);
    if (closeIdx === -1) {
      leftover += declBody.slice(matchStart, p);
      i = p;
      continue;
    }

    matches.push({ name, value: declBody.slice(valueStart, closeIdx), index: matchStart });
    i = closeIdx + 1;
  }

  return { matches, leftover };
}

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
    const { matches: declAttrs, leftover } = scanDeclAttributes(declBody);

    let version = '1.0';
    let lastAllowedIdx = -1;

    for (let m = 0; m < declAttrs.length; m++) {
      const attrName = declAttrs[m].name;
      const attrValue = declAttrs[m].value;
      const attrPos = declAttrs[m].index;

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

    const trimmedLeftover = leftover.trim();
    if (trimmedLeftover.length > 0) {
      this._throwError('InvalidXml',
        'XML declaration contains invalid content: "' + trimmedLeftover + '".',
        { line: 1, col: 1 });
    }

    return { version, end };
  }
}