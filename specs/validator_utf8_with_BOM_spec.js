"use strict";
import { SyntaxValidator } from "../src/fxv.js";

describe("XMLParser", function () {
    it("should validate xml string with cyrillic characters", function () {
        const BOM = "\ufeff";
        let xmlData = BOM + "<?xml version=\"1.0\" encoding=\"utf-8\" ?><КорневаяЗапись><Тэг>ЗначениеValue53456</Тэг></КорневаяЗапись>";
        let result = SyntaxValidator.validate(xmlData);
        expect(result).toBe(true);

    });
});
