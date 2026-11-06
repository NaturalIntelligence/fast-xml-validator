import { SyntaxValidator } from "../src/fxv.js";
import ValidationError from "../src/ValidationError.js";

describe("content after the root element", function () {
    const invalidContent = [
        "&amp;",
        "&#65;",
        "&#x41;",
        "&#32;",
        "<![CDATA[x]]>",
        "<![CDATA[]]>",
        "<![CDATA[ ]]>",
    ];

    for (const multipleRoots of [false, true]) {
        for (const root of ["<a></a>", "<a/>"]) {
            for (const content of invalidContent) {
                it(`rejects ${content} after ${root} with multipleRoots=${multipleRoots}`, function () {
                    expect(() => SyntaxValidator.validate(root + content, { multipleRoots }))
                        .toThrowError(ValidationError, "Extra text at the end");
                });
            }
        }
    }

    for (const content of invalidContent) {
        it(`rejects ${content} between roots`, function () {
            expect(() => SyntaxValidator.validate(`<a/>${content}<b/>`))
                .toThrowError(ValidationError, "Extra text at the end");
        });
    }

    it("allows references and CDATA inside a later root", function () {
        expect(SyntaxValidator.validate("<a/><b>&amp;&#65;<![CDATA[x]]></b>"))
            .toBe(true);
    });

    it("allows references and CDATA after a child element", function () {
        expect(SyntaxValidator.validate("<root><child/>&amp;<![CDATA[x]]></root>"))
            .toBe(true);
    });

    it("allows references and CDATA after an unpaired child", function () {
        expect(SyntaxValidator.validate("<root><br>&amp;<![CDATA[x]]></root>", {
            unpairedTags: ["br"],
        })).toBe(true);
    });

    it("allows whitespace, comments and processing instructions after the root", function () {
        expect(SyntaxValidator.validate("<a/> \t\r\n<!-- &amp; <![CDATA[x]]> --><?pi &amp;?><!---->"))
            .toBe(true);
    });

    for (const content of ["&amp;", "<![CDATA[x]]>"]) {
        it(`reports the position of ${content} after an epilog comment and PI`, function () {
            try {
                SyntaxValidator.validate(`<a/>\n<!-- comment --><?pi?>\n  ${content}`);
                fail("Expected a ValidationError");
            } catch (error) {
                expect(error instanceof ValidationError).toBe(true);
                expect(error.code).toBe("InvalidXml");
                expect(error.line).toBe(3);
                expect(error.col).toBe(3);
            }
        });
    }

    it("rejects CDATA after a skipped root", function () {
        expect(() => SyntaxValidator.validate("<raw>opaque & content</raw><![CDATA[x]]>", {
            skipTags: ["raw"],
        })).toThrowError(ValidationError, "Extra text at the end");
    });

    it("preserves raw content inside a skipped root and valid epilog markup", function () {
        expect(SyntaxValidator.validate("<raw>opaque & content <![CDATA[x]]></raw><!-- ok --><?pi?>", {
            skipTags: ["raw"],
        })).toBe(true);
    });
});
