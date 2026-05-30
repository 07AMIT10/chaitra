import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

/** Dark syntax colors aligned with Chaitra tokens (GitHub-dark-ish, on-brand). */
const chaitraHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: "#79c0ff" },
  { tag: tags.controlKeyword, color: "#79c0ff" },
  { tag: tags.definitionKeyword, color: "#79c0ff" },
  { tag: tags.moduleKeyword, color: "#79c0ff" },
  { tag: tags.operatorKeyword, color: "#79c0ff" },
  { tag: tags.string, color: "#7ee787" },
  { tag: tags.special(tags.string), color: "#7ee787" },
  { tag: tags.comment, color: "#8b9cb3", fontStyle: "italic" },
  { tag: tags.lineComment, color: "#8b9cb3", fontStyle: "italic" },
  { tag: tags.blockComment, color: "#8b9cb3", fontStyle: "italic" },
  { tag: tags.number, color: "#f2cc60" },
  { tag: tags.bool, color: "#79c0ff" },
  { tag: tags.null, color: "#79c0ff" },
  { tag: tags.definition(tags.variableName), color: "#e6edf3" },
  { tag: tags.variableName, color: "#e6edf3" },
  { tag: tags.function(tags.variableName), color: "#d2a8ff" },
  { tag: tags.definition(tags.function(tags.variableName)), color: "#d2a8ff" },
  { tag: tags.className, color: "#ffa657" },
  { tag: tags.typeName, color: "#ffa657" },
  { tag: tags.namespace, color: "#ffa657" },
  { tag: tags.operator, color: "#8b9cb3" },
  { tag: tags.punctuation, color: "#8b9cb3" },
  { tag: tags.bracket, color: "#8b9cb3" },
  { tag: tags.meta, color: "#8b9cb3" },
  { tag: tags.propertyName, color: "#79c0ff" },
  { tag: tags.attributeName, color: "#79c0ff" },
  { tag: tags.tagName, color: "#7ee787" },
  { tag: tags.heading, color: "#79c0ff", fontWeight: "bold" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strong, fontWeight: "bold" },
  { tag: tags.link, color: "#79c0ff", textDecoration: "underline" },
  { tag: tags.invalid, color: "#f85149" },
]);

/** Place after minimalSetup so it overrides defaultHighlightStyle. */
export const chaitraSyntaxHighlighting = syntaxHighlighting(chaitraHighlight, { fallback: true });
