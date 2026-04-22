"use strict";

import fs from "fs";
import path from "path";
import { SyntaxValidator } from "../src/fxv.js";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the file URL of the current module
const __filename = fileURLToPath(import.meta.url);

// Derive the directory name
const __dirname = dirname(__filename);

function validateXml(xmlData, error, line = 1, col) {

    // console.log(result);
    if (error) {
        const keys = Object.keys(error);
        expect(() => SyntaxValidator.validate(xmlData)).toThrowError(error[keys[0]])
        // const expected = {
        //     code: keys[0],
        //     msg: error[keys[0]],
        //     line,
        //     col,
        // };

        // // don't evaluate col if it is not set by the test case
        // if (col === undefined) {
        //     delete expected.col;
        //     delete result.err.col;
        // }
        // expect(result.err).toEqual(expected);
    } else {
        const result = SyntaxValidator.validate(xmlData);
        expect(result).toBe(true);
    }
}

function validateFile(fileName, ...args) {
    const fileNamePath = path.join(__dirname, "assets/" + fileName);
    validateXml(fs.readFileSync(fileNamePath).toString(), ...args);
}

describe("XML Validator", function () {
    it("should validate simple xml string", function () {
        validateXml("<rootNode></rootNode>");
        validateXml(`<rootNode></rootNode     >`);
    });

    it("should not validate invalid starting tag", function () {
        validateXml("< rootNode></rootNode>", {
            InvalidTag: "Invalid space after '<'."
        });
    });

    it("should not validate incomplete xml string", function () {
        validateXml("<rootNode>", { InvalidTag: "Unclosed tag 'rootNode'." }, 1);
    });

    it("should not validate invalid starting tag for following characters", function () {
        validateXml("<rootNode#@aa></rootNode#@aa>", {
            InvalidTag: "Tag 'rootNode#@aa' is an invalid name."
        });
    });

    it("should return false for non xml text", function () {
        validateXml("rootNode", {
            InvalidChar: "char 'r' is not expected."
        });
    });

    it("should validate self closing tags", function () {
        validateXml("<rootNode><validtag1  /><validtag2/><validtag3  with='attrib'/><validtag4 />text<validtag5/>text</rootNode>");
    });

    it("should not consider these as self closing tags", function () {
        validateXml("<rootNode><validtag1/><invalid tag/><validtag3  with='attrib'/></rootNode>", {
            InvalidAttr: "boolean attribute 'tag' is not allowed."
        });
        validateXml("<rootNode><notSelfClosing/ ></rootNode>", {
            InvalidAttr: "Attribute '/' has no space in starting."
        });
    });


    it("should not validate xml string when closing tag is different", function () {
        validateXml("<rootNode></rootnode>", {
            InvalidTag: "Expected closing tag 'rootNode' (opened in line 1, col 1) instead of closing tag 'rootnode'."
        });
    });

    it("should not validate xml string when closing tag is invalid", function () {
        validateXml("<rootNode>< /rootnode>", {
            InvalidTag: "Invalid space after '<'."
        });
        validateXml("<rootNode></ rootnode>", {
            InvalidTag: "Invalid space after '<'."
        });
        validateXml("<rootNode></rootnode 123>", {
            InvalidTag: "Closing tag 'rootnode' can't have attributes or invalid starting."
        });
    });

    it("should validate simple xml string with namespace", function () {
        validateXml("<root:Node></root:Node>");
    });

    it("should not validate xml string with namespace when closing tag is diffrent", function () {
        validateXml("<root:Node></root:node>", {
            InvalidTag: "Expected closing tag 'root:Node' (opened in line 1, col 1) instead of closing tag 'root:node'."
        });
    });

    it("should validate simple xml string with value", function () {
        validateXml("<root:Node>some value</root:Node>");
    });

    it("should not validate simple xml string with value but not matching closing tag", function () {
        validateXml("<root:Node>some value</root>", {
            InvalidTag: "Expected closing tag 'root:Node' (opened in line 1, col 1) instead of closing tag 'root'."
        });
    });

    it("should not validate simple xml string with value but no closing tag", function () {
        validateXml("<root:Node>some value", {
            InvalidTag: "Unclosed tag 'root:Node'."
        });
    });

    it("should validate xml with nested tags", function () {
        validateXml("<rootNode><tag></tag><tag>1</tag><tag>val</tag></rootNode>");
    });

    it("should not validate xml with wrongly nested tags", function () {
        validateXml("<rootNode><tag><tag1></tag>1</tag1><tag>val</tag></rootNode>", {
            InvalidTag: "Expected closing tag 'tag1' (opened in line 1, col 16) instead of closing tag 'tag'."
        });
    });

    it("should not validate xml with unexpected closing tag", function () {
        validateXml("</rootNode>", {
            InvalidTag: "Closing tag 'rootNode' has not been opened."
        });
    });

    it("should validate xml with comment", function () {
        validateXml("<rootNode><!-- <tag> - - --><tag>1</tag><tag>val</tag></rootNode>");
    });

    it("should validate xml with comment", function () {
        validateXml("<rootNode><!-- <tag> - - \n--><tag>1</tag><tag>val</tag></rootNode>");
    });

    it("should not validate xml with comment in a open tag", function () {
        validateXml("<rootNode<!-- <tag> -- -->><tag>1</tag><tag>val</tag></rootNode>", {
            InvalidTag: "Tag 'rootNode<!--' is an invalid name."
        });
    });

    it("should not validate xml with comment in a open tag", function () {
        validateXml("<rootNode <!-- <tag> -- --> ><tag>1</tag><tag>val</tag></rootNode>", {
            InvalidAttr: "boolean attribute '<!--' is not allowed."
        });
    });

    it("should correctly identify self closing tags", function () {
        validateXml("<rootNode><in/valid></in/valid></rootNode>", {
            InvalidTag: "Tag 'in/valid' is an invalid name."
        });
        validateXml("<rootNode><in#valid/></rootNode>", {
            InvalidTag: "Tag 'in#valid' is an invalid name."
        });
    });

    it("should not validate xml with non closing comment", function () {
        validateXml("<rootNode ><!-- <tag> -- <tag>1</tag><tag>val</tag></rootNode>", {
            InvalidTag: "Unclosed tag 'rootNode'."
        }, 1);
    });

    it("should not validate xml with unclosed tag", function () {
        validateXml("<rootNode  abc='123' bc='567'", {
            InvalidTag: "Unclosed tag 'rootNode'."
        });
    });

    it("should validate xml with CDATA", function () {
        validateXml("<name><![CDATA[Jack]]></name>");
    });

    it("should validate xml with repeated CDATA", function () {
        validateXml("<name><![CDATA[Jack]]><![CDATA[Jack]]></name>");
    });

    it("should validate xml when CDATA consist regx or blank data", function () {
        validateXml("<name><![CDATA[]]><![CDATA[^[ ].*$]]></name>");
    });

    it("should return false when tag starts with xml or XML etc", function () {
        /* const error = (tag) => ({
            InvalidTag: `Tag '${tag}' is an invalid name.`
        });
        SyntaxValidator.validate("<xmlNode  abc='123' bc='567'>val</xmlNode>", error("xmlNode"));
        SyntaxValidator.validate("<XmLNode  abc='123' bc='567'></XmLNode>", error("XmLNode"));
        SyntaxValidator.validate("<xMLNode/>", error("xMLNode")); */
    });

    it("should return true for valid tag", function () {
        validateXml("<ns:start_tag-2.0></ns:start_tag-2.0>");
    });

    it("should return false for invalid tag", function () {
        validateXml("<2start_tag  abc='123' bc='567'></2start_tag>", {
            InvalidTag: "Tag '2start_tag' is an invalid name."
        });
    });

    it("should return false for invalid tag", function () {
        validateXml("<2start_tag />", {
            InvalidTag: "Tag '2start_tag' is an invalid name."
        });
    });

    it("should validate xml data", function () {
        validateFile("sample.xml");
    });

    it("should validate complex xml data", function () {
        validateFile("complex.xml");
    });

    it("should validate xml data with CRLF", function () {
        validateFile("crlf.xml");
    });

    it("should return false for invalid xml", function () {
        validateFile("invalid.xml", {
            InvalidTag: "Expected closing tag 'selfclosing' (opened in line 11, col 2) instead of closing tag 'person'."
        }, 27, 5);
    });

    it("should return true for valid svg", function () {
        validateFile("by.svg");
    });

    it("should validate XML with DOCTYPE", function () {
        validateXml("<?xml version=\"1.0\" standalone=\"yes\" ?>" +
            "<!--open the DOCTYPE declaration -" +
            "  the open square bracket indicates an internal DTD-->" +
            "<!DOCTYPE foo [" +
            "<!--define the internal DTD-->" +
            "<!ELEMENT foo (#PCDATA)>" +
            "<!--close the DOCTYPE declaration-->" +
            "]>" +
            "<foo>Hello World.</foo>");
    });


    it("should fail for XML with ! which is not a comment, DOCTYPE or CDATA", function () {
        validateXml("<test><!bla></!bla></test>", {
            InvalidTag: "Tag '!bla' is an invalid name."
        });
    });

    it("should not validate XML when prolog doesn't start from 1st char", function () {
        validateXml("  <?xml version=\"1.0\" standalone=\"yes\" ?><foo>Hello World.</foo>", {
            InvalidXml: "XML declaration allowed only at the start of the document."
        });
    });

    it("should not validate XML with prolog only", function () {
        validateXml("<?xml version=\"1.0\" standalone=\"yes\" ?><!--some comment -  end in this line-->", {
            InvalidXml: "Start tag expected."
        });
    });

    it("should not validate XML with prolog &  DOCTYPE but not any other tag", function () {
        validateXml("<?xml version=\"1.0\" standalone=\"yes\" ?>" +
            "<!--open the DOCTYPE declaration - the open square bracket indicates an internal DTD-->" +
            "<!DOCTYPE foo [" +
            "<!--define the internal DTD-->" +
            "<!ELEMENT foo (#PCDATA)>" +
            "<!--close the DOCTYPE declaration-->" +
            "]>", {
            InvalidXml: "Start tag expected."
        });
    });

    it("should validate XML PIs", function () {
        validateXml('<?xml version="1.0"?>' +
            '<?mso-contentType?>' +
            '<h1></h1>' +
            '<?mso-contentType something="val"?>');
    });

    it("should validate XML PIs", function () {
        validateXml('<h1><?mso?> abc</h1>');
    });

    it("should validate XML PIs", function () {
        const xml = `<?xml version="1.0"?>
        <content><?tibcochar ?> something</content>`;
        validateXml(xml);
    });

    it("should not validate XML PIs with invalid values", function () {
        validateXml('<?xml version="1.0"?>' +
            '<?mso-contentType valid="value" invalid="?>" ?>' +
            '<h1></h1>' +
            '<?mso-contentType something="val"?>', {
            InvalidChar: "char '\"' is not expected."
        });
    });

    it('should validate xml with a "length" attribute', function () {
        validateXml('<name length="1"></name>');
    });

    it("should not validate xml with repeated attributes", function () {
        validateXml('<name length="bar" length="baz"></name>', {
            InvalidAttr: "Attribute 'length' is repeated."
        });
    });

    it('should validate xml with a tag attribute splitted on more lines', () => {
        validateXml(`
<name
attribute1="attribute1"
attribute2="attribute2"
/>
    `);
    });

    it('should validate xml not properly closed', () => {
        validateXml(`
<name
attribute1="attribute1"
attribute2="attribute2"
></name
    `, {
            InvalidTag: "Closing tag 'name' doesn't have proper closing."
        }, 6);
    });

    it('should detect error line when having multiple attributes', () => {
        validateXml(`<urlset t
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd"
        xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    </urlset>`, {
            InvalidAttr: "boolean attribute 't' is not allowed."
        });
    });

    it('should detect error line when having multiple attributes 2', () => {
        validateXml(`<urlset
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd"
        xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        t>
    </urlset>`, {
            InvalidAttr: "boolean attribute 't' is not allowed."
        }, 5, 9);
    });

    it('should validate value with ampersand', function () {
        const error = {
            InvalidChar: "char '&' is not expected."
        };
        validateXml('<rootNode>jekyll &amp; hyde</rootNode>');
        validateXml('<rootNode>jekyll &#123; hyde</rootNode>');
        validateXml('<rootNode>jekyll &#x1945abcdef; hyde</rootNode>');
        validateXml('<rootNode>jekyll &#x1ah; hyde</rootNode>', error);
        validateXml('<rootNode>jekyll &#1a; hyde</rootNode>', error);
        validateXml('<rootNode>jekyll &#123 hyde</rootNode>', error);
        validateXml('<rootNode>jekyll &#1abcd hyde</rootNode>', error);
        validateXml('<rootNode>jekyll & hyde</rootNode>', error);
        validateXml('<rootNode>jekyll &aa</rootNode>', error);
        validateXml('<rootNode>jekyll &abcdefghij1234567890;</rootNode>');
        validateXml('<rootNode>jekyll &abcdefghij1234567890a;</rootNode>', error); // limit to 20 chars
    });
});

