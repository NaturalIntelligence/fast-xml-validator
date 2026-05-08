'use strict';

import { getAllMatches } from './util.js';
import { name as xmlName, qName } from 'xml-naming';
import DocTypeValidator from './DocTypeValidator.js';
import ValidationError from './ValidationError.js';

const defaultOptions = {
  allowBooleanAttributes: false,
  unpairedTags: [],
  // DOCTYPE entity limits — Infinity means no limit by default
  docType: {
    maxEntityCount: Infinity,
    maxEntitySize: Infinity,
  },
};

export function validate(xmlData, options) {
  options = Object.assign({}, defaultOptions, options);

  const docTypeValidator = new DocTypeValidator(options.docType);

  const tags = [];
  let tagFound = false;

  //indicates that the root tag has been closed (aka. depth 0 has been reached)
  let reachedRoot = false;

  if (xmlData[0] === '\ufeff') {
    // check for byte order mark (BOM)
    xmlData = xmlData.substr(1);
  }

  if (xmlData.startsWith('<?xml')) {
    const piEnd = xmlData.indexOf('?>');
    if (piEnd === -1) {
      return throwError('InvalidXml', 'Processing instruction is not closed with "?>".',
        { line: 1, col: 1 });
    }
    xmlData = xmlData.substring(piEnd + 2);
  }

  for (let i = 0; i < xmlData.length; i++) {
    if (xmlData[i] === '<' && xmlData[i + 1] === '?') {
      i += 2;
      i = readPI(xmlData, i);
      if (i.err) return i;
    } else if (xmlData[i] === '<') {
      //starting of tag
      //read until you reach to '>' avoiding any '>' in attribute value
      let tagStartPos = i;
      i++;

      if (xmlData[i] === '!') {
        try {
          i = readCommentAndCDATA(xmlData, i, docTypeValidator);
        } catch (err) {
          return throwError("InvalidTag", err.message, getLineNumberForPosition(xmlData, i - 1));
        }
        continue;
      } else {
        let closingTag = false;
        if (xmlData[i] === '/') {
          closingTag = true;
          i++;
        }

        let tagName = '';
        for (;
          i < xmlData.length &&
          xmlData[i] !== '>' &&
          xmlData[i] !== ' ' &&
          xmlData[i] !== '\t' &&
          xmlData[i] !== '\n' &&
          xmlData[i] !== '\r';
          i++
        ) {
          tagName += xmlData[i];
        }
        tagName = tagName.trim();

        if (tagName[tagName.length - 1] === '/') {
          //self closing tag without attributes
          tagName = tagName.substring(0, tagName.length - 1);
          i--;
        }

        // use validateQName so namespaced tags (e.g. <ns:tag>) are
        // accepted and malformed ones (e.g. <:tag>, <ns:>, <a:b:c>) are rejected.
        if (!validateQName(tagName)) {
          let msg;
          if (tagName.trim().length === 0) {
            msg = "Invalid space after '<'.";
          } else {
            msg = "Tag '" + tagName + "' is an invalid name.";
          }
          return throwError('InvalidTag', msg, getLineNumberForPosition(xmlData, tagStartPos));
        }

        const result = readAttributeStr(xmlData, i);
        if (result === false) {
          return throwError('InvalidAttr', "Attributes for '" + tagName + "' have open quote.", getLineNumberForPosition(xmlData, i));
        }
        let attrStr = result.value;
        i = result.index;

        if (attrStr[attrStr.length - 1] === '/') {
          //self closing tag
          const attrStrStart = i - attrStr.length;
          attrStr = attrStr.substring(0, attrStr.length - 1);
          const isValid = validateAttributeString(attrStr, options);
          if (isValid === true) {
            if (reachedRoot === true) {
              return throwError('InvalidXml', 'Multiple possible root nodes found.', getLineNumberForPosition(xmlData, tagStartPos));
            }
            tagFound = true;
            //if no open tags remain on the stack, this self-closing tag is the root
            if (tags.length === 0) {
              reachedRoot = true;
            }
          } else {
            //the result from the nested function returns the position of the error within the attribute
            //in order to get the 'true' error line, we need to calculate the position where the attribute begins (i - attrStr.length) and then add the position within the attribute
            //this gives us the absolute index in the entire xml, which we can use to find the line at last
            return throwError(isValid.err.code, isValid.err.msg, getLineNumberForPosition(xmlData, attrStrStart + isValid.err.line));
          }
        } else if (closingTag) {
          if (!result.tagClosed) {
            return throwError('InvalidTag', "Closing tag '" + tagName + "' doesn't have proper closing.", getLineNumberForPosition(xmlData, i));
          } else if (attrStr.trim().length > 0) {
            return throwError('InvalidTag', "Closing tag '" + tagName + "' can't have attributes or invalid starting.", getLineNumberForPosition(xmlData, tagStartPos));
          } else if (tags.length === 0) {
            return throwError('InvalidTag', "Closing tag '" + tagName + "' has not been opened.", getLineNumberForPosition(xmlData, tagStartPos));
          } else {
            const otg = tags.pop();
            if (tagName !== otg.tagName) {
              let openPos = getLineNumberForPosition(xmlData, otg.tagStartPos);
              return throwError(
                'InvalidTag',
                "Expected closing tag '" + otg.tagName + "' (opened in line " + openPos.line + ", col " + openPos.col + ") instead of closing tag '" + tagName + "'.",
                getLineNumberForPosition(xmlData, tagStartPos)
              );
            }

            //when there are no more tags, we reached the root level.
            if (tags.length === 0) {
              reachedRoot = true;
            }
          }
        } else {
          const isValid = validateAttributeString(attrStr, options);
          if (isValid !== true) {
            return throwError(isValid.err.code, isValid.err.msg, getLineNumberForPosition(xmlData, i - attrStr.length + isValid.err.line));
          }

          if (reachedRoot === true) {
            return throwError('InvalidXml', 'Multiple possible root nodes found.', getLineNumberForPosition(xmlData, i));
          } else if (options.unpairedTags.indexOf(tagName) !== -1) {
            // don't push into stack
          } else {
            tags.push({ tagName, tagStartPos });
          }
          tagFound = true;
        }

        //skip tag text value
        //It may include comments and CDATA value
        for (i++; i < xmlData.length; i++) {
          if (xmlData[i] === '<') {
            if (xmlData[i + 1] === '!') {
              //comment or CADATA
              i++;
              try {
                i = readCommentAndCDATA(xmlData, i, docTypeValidator);
              } catch (err) {
                return throwError("InvalidDocType", err.message, getLineNumberForPosition(xmlData, i - 1));
              }
              continue;
            } else if (xmlData[i + 1] === '?') {
              i += 2;
              i = readPI(xmlData, i);
              if (i.err) return i;
            } else {
              break;
            }
          } else if (xmlData[i] === '&') {
            const afterAmp = validateAmpersand(xmlData, i);
            if (afterAmp === -1)
              return throwError('InvalidChar', "char '&' is not expected.", getLineNumberForPosition(xmlData, i));
            i = afterAmp;
          } else {
            if (reachedRoot === true && !isWhiteSpace(xmlData[i])) {
              return throwError('InvalidXml', 'Extra text at the end', getLineNumberForPosition(xmlData, i));
            }
          }
        } //end of reading tag text value
        if (xmlData[i] === '<') {
          i--;
        }
      }
    } else {
      if (isWhiteSpace(xmlData[i])) {
        continue;
      }
      if (reachedRoot) {
        return throwError('InvalidXml', "Extra text at the end: '" + xmlData[i] + "' is not expected.", getLineNumberForPosition(xmlData, i));
      }
      return throwError('InvalidChar', "char '" + xmlData[i] + "' is not expected.", getLineNumberForPosition(xmlData, i));
    }
  }

  if (!tagFound) {
    return throwError('InvalidXml', 'Start tag expected.', { line: 1, col: 1 });
  } else if (tags.length === 1) {
    return throwError('InvalidTag', "Unclosed tag '" + tags[0].tagName + "'.", getLineNumberForPosition(xmlData, tags[0].tagStartPos));
  } else if (tags.length > 0) {
    return throwError('InvalidXml', "Invalid '" +
      JSON.stringify(tags.map(t => t.tagName)).replace(/\r?\n/g, '') +
      "' found.", { line: 1, col: 1 });
  }

  return true;
}

