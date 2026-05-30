import { EditorView } from "@codemirror/view";

export const chaitraEditorTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "var(--color-surface)",
      color: "var(--color-text)",
      fontFamily: "var(--font-mono)",
      fontSize: "0.85rem",
      borderRadius: "var(--radius-md)",
    },
    ".cm-content": {
      padding: "var(--space-3)",
      caretColor: "var(--color-accent)",
    },
    ".cm-scroller": {
      lineHeight: "1.5",
    },
    ".cm-gutters": {
      backgroundColor: "var(--color-surface)",
      color: "var(--color-muted)",
      border: "none",
      borderTopLeftRadius: "var(--radius-md)",
      borderBottomLeftRadius: "var(--radius-md)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "color-mix(in srgb, var(--color-accent) 8%, transparent)",
      color: "var(--color-text)",
    },
    ".cm-activeLine": {
      backgroundColor: "color-mix(in srgb, var(--color-accent) 6%, transparent)",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "var(--color-accent)",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
      backgroundColor: "color-mix(in srgb, var(--color-accent) 25%, transparent) !important",
    },
    ".cm-lineNumbers .cm-gutterElement": {
      padding: "0 var(--space-3) 0 var(--space-3)",
      minWidth: "2.5rem",
    },
    ".cm-foldGutter": {
      color: "var(--color-muted)",
    },
    ".cm-matchingBracket, .cm-nonmatchingBracket": {
      backgroundColor: "color-mix(in srgb, var(--color-accent) 15%, transparent)",
      outline: "1px solid var(--color-accent)",
    },
    ".cm-tooltip": {
      backgroundColor: "var(--color-surface)",
      color: "var(--color-text)",
      border: "1px solid color-mix(in srgb, var(--color-muted) 30%, transparent)",
      borderRadius: "var(--radius-md)",
    },
    ".cm-tooltip-autocomplete > ul > li[aria-selected]": {
      backgroundColor: "color-mix(in srgb, var(--color-accent) 15%, transparent)",
      color: "var(--color-text)",
    },
    ".cm-panels": {
      backgroundColor: "var(--color-surface)",
      color: "var(--color-text)",
    },
    ".cm-panels.cm-panels-top": {
      borderBottom: "1px solid color-mix(in srgb, var(--color-muted) 30%, transparent)",
    },
    ".cm-searchMatch": {
      backgroundColor: "color-mix(in srgb, var(--color-accent) 20%, transparent)",
      outline: "1px solid var(--color-accent)",
    },
    ".cm-searchMatch.cm-searchMatch-selected": {
      backgroundColor: "color-mix(in srgb, var(--color-accent) 35%, transparent)",
    },
    ".cm-specialChar": {
      color: "var(--color-muted)",
    },
    ".cm-placeholder": {
      color: "var(--color-muted)",
    },
  },
  { dark: true },
);
