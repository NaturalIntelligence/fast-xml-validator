"use strict";

/**
 * Tests for self-closing root tag behaviour.
 */

import { SyntaxValidator } from "../src/fxv.js";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function expectValid(xml, options = {}) {
  expect(() => SyntaxValidator.validate(xml, options))
    .not.toThrow();
  expect(SyntaxValidator.validate(xml, options)).toBe(true);
}

function expectError(xml, expectedMsg, options = {}) {
  let threw = false;
  try {
    SyntaxValidator.validate(xml, options);
  } catch (e) {
    threw = true;
    expect(e.message).toContain(expectedMsg);
  }
  if (!threw) {
    fail(`Expected an error containing "${expectedMsg}" but validate() returned true for: ${xml}`);
  }
}

function expectErrorAt(xml, expectedMsg, expectedLine, expectedCol, options = {}) {
  let threw = false;
  try {
    SyntaxValidator.validate(xml, options);
  } catch (e) {
    threw = true;
    expect(e.message).toContain(expectedMsg);
    expect(e.line).toBe(expectedLine);
    expect(e.col).toBe(expectedCol);
  }
  if (!threw) {
    fail(`Expected an error but validate() returned true for: ${xml}`);
  }
}

// ---------------------------------------------------------------------------
// 1. Self-closing tags that are valid on their own
// ---------------------------------------------------------------------------
describe("self-closing root tag — valid cases", () => {

  it("accepts a bare self-closing root", () => {
    expectValid("<root/>");
  });

  it("accepts a self-closing root with attributes", () => {
    expectValid('<root id="1" name="x"/>');
  });

  it("accepts trailing whitespace after a self-closing root", () => {
    expectValid("<root/>   ");
    expectValid("<root/>\n");
    expectValid("<root/>\r\n\t  ");
  });

  it("accepts a prolog before a self-closing root", () => {
    expectValid('<?xml version="1.0"?><root/>');
  });

  it("accepts a prolog and comment before a self-closing root", () => {
    expectValid('<?xml version="1.0"?><!-- intro --><root/>');
  });

  it("accepts a self-closing root with a namespace", () => {
    expectValid("<ns:root/>");
  });
});

// ---------------------------------------------------------------------------
// 2. Trailing non-whitespace text after a self-closing root (the core bug)
// ---------------------------------------------------------------------------
describe("self-closing root tag — trailing text (bug fix)", () => {

  it("rejects text immediately after a self-closing root  [was: silent pass]", () => {
    expectError("<a/>a", "Extra text at the end");
  });

  it("rejects text after a self-closing root with attributes", () => {
    expectError('<a id="1"/>trailing', "Extra text at the end");
  });

  it("rejects text after a namespaced self-closing root", () => {
    expectError("<ns:root/>trailing", "Extra text at the end");
  });

  it("reports the correct line and column of the unexpected character", () => {
    // <a/> is 4 chars; 'X' is at index 4 -> col 5
    expectErrorAt("<a/>X", "Extra text at the end", 1, 5);
  });

  it("reports the correct position when trailing text is on a new line", () => {
    // <a/>\nX  ->  'X' is at line 2, col 1
    expectErrorAt("<a/>\nX", "Extra text at the end", 2, 1);
  });

  it("has parity with the equivalent open+close form", () => {
    // Both must fail with the same error family
    expectError("<a/>trailing", "Extra text at the end");
    expectError("<a></a>trailing", "Extra text at the end");
  });
});

// ---------------------------------------------------------------------------
// 3. Multiple self-closing roots (second bug: reachedRoot not checked)
// ---------------------------------------------------------------------------
describe("self-closing root tag — multiple root detection (bug fix)", () => {

  it("rejects two identical self-closing roots  [was: silent pass]", () => {
    expectError("<a/><a/>", "Multiple possible root nodes found.");
  });

  it("rejects two different self-closing roots", () => {
    expectError("<a/><b/>", "Multiple possible root nodes found.");
  });

  it("rejects three self-closing roots", () => {
    expectError("<a/><b/><c/>", "Multiple possible root nodes found.");
  });

  it("rejects a self-closing root followed by an open+close root", () => {
    expectError("<a/><b></b>", "Multiple possible root nodes found.");
  });

  it("rejects an open+close root followed by a self-closing root", () => {
    expectError("<a></a><b/>", "Multiple possible root nodes found.");
  });

  it("reports the position of the offending second root", () => {
    // <a/> ends at index 3; <b/> starts at index 4 -> col 5
    expectErrorAt("<a/><b/>", "Multiple possible root nodes found.", 1, 5);
  });

  it("has parity with the equivalent open+close form", () => {
    expectError("<a/><b/>", "Multiple possible root nodes found.");
    expectError("<a></a><b></b>", "Multiple possible root nodes found.");
  });
});

// ---------------------------------------------------------------------------
// 4. Self-closing tags as children — must remain valid
// ---------------------------------------------------------------------------
describe("self-closing child tags — must not be broken by the fix", () => {

  it("accepts a single self-closing child inside a root", () => {
    expectValid("<root><child/></root>");
  });

  it("accepts multiple self-closing children inside a root", () => {
    expectValid("<root><a/><b/><c/></root>");
  });

  it("accepts mixed self-closing and open+close children", () => {
    expectValid("<root><a/><b>text</b><c/></root>");
  });

  it("accepts deeply nested self-closing tags", () => {
    expectValid("<root><parent><child/></parent></root>");
  });

  it("accepts self-closing children followed by text content", () => {
    expectValid("<root><a/>text</root>");
  });

  it("accepts self-closing children with attributes", () => {
    expectValid('<root><item id="1"/><item id="2"/></root>');
  });

  it("accepts a self-closing root inside unpairedTags option", () => {
    // unpairedTags are allowed to appear without matching close tags
    expectValid("<root><br/></root>", { unpairedTags: ["br"] });
  });
});

// ---------------------------------------------------------------------------
// 5. Edge cases around whitespace-only content after self-closing root
// ---------------------------------------------------------------------------
describe("self-closing root tag — whitespace handling", () => {

  it("allows a single space after the self-closing root", () => {
    expectValid("<root/> ");
  });

  it("allows mixed whitespace characters after the self-closing root", () => {
    expectValid("<root/> \t\n\r");
  });

  it("rejects a non-whitespace character that follows whitespace after the root", () => {
    expectError("<root/>   X", "Extra text at the end");
  });
});