function isWhiteSpace(char) {
  return char === ' ' || char === '\t' || char === '\n' || char === '\r';
}

function readPI(xmlData, i) {
  const piStart = i; // points just after '<?'
  const nameStart = i;
  let nameValidated = false;

  for (; i < xmlData.length; i++) {
    const ch = xmlData[i];

    if (!nameValidated && (ch === ' ' || ch === '?')) {
      // First delimiter — extract and validate the PI target name once
      const piName = xmlData.substr(nameStart, i - nameStart);
      nameValidated = true;

      if (piName.toLowerCase() === 'xml') {
        return throwError(
          'InvalidXml',
          'XML declaration allowed only at the start of the document.',
          getLineNumberForPosition(xmlData, piStart - 2) // point at '<'
        );
      } else if (!xmlName(piName)) {
        // PI target must be a valid XML Name (XML 1.0 §2.6)
        return throwError(
          'InvalidXml',
          `Processing instruction target "${piName}" is not a valid XML Name.`,
          getLineNumberForPosition(xmlData, piStart - 2)
        );
      }
    }

    if (ch === '?' && xmlData[i + 1] === '>') {
      i++;
      return i;
    }
  }

  // reached EOF without closing '?>'
  return throwError(
    'InvalidXml',
    'Processing instruction is not closed with "?>".',
    getLineNumberForPosition(xmlData, piStart - 2) // point at '<'
  );
}

