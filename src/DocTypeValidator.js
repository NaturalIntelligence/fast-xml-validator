import { name as isXmlName } from 'xml-naming';

const defaultOptions = {
    maxEntityCount: Infinity,
    maxEntitySize: Infinity,
};

export default class DocTypeValidator {
    constructor(options) {
        this.options = Object.assign({}, defaultOptions, options);
        this.suppressValidationErr = !options;
    }

    validateDocType(xmlData, i) {
        if (
            xmlData[i + 3] !== 'O' ||
            xmlData[i + 4] !== 'C' ||
            xmlData[i + 5] !== 'T' ||
            xmlData[i + 6] !== 'Y' ||
            xmlData[i + 7] !== 'P' ||
            xmlData[i + 8] !== 'E'
        ) {
            throw new Error(`Invalid Tag instead of DOCTYPE`);
        }

        i += 9;
        let angleBracketsCount = 1;
        let hasBody = false;
        let comment = false;
        let entityCount = 0;

        for (; i < xmlData.length; i++) {
            if (xmlData[i] === '<' && !comment) {
                if (hasBody && hasSeq(xmlData, '!ENTITY', i)) {
                    i += 7;
                    [entityCount, i] = this._validateEntityExp(xmlData, i + 1, entityCount);
                    // continue;
                } else if (hasBody && hasSeq(xmlData, '!ELEMENT', i)) {
                    i += 8;
                    i = this._validateElementExp(xmlData, i + 1);
                    // continue;
                } else if (hasBody && hasSeq(xmlData, '!ATTLIST', i)) {
                    i += 8;
                    i = this._validateAttlistExp(xmlData, i + 1);
                    continue;
                } else if (hasBody && hasSeq(xmlData, '!NOTATION', i)) {
                    i += 9;
                    i = this._validateNotationExp(xmlData, i + 1);
                    // continue;
                } else if (hasSeq(xmlData, '!--', i)) {
                    comment = true;
                } else {
                    throw new Error(`Invalid DOCTYPE`);
                }
                angleBracketsCount++;
            } else if (xmlData[i] === '>') {
                if (comment) {
                    if (xmlData[i - 1] === '-' && xmlData[i - 2] === '-') {
                        comment = false;
                        angleBracketsCount--;
                    }
                } else {
                    angleBracketsCount--;
                }
                if (angleBracketsCount === 0) break;
            } else if (xmlData[i] === '[') {
                hasBody = true;
            }
        }

        if (angleBracketsCount !== 0) {
            throw new Error(`Unclosed DOCTYPE`);
        }

        return i;
    }

    _validateEntityExp(xmlData, i, entityCount) {
        i = skipWhitespace(xmlData, i);

        // Read and validate entity name
        const nameStart = i;
        while (i < xmlData.length && !/\s/.test(xmlData[i]) && xmlData[i] !== '"' && xmlData[i] !== "'") {
            i++;
        }
        const entityName = xmlData.substring(nameStart, i);
        validateName(entityName);

        i = skipWhitespace(xmlData, i);

        // Check for unsupported constructs
        if (!this.suppressValidationErr) {
            if (xmlData.substring(i, i + 6).toUpperCase() === 'SYSTEM') {
                throw new Error('External entities are not supported');
            } else if (xmlData[i] === '%') {
                throw new Error('Parameter entities are not supported');
            }
        }

        // Read and validate the entity value (validates quoting + size limit)
        let entityValue;
        [i, entityValue] = readQuotedValue(xmlData, i, 'entity');

        const { maxEntitySize, maxEntityCount } = this.options;

        if (entityValue.length > maxEntitySize) {
            throw new Error(
                `Entity "${entityName}" size (${entityValue.length}) exceeds maximum allowed size (${maxEntitySize})`
            );
        }

        // Only count non-parameter entities (parameter entities contain '&')
        if (entityValue.indexOf('&') === -1) {
            entityCount++;
            if (entityCount > maxEntityCount) {
                throw new Error(
                    `Entity count (${entityCount}) exceeds maximum allowed (${maxEntityCount})`
                );
            }
        }

        return [entityCount, i - 1];
    }

    _validateNotationExp(xmlData, i) {
        i = skipWhitespace(xmlData, i);

        // Read and validate notation name
        const nameStart = i;
        while (i < xmlData.length && !/\s/.test(xmlData[i])) i++;
        const notationName = xmlData.substring(nameStart, i);
        !this.suppressValidationErr && validateName(notationName);

        i = skipWhitespace(xmlData, i);

        const identifierType = xmlData.substring(i, i + 6).toUpperCase();
        if (!this.suppressValidationErr && identifierType !== 'SYSTEM' && identifierType !== 'PUBLIC') {
            throw new Error(`Expected SYSTEM or PUBLIC, found "${identifierType}"`);
        }
        i += identifierType.length;
        i = skipWhitespace(xmlData, i);

        if (identifierType === 'PUBLIC') {
            [i] = readQuotedValue(xmlData, i, 'publicIdentifier');
            i = skipWhitespace(xmlData, i);
            if (xmlData[i] === '"' || xmlData[i] === "'") {
                [i] = readQuotedValue(xmlData, i, 'systemIdentifier');
            }
        } else if (identifierType === 'SYSTEM') {
            [i] = readQuotedValue(xmlData, i, 'systemIdentifier');
        }

        return --i;
    }

