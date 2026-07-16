'use strict';

import ValidationError from './ValidationError.js';
import { isWhiteSpace, getLineNumberForPosition, isIllegalControlCode } from './util.js';
import XmlNameValidator from './validators/XmlNameValidator.js';
import XmlDeclarationValidator from './validators/XmlDeclarationValidator.js';
import AttributeStringValidator from './validators/AttributeStringValidator.js';
import CommentCdataReader from './validators/CommentCdataReader.js';
import ControlCharValidator from './validators/ControlCharValidator.js';
import SkipTagMatcher from './validators/SkipTagMatcher.js';
import RawSubtreeReader from './validators/RawSubtreeReader.js';
import DocTypeValidator from './validators/DocTypeValidator.js';

const defaultOptions = {
  allowBooleanAttributes: false,
  unpairedTags: [],
  docType: {
    maxEntityCount: Infinity,
    maxEntitySize: Infinity,
  },
  invalidCharSequence: {
    comment: false,   // '--' inside a comment body
    tagValue: false,  // ']]>' inside element text content
    attrLt: false,    // '<' inside an attribute value
  },
  xmlDeclaraion: {
    optional: true,
    argPosition: true,
  },
  multipleRoots: true,
  skipTags: [],
};

/**
 * SyntaxValidator — validates that an XML document is well-formed.
 *
 * This is an orchestrator: it owns the top-level character scan and the
 * open/close tag stack, and delegates every other concern to a focused,
 * single-responsibility collaborator:
 *
 *   - XmlDeclarationValidator  — the `<?xml ... ?>` prolog
 *   - DocTypeValidator         — `<!DOCTYPE ...>`
 *   - CommentCdataReader       — `<!-- -->` and `<![CDATA[ ]]>`
 *   - AttributeStringValidator — a tag's attribute expression
 *   - XmlNameValidator         — element/attribute/PI name well-formedness
 *   - ControlCharValidator     — illegal control characters (always on)
 *   - SkipTagMatcher / RawSubtreeReader — `skipTags` support
 *
 * Usage: `new SyntaxValidator(options).validate(xmlData)` or the static
 * convenience `SyntaxValidator.validate(xmlData, options)`.
 */
export default class SyntaxValidator {
  constructor(options) {
    this.options = mergeOptions(defaultOptions, options);
  }

  /** Static convenience wrapper — matches the historical fxv v1 API. */
  static validate(xmlData, options) {
    return new SyntaxValidator(options).validate(xmlData);
  }