/**
 * Handles comments, CDATA sections, and DOCTYPE declarations.
 * DOCTYPE validation is delegated to DocTypeValidator.
 * @param {string} xmlData
 * @param {number} i         — points at the '!' character
 * @param {DocTypeValidator} docTypeValidator
 */
function readCommentAndCDATA(xmlData, i, docTypeValidator) {
  if (xmlData.length > i + 2 && xmlData[i + 1] === '-' && xmlData[i + 2] === '-') {
    // Comment: <!-- ... -->
    for (i += 3; i < xmlData.length; i++) {
      if (xmlData[i] === '-' && xmlData[i + 1] === '-' && xmlData[i + 2] === '>') {
        i += 2;
        break;
      }
    }
    if (xmlData[i] !== '>') {
      throw new Error('Comment is not closed with "-->".');
    }
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
    // DOCTYPE: delegate fully to DocTypeValidator
    // i currently points at '!', so the '<' is at i - 1
    i = docTypeValidator.validateDocType(xmlData, i - 1);
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
    // CDATA: <![CDATA[ ... ]]>
    for (i += 8; i < xmlData.length; i++) {
      if (xmlData[i] === ']' && xmlData[i + 1] === ']' && xmlData[i + 2] === '>') {
        i += 2;
        break;
      }
    }
    if (xmlData[i] !== '>') {
      throw new Error('CDATA section is not closed with "]]>".');
    }
  } else {
    //Reject unrecognised <! constructs (e.g. <!ELEMENT, <!ATTLIST
    // appearing outside a DOCTYPE, or simply malformed "<!xyz").
    throw new Error("Invalid construct starting with '<!'.");
  }

  return i;
}

const doubleQuote = '"';
const singleQuote = "'";

/**
 * Keep reading xmlData until '<' is found outside the attribute value.
 * @param {string} xmlData
 * @param {number} i
 */
function readAttributeStr(xmlData, i) {
  let attrStr = '';
  let startChar = '';
  let tagClosed = false;
  for (; i < xmlData.length; i++) {
    if (xmlData[i] === doubleQuote || xmlData[i] === singleQuote) {
      if (startChar === '') {
        startChar = xmlData[i];
      } else if (startChar !== xmlData[i]) {
        // opposite quote inside value — allowed
      } else {
        startChar = '';
      }
    } else if (xmlData[i] === '>') {
      if (startChar === '') {
        tagClosed = true;
        break;
      }
    }
    attrStr += xmlData[i];
  }
  if (startChar !== '') {
    return false;
  }
  return { value: attrStr, index: i, tagClosed };
}

