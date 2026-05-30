import type { Extension } from "@codemirror/state";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import { minimalSetup } from "codemirror";
import { chaitraEditorTheme } from "./chaitraEditorTheme";
import { chaitraSyntaxHighlighting } from "./chaitraHighlightStyle";

const shared: Extension[] = [
  minimalSetup,
  chaitraSyntaxHighlighting,
  EditorView.lineWrapping,
  chaitraEditorTheme,
];

export function pythonEditorExtensions(): Extension[] {
  return [...shared, python()];
}

/** Rust is read-only in v1 — reference source only, WASM runs prebuilt binary. */
export function rustReadOnlyEditorExtensions(): Extension[] {
  return [
    ...shared,
    rust(),
    EditorState.readOnly.of(true),
    EditorView.editable.of(false),
  ];
}