  validate(xmlData) {
    const options = this.options;

    const tags = [];
    let tagFound = false;
    let reachedRoot = false;
    let docTypeSeen = false;

    if (xmlData[0] === '\ufeff') {
      xmlData = xmlData.substr(1);
    }

    const throwError = (code, message, lineNumber) => {
      throw new ValidationError(message, code, lineNumber.line || lineNumber, lineNumber.col);
    };

    const declValidator = new XmlDeclarationValidator(options.xmlDeclaraion, throwError);
    const declResult = declValidator.validate(xmlData);
    const xmlVersion = declResult.version;
    xmlData = xmlData.substring(declResult.end);

    const docTypeValidator = new DocTypeValidator(options.docType, xmlVersion);
    const commentCdataReader = new CommentCdataReader(options);
    const nameValidator = new XmlNameValidator(xmlVersion);
    const attrValidator = new AttributeStringValidator(options, nameValidator, xmlVersion);
    const skipMatcher = new SkipTagMatcher(options.skipTags);

    const checkTagValueSeq = options.invalidCharSequence?.tagValue === true;

    const checkDocTypePlacement = (startBang) => {
      const isDoctype = xmlData.substring(startBang, startBang + 9).toUpperCase() === '<!DOCTYPE';
      if (!isDoctype) return;
      if (docTypeSeen) {
        throwError('InvalidXml', 'Multiple DOCTYPE declarations found.', getLineNumberForPosition(xmlData, startBang));
      }
      if (tagFound || tags.length > 0) {
        throwError('InvalidXml', 'DOCTYPE must appear before the root element.', getLineNumberForPosition(xmlData, startBang));
      }
      docTypeSeen = true;
    };

    for (let i = 0; i < xmlData.length; i++) {
      if (xmlData[i] === '<' && xmlData[i + 1] === '?') {
        i += 2;
        i = this._readPI(xmlData, i, nameValidator, throwError);
      } else if (xmlData[i] === '<') {
        let tagStartPos = i;
        i++;

        if (xmlData[i] === '!') {
          try {
            checkDocTypePlacement(tagStartPos);
            i = commentCdataReader.read(xmlData, i, docTypeValidator);
          } catch (err) {
            throwError('InvalidDocType', err.message, getLineNumberForPosition(xmlData, i - 1));
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
            tagName = tagName.substring(0, tagName.length - 1);
            i--;
          }

          if (!nameValidator.isValidQName(tagName)) {
            let msg;
            if (tagName.trim().length === 0) {
              msg = "Invalid space after '<'.";
            } else {
              msg = "Tag '" + tagName + "' is an invalid name.";
            }
            throwError('InvalidTag', msg, getLineNumberForPosition(xmlData, tagStartPos));
          }

          const result = this._readAttributeStr(xmlData, i);
          if (result === false) {
            throwError('InvalidAttr', "Attributes for '" + tagName + "' have open quote.", getLineNumberForPosition(xmlData, i));
          }
          let attrStr = result.value;
          i = result.index;

          if (attrStr[attrStr.length - 1] === '/') {
            const attrStrStart = i - attrStr.length;
            attrStr = attrStr.substring(0, attrStr.length - 1);
            const isValid = attrValidator.validate(attrStr);
            if (isValid === true) {
              if (reachedRoot === true && !options.multipleRoots) {
                throwError('InvalidXml', 'Multiple possible root nodes found.', getLineNumberForPosition(xmlData, tagStartPos));
              }
              tagFound = true;
              if (tags.length === 0) {
                reachedRoot = true;
              }
              skipMatcher.push(tagName);
              skipMatcher.pop();
            } else {
              throwError(isValid.err.code, isValid.err.msg, getLineNumberForPosition(xmlData, attrStrStart + isValid.err.line));
            }
          } else if (closingTag) {
            if (!result.tagClosed) {
              throwError('InvalidTag', "Closing tag '" + tagName + "' doesn't have proper closing.", getLineNumberForPosition(xmlData, i));
            } else if (attrStr.trim().length > 0) {
              throwError('InvalidTag', "Closing tag '" + tagName + "' can't have attributes or invalid starting.", getLineNumberForPosition(xmlData, tagStartPos));
            } else if (tags.length === 0) {
              throwError('InvalidTag', "Closing tag '" + tagName + "' has not been opened.", getLineNumberForPosition(xmlData, tagStartPos));
            } else {
              const otg = tags.pop();
              if (tagName !== otg.tagName) {
                let openPos = getLineNumberForPosition(xmlData, otg.tagStartPos);
                throwError(
                  'InvalidTag',
                  "Expected closing tag '" + otg.tagName + "' (opened in line " + openPos.line + ", col " + openPos.col + ") instead of closing tag '" + tagName + "'.",
                  getLineNumberForPosition(xmlData, tagStartPos)
                );
              }
              skipMatcher.pop();
              if (tags.length === 0) {
                reachedRoot = true;
              }
            }
          } else {
            // Opening tag — decide whether this subtree should be skipped
            // from validation entirely before validating its attributes.
            const skip = skipMatcher.push(tagName);

            if (!skip) {
              const isValid = attrValidator.validate(attrStr);
              if (isValid !== true) {
                throwError(isValid.err.code, isValid.err.msg, getLineNumberForPosition(xmlData, i - attrStr.length + isValid.err.line));
              }
            }

            if (reachedRoot === true && !options.multipleRoots) {
              throwError('InvalidXml', 'Multiple possible root nodes found.', getLineNumberForPosition(xmlData, i));
            } else if (options.unpairedTags.indexOf(tagName) !== -1) {
              skipMatcher.pop();
            } else if (skip) {
              // Consume the whole skipped subtree now, as opaque raw text,
              // then continue scanning right after its closing tag.
              i = RawSubtreeReader.consume(xmlData, tagName, i + 1);
              skipMatcher.pop();
              if (tags.length === 0) reachedRoot = true;
              tagFound = true;
              continue;
            } else {
              tags.push({ tagName, tagStartPos });
            }
            tagFound = true;
          }

          //skip tag text value
          //It may include comments and CDATA value
          let prevTwo = '';
          for (i++; i < xmlData.length; i++) {
            if (xmlData[i] === '<') {
              if (xmlData[i + 1] === '!') {
                i++;
                try {
                  checkDocTypePlacement(i - 1);
                  i = commentCdataReader.read(xmlData, i, docTypeValidator);
                } catch (err) {
                  throwError('InvalidDocType', err.message, getLineNumberForPosition(xmlData, i - 1));
                }
                prevTwo = '';
                continue;
              } else if (xmlData[i + 1] === '?') {
                i += 2;
                i = this._readPI(xmlData, i, nameValidator, throwError);
                prevTwo = '';
              } else {
                break;
              }
            } else if (xmlData[i] === '&') {
              const afterAmp = this._validateAmpersand(xmlData, i);
              if (afterAmp === -1)
                throwError('InvalidChar', "char '&' is not expected.", getLineNumberForPosition(xmlData, i));
              i = afterAmp;
              prevTwo = '';
            } else {
              const code = xmlData.charCodeAt(i);
              if (isIllegalControlCode(code)) {
                throwError('IllegalCharacter', `Illegal control character ${ControlCharValidator.describe(code)} in document content.`, getLineNumberForPosition(xmlData, i));
              }
              if (reachedRoot === true && tags.length === 0 && !isWhiteSpace(xmlData[i])) {
                throwError('InvalidXml', 'Extra text at the end', getLineNumberForPosition(xmlData, i));
              }
              if (checkTagValueSeq) {
                prevTwo = (prevTwo + xmlData[i]).slice(-2);
                if (prevTwo === ']]' && xmlData[i + 1] === '>') {
                  throwError('InvalidXml', "Element text content must not contain ']]>'.", getLineNumberForPosition(xmlData, i - 1));
                }
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
          throwError('InvalidXml', "Extra text at the end: '" + xmlData[i] + "' is not expected.", getLineNumberForPosition(xmlData, i));
        }
        throwError('InvalidChar', "char '" + xmlData[i] + "' is not expected.", getLineNumberForPosition(xmlData, i));
      }
    }

    if (!tagFound) {
      throwError('InvalidXml', 'Start tag expected.', { line: 1, col: 1 });
    } else if (tags.length === 1) {
      throwError('InvalidTag', "Unclosed tag '" + tags[0].tagName + "'.", getLineNumberForPosition(xmlData, tags[0].tagStartPos));
    } else if (tags.length > 0) {
      throwError('InvalidXml', "Invalid '" +
        JSON.stringify(tags.map(t => t.tagName)).replace(/\r?\n/g, '') +
        "' found.", { line: 1, col: 1 });
    }

    return true;
  }

  _readPI(xmlData, i, nameValidator, throwError) {
    const piStart = i;
    const nameStart = i;
    let nameValidated = false;

    for (; i < xmlData.length; i++) {
      const ch = xmlData[i];

      if (!nameValidated && (ch === ' ' || ch === '?')) {
        const piName = xmlData.substr(nameStart, i - nameStart);
        nameValidated = true;

        if (piName.toLowerCase() === 'xml') {
          throwError(
            'InvalidXml',
            'XML declaration allowed only at the start of the document.',
            getLineNumberForPosition(xmlData, piStart - 2)
          );
        } else if (!nameValidator.isValidName(piName)) {
          throwError(
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

    throwError(
      'InvalidXml',
      'Processing instruction is not closed with "?>".',
      getLineNumberForPosition(xmlData, piStart - 2)
    );
  }

  _readAttributeStr(xmlData, i) {
    let attrStr = '';
    let startChar = '';
    let tagClosed = false;
    for (; i < xmlData.length; i++) {
      if (xmlData[i] === '"' || xmlData[i] === "'") {
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

  _validateNumberAmpersand(xmlData, i) {
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

  _validateAmpersand(xmlData, i) {
    i++;
    if (xmlData[i] === ';') return -1;
    if (xmlData[i] === '#') {
      i++;
      return this._validateNumberAmpersand(xmlData, i);
    }
    let count = 0;
    for (; i < xmlData.length; i++, count++) {
      if (xmlData[i].match(/\w/) && count < 20) continue;
      if (xmlData[i] === ';') break;
      return -1;
    }
    return i;
  }
}

function mergeOptions(defaults, options) {
  const merged = Object.assign({}, defaults, options);
  merged.docType = Object.assign({}, defaults.docType, options?.docType);
  merged.invalidCharSequence = Object.assign({}, defaults.invalidCharSequence, options?.invalidCharSequence);
  merged.xmlDeclaraion = Object.assign(
    {},
    defaults.xmlDeclaraion,
    options?.xmlDeclaraion,
    options?.xmlDeclaration // accept the correctly-spelled alias too
  );
  merged.skipTags = options?.skipTags || defaults.skipTags;
  return merged;
}

export { SyntaxValidator };
