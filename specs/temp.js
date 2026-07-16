import { SyntaxValidator } from "../src/fxv.js";
// import he from "he";

describe("XMLParser", function () {
  it("should validate attributes with valid names", function () {
    const xmlData = `<a>a`; //fix this
    // const xmlData = `<a><b></a>`;
    const result = SyntaxValidator.validate(xmlData);
    expect(result).toBe(true);
  });
});