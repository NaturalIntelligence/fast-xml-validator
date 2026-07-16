"use strict";

import { SyntaxValidator } from "../src/fxv.js";

describe("illegal control characters (always on)", function () {

    it("should error on an illegal control character in element text content", function () {
        const xmlData = `<a>b\x01c</a>`;
        expect(() => SyntaxValidator.validate(xmlData))
            .toThrowError("Illegal control character 0x01 in document content.");
    });

    it("should error on an illegal control character inside a comment", function () {
        const xmlData = `<a><!-- b\x0bc --></a>`;
        expect(() => SyntaxValidator.validate(xmlData))
            .toThrowError("Illegal control character 0x0b in comment.");
    });

    it("should error on an illegal control character inside CDATA", function () {
        const xmlData = `<a><![CDATA[b\x0cc]]></a>`;
        expect(() => SyntaxValidator.validate(xmlData))
            .toThrowError("Illegal control character 0x0c in CDATA section.");
    });

    it("should pass for legal whitespace control characters (tab, LF, CR)", function () {
        const xmlData = "<a>b\tc\nd\re</a>";
        expect(SyntaxValidator.validate(xmlData)).toBe(true);
    });

    it("should pass for ordinary text with no control characters", function () {
        const xmlData = `<a>hello world</a>`;
        expect(SyntaxValidator.validate(xmlData)).toBe(true);
    });
});
