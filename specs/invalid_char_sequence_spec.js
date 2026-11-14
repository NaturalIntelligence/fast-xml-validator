"use strict";

import { SyntaxValidator } from "../src/fxv.js";

describe("invalidCharSequence option (opt-in, default off)", function () {

    describe("comment: '--' inside a comment body", function () {
        it("should pass by default (comment check is off)", function () {
            const xmlData = `<a><!-- x--y --></a>`;
            expect(SyntaxValidator.validate(xmlData)).toBe(true);
        });

        it("should error when invalidCharSequence.comment is true", function () {
            const xmlData = `<a><!-- x--y --></a>`;
            expect(() => SyntaxValidator.validate(xmlData, { invalidCharSequence: { comment: true } }))
                .toThrowError("Comment must not contain '--'.");
        });

        it("should still pass a clean comment when invalidCharSequence.comment is true", function () {
            const xmlData = `<a><!-- a normal comment --></a>`;
            expect(SyntaxValidator.validate(xmlData, { invalidCharSequence: { comment: true } })).toBe(true);
        });
    });

    describe("tagValue: ']]>' inside element text content", function () {
        it("should pass by default (tagValue check is off)", function () {
            const xmlData = `<a>x]]>y</a>`;
            expect(SyntaxValidator.validate(xmlData)).toBe(true);
        });

        it("should error when invalidCharSequence.tagValue is true", function () {
            const xmlData = `<a>x]]>y</a>`;
            expect(() => SyntaxValidator.validate(xmlData, { invalidCharSequence: { tagValue: true } }))
                .toThrowError("Element text content must not contain ']]>'.");
        });

        it("should not flag ']]>' that legitimately closes a CDATA section", function () {
            const xmlData = `<a><![CDATA[x]]>y</a>`;
            expect(SyntaxValidator.validate(xmlData, { invalidCharSequence: { tagValue: true } })).toBe(true);
        });
    });
});

describe("invalidCharSequence.comment: comment ending with '-'", function () {
    it("should pass `--->` by default (check is off)", function () {
        expect(SyntaxValidator.validate(`<a><!-- x ---></a>`)).toBe(true);
    });

    it("should error on `--->` when invalidCharSequence.comment is true", function () {
        expect(() => SyntaxValidator.validate(`<a><!-- x ---></a>`, { invalidCharSequence: { comment: true } }))
            .toThrowError("Comment must not end with '-'.");
    });

    it("should error on `<!--->` style bodies ending in '-'", function () {
        expect(() => SyntaxValidator.validate(`<a><!---></a>`, { invalidCharSequence: { comment: true } }))
            .toThrow();
    });

    it("should still pass a single interior hyphen", function () {
        expect(SyntaxValidator.validate(`<a><!-- a-b --></a>`, { invalidCharSequence: { comment: true } })).toBe(true);
    });
});

describe("invalidCharSequence.tagValue: extra cases", function () {
    it("should catch ']]]>'", function () {
        expect(() => SyntaxValidator.validate(`<a>x]]]>y</a>`, { invalidCharSequence: { tagValue: true } }))
            .toThrowError("Element text content must not contain ']]>'.");
    });

    it("should not flag ']]>' inside an attribute value", function () {
        expect(SyntaxValidator.validate(`<a x="]]>"/>`, { invalidCharSequence: { tagValue: true } })).toBe(true);
    });

    it("should not carry state across a comment", function () {
        expect(SyntaxValidator.validate(`<a>]<!-- c -->]></a>`, { invalidCharSequence: { tagValue: true } })).toBe(true);
    });
});