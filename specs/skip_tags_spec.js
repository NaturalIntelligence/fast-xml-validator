"use strict";

import { SyntaxValidator } from "../src/fxv.js";

describe("skipTags option", function () {

    it("should not skip anything by default", function () {
        const xmlData = `<root><script>1 < 2</script></root>`;
        expect(() => SyntaxValidator.validate(xmlData)).toThrow();
    });

    it("should skip validation of the matched tag's subtree", function () {
        const xmlData = `<root><script>if (1 < 2 && a=b) { "unterminated }</script></root>`;
        expect(SyntaxValidator.validate(xmlData, { skipTags: ["..script"] })).toBe(true);
    });

    it("should not skip tags that don't match the expression", function () {
        const xmlData = `<root><other>1 < 2</other></root>`;
        expect(() => SyntaxValidator.validate(xmlData, { skipTags: ["..script"] })).toThrow();
    });

    it("should skip a tag matched by an absolute path expression", function () {
        const xmlData = `<root><rawData>1 < 2 & garbage</rawData></root>`;
        expect(SyntaxValidator.validate(xmlData, { skipTags: ["root.rawData"] })).toBe(true);
    });

    it("should still validate structure outside the skipped subtree", function () {
        const xmlData = `<root><script>raw < stuff</script><bad ></root>`;
        expect(() => SyntaxValidator.validate(xmlData, { skipTags: ["..script"] })).toThrow();
    });

    it("should skip illegal control characters inside the skipped subtree", function () {
        const xmlData = `<root><script>b\x01c</script></root>`;
        expect(SyntaxValidator.validate(xmlData, { skipTags: ["..script"] })).toBe(true);
    });

    it("should resume validation correctly for siblings after a skipped tag", function () {
        const xmlData = `<root><script>raw < stuff</script><ok>fine</ok></root>`;
        expect(SyntaxValidator.validate(xmlData, { skipTags: ["..script"] })).toBe(true);
    });
});
