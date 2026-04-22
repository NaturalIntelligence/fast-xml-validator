import { SyntaxValidator } from "../src/fxv.js";

describe("DOCTYPE validation", function () {

    it("should pass for DOCTYPE without internal DTD (SYSTEM)", function () {
        const xmlData = `<?xml version='1.0' standalone='no'?>
            <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" >
            <svg><metadata>test</metadata></svg>`;

        expect(SyntaxValidator.validate(xmlData)).toBe(true);
    });

    it("should pass for DOCTYPE without internal DTD containing brackets in content", function () {
        const xmlData = `<?xml version='1.0' standalone='no'?>
            <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" >
            <svg><metadata>[test]</metadata></svg>`;

        expect(SyntaxValidator.validate(xmlData)).toBe(true);
    });

    it("should error for unclosed DOCTYPE", function () {
        const xmlData = `<?xml version="1.0"?><!DOCTYPE `;

        expect(() => SyntaxValidator.validate(xmlData)).toThrowError("Unclosed DOCTYPE");
    });

    it("should error for invalid DOCTYPE tag", function () {
        const xmlData = `<?xml version="1.0"?><!DOCCTYPE foo><foo/>`;
        // console.log(SyntaxValidator.validate(xmlData))
        expect(() => SyntaxValidator.validate(xmlData)).toThrowError("char 'D' is not expected.");
    });

    it("should pass for DOCTYPE with valid comment expressions", function () {
        const xmlData =
            `<?xml version="1.0" standalone="yes" ?>` +
            `<!--open the DOCTYPE declaration - the open square bracket indicates an internal DTD-->` +
            `<!DOCTYPE foo [` +
            `<!--define the internal DTD-->` +
            `<!ELEMENT foo EMPTY>` +
            `<!ELEMENT foo ANY>` +
            `<!--close the DOCTYPE declaration-->` +
            `]>` +
            `<foo>Hello World.</foo>`;

        expect(SyntaxValidator.validate(xmlData)).toBe(true);
    });

    it("should pass when DTD comments contain '<' or '>'", function () {
        const xmlData = `<!DOCTYPE greeting [<!-- < > < -->]><greeting/>`;

        expect(SyntaxValidator.validate(xmlData)).toBe(true);
    });

    it("should pass for ATTLIST and NOTATION declarations", function () {
        const xmlData =
            `<?xml version="1.0"?>` +
            `<!DOCTYPE code [` +
            `  <!ELEMENT code (#PCDATA)>` +
            `  <!NOTATION vrml PUBLIC "VRML 1.0">` +
            `  <!NOTATION vrml2 PUBLIC "VRML 1.0" "system">` +
            `  <!ATTLIST code lang NOTATION (vrml) #REQUIRED>` +
            `]>` +
            `<code lang="vrml">Some VRML instructions</code>`;

        // console.log(SyntaxValidator.validate(xmlData))
        expect(SyntaxValidator.validate(xmlData)).toBe(true);
    });

    // ─── ENTITY declarations ─────────────────────────────────────────────────

    it("should pass for valid internal entity declarations", function () {
        const xmlData =
            `<!DOCTYPE note [` +
            `  <!ENTITY writer "Writer: Donald Duck.">` +
            `  <!ENTITY copyright "Copyright: W3Schools.">` +
            `]>` +
            `<note/>`;

        expect(SyntaxValidator.validate(xmlData)).toBe(true);
    });

    it("should pass when entity value uses matching single quotes", function () {
        const xmlData = `<!DOCTYPE x [ <!ENTITY x 'x">]><!--'> ]><X><Y/></X>`;

        expect(SyntaxValidator.validate(xmlData)).toBe(true);
    });

    it("should pass for entity names with special regex characters in the name", function () {
        const xmlData =
            `<?xml version="1.0"?>` +
            `<!DOCTYPE foo [` +
            `  <!ENTITY l. "<img src=x onerror=alert(1)>">` +
            `]>` +
            `<root><text>Hello</text></root>`;

        expect(SyntaxValidator.validate(xmlData)).toBe(true);
    });

    it("should error when entity name contains an invalid character", function () {
        const xmlData =
            `<?xml version="1.0" encoding="UTF-8"?>` +
            `<!DOCTYPE note [` +
            `  <!ENTITY nj$ "writer;">` +
            `]>` +
            `<note/>`;

        expect(() => SyntaxValidator.validate(xmlData)).toThrowError(/Invalid entity name/i);
    });

    it("should pass for localised (non-ASCII) entity names", function () {
        const xmlData =
            `<?xml version="1.0" encoding="UTF-8"?>` +
            `<!DOCTYPE note [` +
            `  <!ENTITY ሀሎ "Amharic hello!">` +
            `  <!ENTITY Здраво "Macedonian hello.">` +
            `]>` +
            `<note/>`;

        expect(SyntaxValidator.validate(xmlData)).toBe(true);
    });

    // ─── Entity limits ───────────────────────────────────────────────────────

    it("should pass when entity count is within the configured limit", function () {
        const xmlData =
            `<!DOCTYPE note [` +
            `  <!ENTITY a "one">` +
            `  <!ENTITY b "two">` +
            `]>` +
            `<note/>`;

        expect(SyntaxValidator.validate(xmlData, { docType: { maxEntityCount: 2 } })).toBe(true);
    });

    it("should error when entity count exceeds the configured limit", function () {
        const xmlData =
            `<!DOCTYPE note [` +
            `  <!ENTITY a "one">` +
            `  <!ENTITY b "two">` +
            `  <!ENTITY c "three">` +
            `]>` +
            `<note/>`;

        expect(() => SyntaxValidator.validate(xmlData, { docType: { maxEntityCount: 2 } }))
            .toThrowError(/exceeds maximum allowed/i);
    });

    it("should pass when entity size is within the configured limit", function () {
        const xmlData =
            `<!DOCTYPE note [` +
            `  <!ENTITY short "hi">` +
            `]>` +
            `<note/>`;

        expect(SyntaxValidator.validate(xmlData, { docType: { maxEntitySize: 10 } })).toBe(true);
    });

    it("should error when entity size exceeds the configured limit", function () {
        const xmlData =
            `<!DOCTYPE note [` +
            `  <!ENTITY big "this value is definitely too long">` +
            `]>` +
            `<note/>`;

        expect(() => SyntaxValidator.validate(xmlData, { docType: { maxEntitySize: 5 } }))
            .toThrowError(/exceeds maximum allowed size/i);
    });

    it("should impose no limits when docType options are omitted", function () {
        let entities = "";
        for (let n = 0; n < 100; n++) {
            entities += `<!ENTITY e${n} "value${n}">`;
        }
        const xmlData = `<!DOCTYPE note [${entities}]><note/>`;

        expect(SyntaxValidator.validate(xmlData)).toBe(true);
    });
});