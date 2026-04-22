'use strict';

import { validate as validateSyntax } from './validator.js';
import BusinessRulesValidator from 'detailed-xml-validator';

class SyntaxValidator {
  static validate(xmlData, options) {
    return validateSyntax(xmlData, options);
  }
}

export { SyntaxValidator, BusinessRulesValidator };