const validAttrStrRegxp = new RegExp('(\\s*)([^\\s=]+)(\\s*=)?(\\s*([\'"])(([\\s\\S])*?)\\5)?', 'g');

function validateAttributeString(attrStr, options) {
  const matches = getAllMatches(attrStr, validAttrStrRegxp);
  const attrNames = {};

  for (let i = 0; i < matches.length; i++) {
    if (matches[i][1].length === 0) {
      return { err: { code: 'InvalidAttr', msg: "Attribute '" + matches[i][2] + "' has no space in starting.", line: getPositionFromMatch(matches[i]) } };
    } else if (matches[i][3] !== undefined && matches[i][4] === undefined) {
      return { err: { code: 'InvalidAttr', msg: "Attribute '" + matches[i][2] + "' is without value.", line: getPositionFromMatch(matches[i]) } };
    } else if (matches[i][3] === undefined && !options.allowBooleanAttributes) {
      return { err: { code: 'InvalidAttr', msg: "boolean attribute '" + matches[i][2] + "' is not allowed.", line: getPositionFromMatch(matches[i]) } };
    }

    const attrName = matches[i][2];

    //validate attribute names as QNames so namespaced attributes
    // (e.g. xml:lang, xmlns:xsi) are accepted and malformed ones are rejected.
    if (!validateQName(attrName)) {
      return { err: { code: 'InvalidAttr', msg: "Attribute '" + attrName + "' is an invalid name.", line: getPositionFromMatch(matches[i]) } };
    }

    // xmlns="" (undeclaring the default namespace) is valid in XML 1.1
    // only. Emit a clear error rather than silently accepting it.
    if (attrName === 'xmlns' && matches[i][6] === '') {
      return { err: { code: 'InvalidAttr', msg: 'Undeclaring the default namespace with xmlns="" is only permitted in XML 1.1 documents.', line: getPositionFromMatch(matches[i]) } };
    }

    if (!Object.prototype.hasOwnProperty.call(attrNames, attrName)) {
      attrNames[attrName] = 1;
    } else {
      return { err: { code: 'InvalidAttr', msg: "Attribute '" + attrName + "' is repeated.", line: getPositionFromMatch(matches[i]) } };
    }
  }

  return true;
}

function validateNumberAmpersand(xmlData, i) {
  let re = /\d/;
  if (xmlData[i] === 'x') {
    i++;
    re = /[\da-fA-F]/;
  }
  for (; i < xmlData.length; i++) {
    if (xmlData[i] === ';') return i;
    if (!xmlData[i].match(re)) break;
  }
  return -1;
}

function validateAmpersand(xmlData, i) {
  i++;
  if (xmlData[i] === ';') return -1;
  if (xmlData[i] === '#') {
    i++;
    return validateNumberAmpersand(xmlData, i);
  }
  let count = 0;
  for (; i < xmlData.length; i++, count++) {
    if (xmlData[i].match(/\w/) && count < 20) continue;
    if (xmlData[i] === ';') break;
    return -1;
  }
  return i;
}

function throwError(code, message, lineNumber) {
  throw new ValidationError(message, code, lineNumber.line || lineNumber, lineNumber.col);
}

/**
 * Validate an XML QName (Namespaces in XML 1.0 §2.3).
 * Delegates to xml-naming's qName production, which enforces:
 *   - Non-empty input.
 *   - At most one colon (used as prefix separator).
 *   - Neither prefix nor local part may be empty (:foo, ns:, : all rejected).
 *   - Both parts must satisfy NCName character rules.
 */
function validateQName(str) {
  return qName(str);
}

function getLineNumberForPosition(xmlData, index) {
  const lines = xmlData.substring(0, index).split(/\r?\n/);
  return {
    line: lines.length,
    col: lines[lines.length - 1].length + 1,
  };
}

function getPositionFromMatch(match) {
  return match.startIndex + match[1].length;
}