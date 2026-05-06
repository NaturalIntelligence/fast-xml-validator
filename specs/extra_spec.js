"use strict";

import { SyntaxValidator } from "../src/fxv.js";

// Helper: assert a ValidationError is thrown with the given message
function expectError(xmlData, expectedMsg, options = {}) {
  let threw = false;
  try {
    SyntaxValidator.validate(xmlData, options);
  } catch (e) {
    threw = true;
    expect(e.message).toBe(expectedMsg);
  }
  expect(threw).toBeTrue();
}

// Helper: assert a ValidationError is thrown with given message, line, and col
function expectErrorAt(xmlData, expectedMsg, expectedLine, expectedCol, options = {}) {
  let threw = false;
  try {
    SyntaxValidator.validate(xmlData, options);
  } catch (e) {
    threw = true;
    expect(e.message).toBe(expectedMsg);
    expect(e.line).toBe(expectedLine);
    expect(e.col).toBe(expectedCol);
  }
  expect(threw).toBeTrue();
}


describe("multiple unclosed tags", () => {

  it("should report an error when two tags are left unclosed", () => {
    // <a> and <b> are both opened but never closed
    expectError(
      `<a><b>`,
      `Invalid '["a","b"]' found.`
    );
  });

  it("should report an error when three tags are left unclosed", () => {
    expectError(
      `<root><parent><child>`,
      `Invalid '["root","parent","child"]' found.`
    );
  });

  it("should include the correct tag names in the error message", () => {
    expectError(
      `<one><two><three>text`,
      `Invalid '["one","two","three"]' found.`
    );
  });

  it("should report error at line 1 col 1", () => {
    expectErrorAt(
      `<a><b>`,
      `Invalid '["a","b"]' found.`,
      1, 1
    );
  });
});

describe("unclosed processing instruction (mid-document)", () => {

  it("should error when a PI inside the document has no closing '?>'", () => {
    // '<?pi' reaches EOF — the name ends with EOF, no '?>' ever found
    expectError(
      `<root><?pi`,
      `Processing instruction is not closed with "?>".`
    );
  });

  it("should error when a PI after the root has no closing '?>'", () => {
    expectError(
      `<?xml version="1.0"?><root/><?unclosed`,
      `Processing instruction is not closed with "?>".`
    );
  });

  it("should error when a PI has a name but content reaches EOF", () => {
    // Space after name is found, but loop reaches EOF before '?>'
    expectError(
      `<root><?mypi some content without close`,
      `Processing instruction is not closed with "?>".`
    );
  });

  it("should report the correct position of the unclosed PI", () => {
    // PI starts at col 7 (0-based index 6), so col should be 7
    expectErrorAt(
      `<root><?unclosed`,
      `Processing instruction is not closed with "?>".`,
      1, 7
    );
  });

  it("should report correct line for a PI on line 2", () => {
    expectErrorAt(
      `<root>\n<?unclosed`,
      `Processing instruction is not closed with "?>".`,
      2, 1
    );
  });
});


describe("extra text after root via outer loop", () => {

  it("should error when text follows a top-level PI after the root element", () => {
    expectError(
      `<root></root><?pi?>abc`,
      `Extra text at the end`
    );
  });

  it("should report the correct position of the unexpected character", () => {
    expectErrorAt(
      `<root></root><?pi?>X`,
      `Extra text at the end`,
      1, 20
    );
  });

  it("should report correct line and col for multi-line case", () => {
    expectErrorAt(
      `<root></root>\n<?pi?>\nZ`,
      `Extra text at the end`,
      3, 1
    );
  });

  it("should not error for whitespace after a top-level PI", () => {
    // Whitespace is allowed at the top level; only non-whitespace triggers the error
    expect(SyntaxValidator.validate(`<root></root><?pi?>   `)).toBe(true);
  });
});
