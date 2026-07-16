## Architecture

```
SyntaxValidator                 orchestrator: owns the character scan and
                                 the open/close tag stack
 ├─ XmlDeclarationValidator      <?xml ... ?> prolog
 ├─ DocTypeValidator             <!DOCTYPE ...> (entities, elements, attlists)
 ├─ CommentCdataReader           <!-- --> and <![CDATA[ ]]>
 ├─ AttributeStringValidator     a tag's attribute expression
 │   └─ XmlNameValidator         element/attribute/PI name well-formedness
 ├─ ControlCharValidator         illegal control characters (always on)
 └─ SkipTagMatcher               path-expression matching for `skipTags`
     └─ RawSubtreeReader         raw consumption of a skipped tag's subtree
```

Each collaborator has one job and can be reasoned about (and unit-tested) in
isolation; `SyntaxValidator` composes them and is the only class that knows
about the overall document scan / tag-stack state machine.