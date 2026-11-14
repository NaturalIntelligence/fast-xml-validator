"use strict";

import { SyntaxValidator } from "../src/fxv.js";
import { findInvalidReference } from "../src/util.js";

describe("findInvalidReference helper", function () {
    it("returns -1 when there is no '&'", function () {
        expect(findInvalidReference("plain text")).toBe(-1);
    });

    it("accepts predefined, named, decimal and hex references", function () {
        expect(findInvalidReference("a &amp; b &lt;&gt;&quot;&apos; &#65; &#x41; &#xaF;")).toBe(-1);
    });

    it("returns the index of the first bad '&'", function () {
        expect(findInvalidReference("ab & cd")).toBe(3);
        expect(findInvalidReference("&amp;&bad")).toBe(5);
    });

    it("rejects an unterminated reference at end of string", function () {
        expect(findInvalidReference("a&b")).toBe(1);
        expect(findInvalidReference("&#12")).toBe(0);
    });

    it("rejects empty numeric references", function () {
        expect(findInvalidReference("&#;")).toBe(0);
        expect(findInvalidReference("&#x;")).toBe(0);
    });

    it("rejects non-hex digits and hex digits in a decimal reference", function () {
        expect(findInvalidReference("&#x1ah;")).toBe(0);
        expect(findInvalidReference("&#1a;")).toBe(0);
    });

    it("rejects '&;' and '&' followed by a non-name char", function () {
        expect(findInvalidReference("&;")).toBe(0);
        expect(findInvalidReference("&<")).toBe(0);
    });

    it("limits entity names to 20 characters", function () {
        expect(findInvalidReference("&abcdefghij1234567890;")).toBe(-1);
        expect(findInvalidReference("&abcdefghij1234567890a;")).toBe(0);
    });
});

describe("stray '&' in attribute values (always on)", function () {
    it("should error on a bare '&' surrounded by spaces", function () {
        expect(() => SyntaxValidator.validate(`<a x="Tom & Jerry"/>`))
            .toThrowError("Attribute 'x' value contains an invalid or unterminated '&' reference.");
    });

    it("should error on an unterminated named reference", function () {
        expect(() => SyntaxValidator.validate(`<a x="&bogus"></a>`))
            .toThrowError(/invalid or unterminated '&' reference/);
    });

    it("should error on an unterminated numeric reference", function () {
        expect(() => SyntaxValidator.validate(`<a x="&#12"/>`))
            .toThrowError(/invalid or unterminated '&' reference/);
    });

    it("should error on '&' at the very end of the value", function () {
        expect(() => SyntaxValidator.validate(`<a x="a&"/>`))
            .toThrowError(/invalid or unterminated '&' reference/);
    });

    it("should error on empty numeric references", function () {
        expect(() => SyntaxValidator.validate(`<a x="&#;"/>`)).toThrowError(/invalid or unterminated/);
        expect(() => SyntaxValidator.validate(`<a x="&#x;"/>`)).toThrowError(/invalid or unterminated/);
    });

    it("should report error code InvalidAttr", function () {
        try {
            SyntaxValidator.validate(`<a x="&"/>`);
            fail("expected throw");
        } catch (e) {
            expect(e.code).toBe("InvalidAttr");
        }
    });

    it("should check the second attribute too", function () {
        expect(() => SyntaxValidator.validate(`<a ok="1" bad="a & b"/>`))
            .toThrowError("Attribute 'bad' value contains an invalid or unterminated '&' reference.");
    });

    it("should pass well-formed references", function () {
        expect(SyntaxValidator.validate(`<a x="Tom &amp; Jerry &#65; &#x41; &lt;"/>`)).toBe(true);
    });

    it("should pass in single-quoted values and with a '>' in the value", function () {
        expect(SyntaxValidator.validate(`<a x='a &amp; b > c'></a>`)).toBe(true);
    });

    it("should pass an empty value", function () {
        expect(SyntaxValidator.validate(`<a x=""/>`)).toBe(true);
    });

    it("should not be applied to skipped subtrees", function () {
        expect(SyntaxValidator.validate(`<r><script x="a & b">1</script></r>`, { skipTags: ["..script"] })).toBe(true);
    });
});

describe("empty numeric references in element text", function () {
    it("should error on '&#;'", function () {
        expect(() => SyntaxValidator.validate(`<a>&#;</a>`)).toThrowError("char '&' is not expected.");
    });

    it("should error on '&#x;'", function () {
        expect(() => SyntaxValidator.validate(`<a>&#x;</a>`)).toThrowError("char '&' is not expected.");
    });

    it("should still pass valid numeric references", function () {
        expect(SyntaxValidator.validate(`<a>&#65;&#x41;</a>`)).toBe(true);
    });
});