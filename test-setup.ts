import { Window } from 'happy-dom'

// Set up DOM environment for tests
const window = new Window()
globalThis.window = window as any
globalThis.document = window.document as any
globalThis.navigator = window.navigator as any
globalThis.HTMLElement = window.HTMLElement as any
globalThis.getComputedStyle = window.getComputedStyle.bind(window) as any
