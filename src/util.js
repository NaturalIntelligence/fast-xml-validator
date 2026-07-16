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
