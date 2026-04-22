
> Created by the author of [Fast XML Parser](https://github.com/NaturalIntelligence/fast-xml-parser).

This library exposes 2 type of XML parsers
1. Syntax validator
2. Business rule validator

## Syntax validator

Validate XML file for syntax errors. It 

```js
const { SyntaxValidator } = require("fast-xml-validator");
const result = SyntaxValidator.validate(xmlData, { allowBooleanAttributes: true });
```

Options:

- allowBooleanAttributes: allow attributes without value (e.g `<book published />`)
- unpairedTags: list of tags without closing tags (e.g `<br>`, `<hr>`)
- docType: options for validating DOCTYPE entity count and size
  - maxEntityCount: maximum number of entities in DOCTYPE (default: Infinity)
  - maxEntitySize: maximum size of each entity in DOCTYPE (default: Infinity)

## Business rule validator

This is somewhat like XML schema validator but with some or rather more additional features.Checkout the [Business Rule Validato](./BusinessRuleValidator.md) for more information.

```js
const { BusinessRulesValidator } = require("fast-xml-validator");
const options = {};
const validator = new BusinessRulesValidator(rulesXml, options);

const result = validator.validate(xmlData);
```

### Applications
- You want to ensure the data type or, minimum or maximum value for a field.
- You want to ensure the minimum or maximum occurences of a tag.
- You want to ensure the sequence of sibling tags. 
- You want to ensure that the discounted price is always lesser than total price
- You want to be informed if there are students who scored less than 35 in any subject.
- You want to ensure that the shipment date must come after an order date.
- You want to ensure that a PO must have at least one order item
- You want to ensure that email is unique for all employees
- You have your own business validations.

