"use strict";

import { SyntaxValidator } from "../src/fxv.js";
// import he from "he";

describe("XMLParser", function () {
    it("should validate attributes with valid names", function () {
        const xmlData = `<issue _ent-ity.23="Mjg2MzY2OTkyNA==" state="partial" version="1"></issue>`;
        const result = SyntaxValidator.validate(xmlData);
        expect(result).toBe(true);
    });

    it("should validate attributes with newline char", function () {
        const xmlData = `<element id="7" data="foo\nbar" bug="true"/>`;
        const result = SyntaxValidator.validate(xmlData);
        expect(result).toBe(true);
    });

    it("should validate attributes separated by newline char", function () {
        const xmlData = `<element
id="7" data="foo bar" bug="true"/>`;
        const result = SyntaxValidator.validate(xmlData);
        expect(result).toBe(true);
    });

    it("should validate Boolean Attributes", function () {
        const xmlData = `<element id="7" str="" data><selfclosing/><selfclosing /><selfclosingwith attr/></element>`;
        const result = SyntaxValidator.validate(xmlData, {
            allowBooleanAttributes: true
        });
        expect(result).toBe(true);
    });

    it("should not remove xmlns when namespaces are not set to be ignored", function () {
        const xmlData = `<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd"></project>`;
        const result = SyntaxValidator.validate(xmlData, {
            allowBooleanAttributes: true
        });
        expect(result).toBe(true);
    });

    it("should remove xmlns when namespaces are set to be ignored", function () {
        const xmlData = `<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi-ns="http://www.w3.org/2001/XMLSchema-instance" xsi-ns:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd"></project>`;
        const result = SyntaxValidator.validate(xmlData, {
            allowBooleanAttributes: true
        });
        expect(result).toBe(true);
    });

    it("should not parse attributes with name start with number", function () {
        const xmlData = `<issue 35entity="Mjg2MzY2OTkyNA==" ></issue>`;
        expect(() => SyntaxValidator.validate(xmlData)).toThrowError("Attribute '35entity' is an invalid name.");
    });

    it("should not parse attributes with invalid char", function () {
        const xmlData = `<issue enti+ty="Mjg2MzY2OTkyNA=="></issue>`;
        expect(() => SyntaxValidator.validate(xmlData)).toThrowError("Attribute 'enti+ty' is an invalid name.");
    });

    it("should not parse attributes in closing tag", function () {
        const xmlData = `<issue></issue invalid="true">`;
        expect(() => SyntaxValidator.validate(xmlData)).toThrowError("Closing tag 'issue' can't have attributes or invalid starting.");
    });

    it("should err for invalid attributes", function () {
        const xmlData = `<rootNode =''></rootNode>`;
        expect(() => SyntaxValidator.validate(xmlData)).toThrowError("Attribute '''' has no space in starting.");
    });

    it("should validate xml with attributes", function () {
        const xmlData = `<rootNode attr="123"><tag></tag><tag>1</tag><tag>val</tag></rootNode>`;

        const result = SyntaxValidator.validate(xmlData);
        expect(result).toBe(true);
    });

    it("should validate xml attribute has '>' in value", function () {
        const xmlData = `<rootNode attr="123>234"><tag></tag><tag>1</tag><tag>val</tag></rootNode>`;

        const result = SyntaxValidator.validate(xmlData);
        expect(result).toBe(true);
    });

    it("should not validate xml with invalid attributes", function () {
        const xmlData = `<rootNode attr="123><tag></tag><tag>1</tag><tag>val</tag></rootNode>`;
        expect(() => SyntaxValidator.validate(xmlData)).toThrowError("Attributes for 'rootNode' have open quote.");
    });

    it("should not validate xml with invalid attributes when duplicate attributes present", function () {
        const xmlData = `<rootNode  abc='123' abc="567" />`;
        expect(() => SyntaxValidator.validate(xmlData)).toThrowError("Attribute 'abc' is repeated.");
    });

    it("should not validate xml with invalid attributes when no space between 2 attributes", function () {
        const xmlData = `<rootNode  abc='123'bc='567' />`;
        expect(() => SyntaxValidator.validate(xmlData)).toThrowError("Attribute 'bc' has no space in starting.");
    });

    it("should not validate a tag with attribute presents without value ", function () {
        const xmlData = `<rootNode ab cd='ef'></rootNode>`;

        expect(() => SyntaxValidator.validate(xmlData)).toThrowError("boolean attribute 'ab' is not allowed.");
    });

    it("should not validate xml with invalid attributes presents without value", function () {
        const xmlData = `<rootNode  123 abc='123' bc='567' />`;
        expect(() => SyntaxValidator.validate(xmlData)).toThrowError("boolean attribute '123' is not allowed.");
    });

    it("should validate xml with attributes having open quote in value", function () {
        const xmlData = "<rootNode  123 abc='1\"23' bc=\"56'7\" />";
        expect(() => SyntaxValidator.validate(xmlData)).toThrowError("boolean attribute '123' is not allowed.");

    });
});
