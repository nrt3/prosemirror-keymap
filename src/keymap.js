const keyName = require("w3c-keyname")
const {Plugin} = require("prosemirror-state")

// declare global: navigator

const mac = typeof navigator != "undefined" ? /Mac/.test(navigator.platform) : false

function normalizeKeyName(name) {
  let parts = name.split(/-(?!$)/), result = parts[parts.length - 1]
  if (result == "Space") result = " "
  let alt, ctrl, shift, meta
  for (let i = 0; i < parts.length - 1; i++) {
    let mod = parts[i]
    if (/^(cmd|meta|m)$/i.test(mod)) meta = true
    else if (/^a(lt)?$/i.test(mod)) alt = true
    else if (/^(c|ctrl|control)$/i.test(mod)) ctrl = true
    else if (/^s(hift)?$/i.test(mod)) shift = true
    else if (/^mod$/i.test(mod)) { if (mac) meta = true; else ctrl = true }
    else throw new Error("Unrecognized modifier name: " + mod)
  }
  if (alt) result = "Alt-" + result
  if (ctrl) result = "Ctrl-" + result
  if (meta) result = "Meta-" + result
  if (shift) result = "Shift-" + result
  return result
}

function normalize(map) {
  let copy = Object.create(null)
  for (let prop in map) copy[normalizeKeyName(prop)] = map[prop]
  return copy
}

function modifiers(name, event, shift) {
  if (event.altKey) name = "Alt-" + name
  if (event.ctrlKey) name = "Ctrl-" + name
  if (event.metaKey) name = "Meta-" + name
  if (shift !== false && event.shiftKey) name = "Shift-" + name
  return name
}

// :: (Object) → Plugin
// Create a keymap plugin for the given set of bindings.
//
// Bindings should map key names to [command](#commands)-style
// functions, which will be called with `(EditorState, dispatch,
// EditorView)` arguments, and should return true when they've handled
// the key. Note that the view argument isn't part of the command
// protocol, but can be used as an escape hatch if a binding needs to
// directly interact with the UI.
//
// Key names may be strings like `"Shift-Ctrl-Enter"`, a key
// identifier prefixed with zero or more modifiers. Key identifiers
// are based on the strings that can appear in
// [`KeyEvent.key`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key).
// Use lowercase letters to refer to letter keys (or uppercase letters
// if you want shift to be held). You may use `"Space"` as an alias
// for the `" "` name.
//
// Modifiers can be given in any order. `Shift-` (or `s-`), `Alt-` (or
// `a-`), `Ctrl-` (or `c-` or `Control-`) and `Cmd-` (or `m-` or
// `Meta-`) are recognized. For characters that are created by holding
// shift, the `Shift-` prefix is implied, and should not be added
// explicitly.
//
// You can use `Mod-` as a shorthand for `Cmd-` on Mac and `Ctrl-` on
// other platforms.
//
// You can add multiple keymap plugins to an editor. The order in
// which they appear determines their precedence (the ones early in
// the array get to dispatch first).
function keymap(bindings) {
  return new Plugin({props: {handleKeyDown: keydownHandler(bindings)}})
}
exports.keymap = keymap

// :: (Object) → (view: EditorView, event: dom.Event) → bool
// Given a keymap, return a [keydown
// handler](#view.EditorProps.handleKeydown) that implements the
// bindings for that map, using the same rules as
// [`keymap`](##keymap.keymap).
function keydownHandler(bindings) {
  let map = normalize(bindings)
  return function(view, event) {
    let name = keyName(event), isChar = name.length == 1 && name != " ", baseName
    let direct = map[modifiers(name, event, !isChar)]
    if (direct && direct(view.state, view.dispatch, view)) return true
    if (event.shiftKey && isChar && (baseName = keyName.base[event.keyCode])) {
      let withShift = map[modifiers(baseName, event, true)]
      if (withShift && withShift(view.state, view.dispatch, view)) return true
    }
    return false
  }
}
exports.keydownHandler = keydownHandler
