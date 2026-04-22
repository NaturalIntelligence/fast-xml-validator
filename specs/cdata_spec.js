import { SyntaxValidator } from "../src/fxv.js";

describe("XMLParser", function () {
    it("should parse multiline tag value when tags without spaces", function () {
        const xmlData = `<root><person>lastname
firstname
patronymic</person></root>`;

        const result = SyntaxValidator.validate(xmlData);
        expect(result).toBe(true);
    });
    it("should parse tag having CDATA", function () {
        const xmlData = `
<any_name>
    <person>
        <phone>+122233344550</phone>
        <name><![CDATA[<some>Jack</some>]]><![CDATA[Jack]]></name>
        <name><![CDATA[<some>Mohan</some>]]></name>
        <blank><![CDATA[]]></blank>
        <regx><![CDATA[^[ ].*$]]></regx>
        <phone>+122233344551</phone>
    </person>
</any_name>`;

        const result = SyntaxValidator.validate(xmlData);
        expect(result).toBe(true);
    });

    it("should parse tag having CDATA 2", function () {
        const xmlData = `\
<sql-queries>
    <sql-query id='testquery'><![CDATA[select * from search_urls]]></sql-query>
    <sql-query id='searchinfo'><![CDATA[select * from search_urls where search_urls=?]]></sql-query>
    <sql-query id='searchurls'><![CDATA[select search_url from search_urls ]]></sql-query>
</sql-queries>`;

        const result = SyntaxValidator.validate(xmlData);

        expect(result).toBe(true);
    });

    it("should parse tag having whitespaces before / after CDATA", function () {
        const xmlData = `\
<xml>
    <a>text</a>
    <b>\n       text    \n</b>
    <c>     <![CDATA[text]]>    </c>
    <d><![CDATA[text]]></d>
</xml>`;

        const result = SyntaxValidator.validate(xmlData);
        expect(result).toBe(true);
    });

    it("should ignore comment", function () {
        const xmlData = `<rootNode><!-- <tag> - - --><tag>1</tag><tag>val</tag></rootNode>`;

        const result = SyntaxValidator.validate(xmlData);
        expect(result).toBe(true);
    });

    it("should ignore multiline comments", function () {
        const xmlData = "<rootNode><!-- <tag> - - \n--><tag>1</tag><tag>val</tag></rootNode>";

        const result = SyntaxValidator.validate(xmlData);
        expect(result).toBe(true);
    });

});
