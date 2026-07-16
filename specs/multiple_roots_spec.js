"use strict";

import { SyntaxValidator } from "../src/fxv.js";

describe("multipleRoots option", function () {

    it("should error on more than one root element by default", function () {
        const xmlData = `<a/><b/>`;
        expect(() => SyntaxValidator.validate(xmlData, { multipleRoots: false }))
            .toThrowError("Multiple possible root nodes found.");
    });

    it("should pass with multiple root elements when multipleRoots: true", function () {
        const xmlData = `<a/><b/>`;
        expect(SyntaxValidator.validate(xmlData)).toBe(true);
    });

    it("should pass with more than two root elements when multipleRoots: true", function () {
        const xmlData = `<a/><b>text</b><c><d/></c>`;
        expect(SyntaxValidator.validate(xmlData)).toBe(true);
    });

    it("should still reject stray top-level text even when multipleRoots: true", function () {
        const xmlData = `<a/>stray<b/>`;
        expect(() => SyntaxValidator.validate(xmlData))
            .toThrowError("Extra text at the end");
    });

    it("should still require at least one root element when multipleRoots: true", function () {
        expect(() => SyntaxValidator.validate(``))
            .toThrowError("Start tag expected.");
    });
});
