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
