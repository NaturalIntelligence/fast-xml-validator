"use strict";

import { SyntaxValidator } from "../src/fxv.js";

describe("xmlDeclaraion option", function () {

    it("should pass without a declaration by default (optional: true)", function () {
        expect(SyntaxValidator.validate(`<a/>`)).toBe(true);
    });

    it("should error when optional: false and the declaration is missing", function () {
        expect(() => SyntaxValidator.validate(`<a/>`, { xmlDeclaraion: { optional: false } }))
            .toThrowError("XML declaration is required but missing.");
    });

    it("should pass when optional: false and the declaration is present", function () {
        const xmlData = `<?xml version="1.0"?><a/>`;
        expect(SyntaxValidator.validate(xmlData, { xmlDeclaraion: { optional: false } })).toBe(true);
    });

    it("should reject out-of-order attributes by default (argPosition: true)", function () {
        const xmlData = `<?xml encoding="utf-8" version="1.0"?><a/>`;
        expect(() => SyntaxValidator.validate(xmlData))
            .toThrowError('XML declaration attribute "version" is out of order. Required order: version, encoding, standalone.');
    });

    it("should accept out-of-order attributes when argPosition: false", function () {
        const xmlData = `<?xml encoding="utf-8" version="1.0"?><a/>`;
        expect(SyntaxValidator.validate(xmlData, { xmlDeclaraion: { argPosition: false } })).toBe(true);
    });

    it("should still validate individual attribute values when argPosition: false", function () {
        const xmlData = `<?xml encoding="utf-8" version="9.9"?><a/>`;
        expect(() => SyntaxValidator.validate(xmlData, { xmlDeclaraion: { argPosition: false } }))
            .toThrowError('XML declaration version "9.9" is not supported. Must be "1.0" or "1.1".');
    });

    it("should accept the correctly-spelled xmlDeclaration alias", function () {
        expect(() => SyntaxValidator.validate(`<a/>`, { xmlDeclaration: { optional: false } }))
            .toThrowError("XML declaration is required but missing.");
    });
});