    _validateElementExp(xmlData, i) {
        i = skipWhitespace(xmlData, i);

        // Read and validate element name
        const nameStart = i;
        while (i < xmlData.length && !/\s/.test(xmlData[i])) i++;
        const elementName = xmlData.substring(nameStart, i);
        if (!this.suppressValidationErr && !isXmlName(elementName)) {
            throw new Error(`Invalid element name: "${elementName}"`);
        }

        i = skipWhitespace(xmlData, i);

        // Validate content model keyword or group
        if (xmlData[i] === 'E' && hasSeq(xmlData, 'MPTY', i)) {
            i += 4;
        } else if (xmlData[i] === 'A' && hasSeq(xmlData, 'NY', i)) {
            i += 2;
        } else if (xmlData[i] === '(') {
            i++;
            while (i < xmlData.length && xmlData[i] !== ')') i++;
            if (xmlData[i] !== ')') throw new Error('Unterminated content model');
        } else if (!this.suppressValidationErr) {
            throw new Error(`Invalid Element Expression, found "${xmlData[i]}"`);
        }

        return i;
    }

    _validateAttlistExp(xmlData, i) {
        i = skipWhitespace(xmlData, i);

        // Read element name
        const elemNameStart = i;
        while (i < xmlData.length && !/\s/.test(xmlData[i])) i++;
        const elementName = xmlData.substring(elemNameStart, i);
        validateName(elementName);

        i = skipWhitespace(xmlData, i);

        // Read attribute name
        const attrNameStart = i;
        while (i < xmlData.length && !/\s/.test(xmlData[i])) i++;
        const attributeName = xmlData.substring(attrNameStart, i);
        validateName(attributeName);

        i = skipWhitespace(xmlData, i);

        // Read attribute type
        if (xmlData.substring(i, i + 8).toUpperCase() === 'NOTATION') {
            i += 8;
            i = skipWhitespace(xmlData, i);
            if (xmlData[i] !== '(') throw new Error(`Expected '(', found "${xmlData[i]}"`);
            i++;
            while (i < xmlData.length && xmlData[i] !== ')') {
                const notationStart = i;
                while (i < xmlData.length && xmlData[i] !== '|' && xmlData[i] !== ')') i++;
                const notation = xmlData.substring(notationStart, i).trim();
                validateName(notation);
                if (xmlData[i] === '|') {
                    i++;
                    i = skipWhitespace(xmlData, i);
                }
            }
            if (xmlData[i] !== ')') throw new Error('Unterminated list of notations');
            i++;
        } else {
            const typeStart = i;
            while (i < xmlData.length && !/\s/.test(xmlData[i])) i++;
            const attributeType = xmlData.substring(typeStart, i);
            const validTypes = ['CDATA', 'ID', 'IDREF', 'IDREFS', 'ENTITY', 'ENTITIES', 'NMTOKEN', 'NMTOKENS'];
            if (!this.suppressValidationErr && !validTypes.includes(attributeType.toUpperCase())) {
                throw new Error(`Invalid attribute type: "${attributeType}"`);
            }
        }

        i = skipWhitespace(xmlData, i);

        // Read default value declaration
        if (xmlData.substring(i, i + 9).toUpperCase() === '#REQUIRED') {
            i += 9;
        } else if (xmlData.substring(i, i + 8).toUpperCase() === '#IMPLIED') {
            i += 8;
        } else {
            [i] = readQuotedValue(xmlData, i, 'ATTLIST default value');
        }

        return i;
    }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function skipWhitespace(data, index) {
    while (index < data.length && /\s/.test(data[index])) index++;
    return index;
}

function hasSeq(data, seq, i) {
    for (let j = 0; j < seq.length; j++) {
        if (seq[j] !== data[i + j + 1]) return false;
    }
    return true;
}

function validateName(name) {
    if (!isXmlName(name)) throw new Error(`Invalid entity name "${name}"`);
}

/**
 * Read a single- or double-quoted string and return [nextIndex, value].
 */
function readQuotedValue(xmlData, i, type) {
    const startChar = xmlData[i];
    if (startChar !== '"' && startChar !== "'") {
        throw new Error(`Expected quoted string for ${type}, found "${startChar}"`);
    }
    i++;
    const start = i;
    while (i < xmlData.length && xmlData[i] !== startChar) i++;
    if (xmlData[i] !== startChar) throw new Error(`Unterminated ${type} value`);
    const value = xmlData.substring(start, i);
    return [++i, value];
}