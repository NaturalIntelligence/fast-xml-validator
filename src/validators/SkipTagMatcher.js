'use strict';

import { Expression, Matcher } from 'path-expression-matcher';

/**
 * SkipTagMatcher — single responsibility: decide whether a tag currently
 * being opened should be excluded from validation, based on a list of path
 * expressions supplied via `options.skipTags` (same expression syntax as
 * `path-expression-matcher`, e.g. `"..script"`, `"root.data.raw"`,
 * `"row[type=raw]"`).
 *
 * Skip decisions are only ever made for tags reached through normal
 * (non-skipped) parsing — once a match is found, the caller
 * (`SyntaxValidator`) consumes the whole matched subtree as opaque raw text
 * (mirroring how CDATA is treated) and calls `pop()` once for that tag, so
 * this matcher's path stack never needs to represent the skipped subtree's
 * internal structure.
 */
export default class SkipTagMatcher {
  /**
   * @param {Array<string>} [skipTags]
   */
  constructor(skipTags = []) {
    this._expressions = skipTags.map((expr) => new Expression(expr));
    this._matcher = new Matcher();
    this._enabled = this._expressions.length > 0;
  }

  get enabled() {
    return this._enabled;
  }

  /**
   * Push the tag currently being opened onto the path and report whether it
   * (and its whole subtree) should be skipped.
   * @param {string} tagName
   * @param {Record<string,string>} [rawAttributes] - for `[attr=value]` conditions
   * @returns {boolean}
   */
  push(tagName, rawAttributes) {
    if (!this._enabled) return false;
    this._matcher.push(tagName, rawAttributes || null);
    for (let i = 0; i < this._expressions.length; i++) {
      if (this._matcher.matches(this._expressions[i])) return true;
    }
    return false;
  }

  /** Pop the most recently pushed tag off the path (tag fully closed). */
  pop() {
    if (!this._enabled) return;
    this._matcher.pop();
  }
}
