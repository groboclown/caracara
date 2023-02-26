// Debugging interface API
// This hooks into the interpreter.

import { InterpreterDebuggerCallbacks } from '../vm-api/interpreter/debugger-callbacks'

export interface Debugger {
    createInterpreterCallbacks(): InterpreterDebuggerCallbacks
}
