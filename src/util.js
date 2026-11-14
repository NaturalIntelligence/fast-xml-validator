'use strict';

export function getAllMatches(string, regex) {
  const matches = [];
  let match = regex.exec(string);
  while (match) {
    const allmatches = [];
    allmatches.startIndex = regex.lastIndex - match[0].length;
    const len = match.length;
    for (let index = 0; index < len; index++) {
      allmatches.push(match[index]);
    }
    matches.push(allmatches);
    match = regex.exec(string);
  }
  return matches;
}

export function isExist(v) {
  return typeof v !== 'undefined';
}

export function isEmptyObject(obj) {
  return Object.keys(obj).length === 0;
}

export function getValue(v) {
  if (isExist(v)) {
    return v;
  } else {
    return '';
  }
}

export function isWhiteSpace(char) {
  return char === ' ' || char === '\t' || char === '\n' || char === '\r';
}

/**
 * True for character codes that are illegal as literal characters anywhere in
 * an XML document (element text, attribute values, comments): 0x00-0x08,
 * 0x0B, 0x0C, 0x0E-0x1F. Tab/LF/CR (0x09/0x0A/0x0D) are legal whitespace and
 * are excluded.
 */
export function isIllegalControlCode(code) {
  return code <= 8 || code === 11 || code === 12 || (code >= 14 && code <= 31);
}

export function getLineNumberForPosition(xmlData, index) {
  const lines = xmlData.substring(0, index).split(/\r?\n/);
  return {
    line: lines.length,
    col: lines[lines.length - 1].length + 1,
  };
}

export function getPositionFromMatch(match) {
  return match.startIndex + match[1].length;
}

/**
 * Find the first malformed reference in an attribute value.
 *
 * Per the XML spec, `&` may only appear as the start of a well-formed
 * reference: `&name;`, `&#digits;` or `&#xhex;`. Names are limited to 20
 * word characters, mirroring the text-content check in SyntaxValidator.
 *
 * Unlike SyntaxValidator#_validateAmpersand, a string that ends before the
 * terminating ';' is reported as malformed (never accepted).
 *
 * @param {string} str
 * @returns {number} index of the offending '&', or -1 if all are valid
 */
export function findInvalidReference(str) {
  for (let i = str.indexOf('&'); i !== -1; i = str.indexOf('&', i + 1)) {
    let j = i + 1;
    if (str[j] === '#') {
      j++;
      const hex = str[j] === 'x';
      if (hex) j++;
      const re = hex ? /[0-9a-fA-F]/ : /[0-9]/;
      const digitsStart = j;
      while (j < str.length && re.test(str[j])) j++;
      if (j === digitsStart || str[j] !== ';') return i;
    } else {
      const nameStart = j;
      while (j < str.length && j - nameStart < 20 && /\w/.test(str[j])) j++;
      if (j === nameStart || str[j] !== ';') return i;
    }
  }
  return -1;
}
