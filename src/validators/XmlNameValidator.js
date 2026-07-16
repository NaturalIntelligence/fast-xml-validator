'use strict';

import { createValidator } from 'xml-naming';

/**
 * XmlNameValidator — single responsibility: expose XML Name / QName
 * validators for a given xmlVersion, memoized per instance since element
 * and attribute names repeat heavily across a document.
 */
export default class XmlNameValidator {
  constructor(xmlVersion = '1.0') {
    this.xmlVersion = xmlVersion;
    this.qName = createValidator('qName', { xmlVersion });
    this.name = createValidator('name', { xmlVersion });
  }

  isValidQName(value) {
    return this.qName(value);
  }

  isValidName(value) {
    return this.name(value);
  }
}
