export type docTypeOptions = {
  /**
   * maximum number of entity present in DOCTYPE
   *
   * Defaults to `Infinity`
   */
  maxEntityCount?: number;

  /**
   * maximum size of each entity present in DOCTYPE
   *
   * Defaults to `Infinity`
   */
  maxEntitySize?: number;
};

export type invalidCharSequenceOptions = {
  /**
   * Error if a comment body contains the literal sequence `--`
   * (besides the `--` immediately before the closing `-->`).
   *
   * Defaults to `false`.
   */
  comment?: boolean;

  /**
   * Error if element text content contains the literal sequence `]]>`.
   *
   * Defaults to `false`.
   */
  tagValue?: boolean;

  /**
   * Error if an attribute value contains a literal `<`.
   *
   * Defaults to `false`.
   */
  attrLt?: boolean;
};

export type xmlDeclarationOptions = {
  /**
   * When `false`, the document MUST start with an `<?xml ... ?>` declaration.
   *
   * Defaults to `true`.
   */
  optional?: boolean;

  /**
   * When `true`, `version`/`encoding`/`standalone` must appear in that fixed
   * order inside the XML declaration. When `false`, any order is accepted.
   *
   * Defaults to `true`.
   */
  argPosition?: boolean;
};

export type validationOptions = {
  /**
   * Whether to allow attributes without value
   *
   * Defaults to `false`
   */
  allowBooleanAttributes?: boolean;

  /**
   * List of tags without closing tags
   *
   * Defaults to `[]`
   */
  unpairedTags?: string[];

  docType?: docTypeOptions;

  /** Opt-in checks for otherwise-legal-looking but suspicious sequences. */
  invalidCharSequence?: invalidCharSequenceOptions;

  /** Controls handling of the `<?xml ... ?>` prolog. */
  xmlDeclaraion?: xmlDeclarationOptions;

  /** Correctly-spelled alias of `xmlDeclaraion`. */
  xmlDeclaration?: xmlDeclarationOptions;

  /**
   * Allow more than one root-level element (as if wrapped in a virtual root).
   *
   * Defaults to `true`.
   */
  multipleRoots?: boolean;

  /**
   * Path expressions (see the `path-expression-matcher` package) for tags
   * whose subtree should be excluded from validation entirely.
   *
   * Defaults to `[]`
   */
  skipTags?: string[];
};

/**
 * Known error codes. The union stays open (`string & {}`) so new codes
 * added in the future don't break consumers' exhaustive checks.
 */
export type ValidationErrorCode =
  | 'InvalidXml'
  | 'InvalidTag'
  | 'InvalidAttr'
  | 'InvalidChar'
  | 'InvalidDocType'
  | 'IllegalCharacter'
  | 'UnquotedAttributeValue'
  | (string & {});

/**
 * Thrown by `SyntaxValidator#validate` on the first well-formedness problem.
 */
export class ValidationError extends Error {
  constructor(message: string, code: ValidationErrorCode, line: number, col: number);
  code: ValidationErrorCode;
  line: number;
  col: number;
}

export class SyntaxValidator {
  constructor(options?: validationOptions);

  /**
   * @returns `true` when the document is well-formed.
   * @throws {ValidationError} on the first problem found.
   */
  validate(xmlData: string): true;

  /**
   * @returns `true` when the document is well-formed.
   * @throws {ValidationError} on the first problem found.
   */
  static validate(xmlData: string, options?: validationOptions): true;
}

export interface BusinessRulesValidatorOptions {
  unknownAllow?: boolean;
  boolean?: string[];
}

export type ValidationFailure = {
  code: string;
  path: string;
  value?: string;
  actual?: number | string;
  expected?: number | string;
};

export type CustomValidatorFn = (
  value: string,
  path: string
) => ValidationFailure | Record<string, unknown> | undefined | null | void;

export class BusinessRulesValidator {
  /**
   * Create a new Validator with a rules XML string.
   *
   * @param rules   - XML string whose attributes define validation constraints.
   * @param options - Optional configuration.
   *
   * @throws {Error} If `rules` is empty, not a string, or contains XML syntax errors.
   *
   * @example
   * ```ts
   * const validator = new BusinessRulesValidator(`
   *   <students>
   *     <student repeatable minOccurs="1">
   *       <email unique="true" nillable="false"></email>
   *       <age type="integer" range="18..65"></age>
   *     </student>
   *   </students>
   * `);
   * ```
   */
  constructor(rules: string, options?: BusinessRulesValidatorOptions);

  /**
   * Register a custom validation function under a name.
   * Reference it in rules XML with `checkBy="<name>"`.
   *
   * @example
   * ```ts
   * validator.register("isEmail", (value, path) => {
   *   if (!value.includes("@")) {
   *     return { code: "invalid-email", path, value };
   *   }
   * });
   * ```
   */
  register(name: string, fn: CustomValidatorFn): void;

  /**
   * Validate an XML string against the rules.
   *
   * @param xmldata - XML string to validate.
   * @returns Array of failure objects. Empty array means the document is valid.
   *
   * @throws {Error} If `xmldata` is empty, not a string, or contains XML syntax errors.
   */
  validate(xmldata: string): ValidationFailure[];
}
