import { SyntaxValidator } from "fast-xml-validator";
import type { ValidationError, xmlDeclarationOptions } from "fast-xml-validator";

// Resolve the ESM public entry point, not an internal declaration path.
const valid: true = SyntaxValidator.validate("<root/>");
const declarationOptions: xmlDeclarationOptions = { optional: false, argPosition: true };
const error: ValidationError = Object.assign(new Error("Invalid XML"), {
  code: "InvalidXml",
  line: 1,
  col: 2,
});
const nativeError: Error = error;
const message: string = error.message;
const code: string = error.code;
const line: number = error.line;
const column: number = error.col;

// @ts-expect-error ValidationError has no legacy result-object wrapper.
error.err;
// @ts-expect-error ValidationError.code is a string, not a number.
const wrongCode: number = error.code;

void [valid, declarationOptions, nativeError, message, code, line, column, wrongCode];