describe("should not validate XML documents with multiple root nodes", () => {
    it('when root nodes are repeated', () => {
        validateXml(`<xml></xml><xml></xml>`, {
            InvalidXml: 'Multiple possible root nodes found.'
        });
    });

    it('when root nodes are different', () => {
        validateXml('<xml></xml><xml2></xml2>', {
            InvalidXml: 'Multiple possible root nodes found.'
        });
    });

    it('when root nodes have more nested tags', () => {
        validateXml(`<test>
        <nested>
        </nested>
        </test>
        <xml2>
        </xml2>`, {
            InvalidXml: 'Multiple possible root nodes found.'
        }, 5);
    });
});

describe("should report correct line numbers for unclosed tags", () => {

    it('- child tag', () =>
        validateXml(`<parent>
                    <childA/>
                    <childB>  <!-- error: should be self-closing -->
                    <childC/>
                  </parent>`,
            { InvalidTag: "Expected closing tag 'childB' (opened in line 3, col 21) instead of closing tag 'parent'." }, 5, 19));

    it('- root tag', () =>
        validateXml(`             <!-- line 1 -->
                               <!-- line 2 -->
                    <parent>   <!-- line 3  error: not closed -->
                      <childA/>
                    <childB/>`,
            { InvalidTag: "Unclosed tag 'parent'." }, 3, 21));

    it('- incorrect close tag', () =>
        validateXml(`<parent>
                    <child>
                       <self/>
                    </incorrect>
                    <empty/>
                  <parent>`,
            { InvalidTag: "Expected closing tag 'child' (opened in line 2, col 21) instead of closing tag 'incorrect'." }, 4, 21));

    it('- nested incorrect close tag', () =>
        validateXml(`<parent>
                    <child>
                       <self/>
                       <self>
                    </incorrect>
                    <empty/>
                  </parent>`,
            { InvalidTag: "Expected closing tag 'self' (opened in line 4, col 24) instead of closing tag 'incorrect'." }, 5, 21));

    it('- Extra text', () =>
        validateXml(`<parent>
                  </parent>extra`,
            { InvalidXml: "Extra text at the end" }, 2, 28));

    it('- Extra text', () =>
        validateXml(`<parent><child attri= bute="true" /></parent>`,
            { InvalidAttr: "Attribute 'attri' is without value." }, 1, 16));
});

describe("XML Validator with options", function () {
    it('- Unpaired tags', () =>
        validateXml(`<parent><extra></parent>`,
            { InvalidTag: "Expected closing tag 'extra' (opened in line 1, col 9) instead of closing tag 'parent'." }, 1, 16));

    it('- Marked Unpaired tags', () => {
        const result = SyntaxValidator.validate(`<parent><extra></parent>`, {
            unpairedTags: ["extra"]
        });
        // console.log(result);
        expect(result).toBeTrue();
    });
    it('- allowBooleanAttributes:false', () =>
        validateXml(`<parent extra></parent>`,
            { InvalidAttr: "boolean attribute 'extra' is not allowed." }, 1, 9));

    it('- allowBooleanAttributes:true', () => {
        const result = SyntaxValidator.validate(`<parent extra></parent>`, {
            allowBooleanAttributes: true
        });
        expect(result).toBeTrue();
    });

});