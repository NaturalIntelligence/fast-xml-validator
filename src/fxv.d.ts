
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
}

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
};

export type ValidationError = {
  err: {
    code: string;
    msg: string,
    line: number,
    col: number
  };
};

export class SyntaxValidator {
  static validate(xmlData: string, options?: validationOptions): true | ValidationError;
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
}

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
   * const validator = new Validator(`
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
