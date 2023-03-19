// The actual interpreter itself.

import { GeneratedError, GeneratedValue } from '../memory-store'
import { InterpreterDebuggerCallbacks } from './debugger-callbacks'
import { ScriptContext, StoredConstantValue } from './loaded-script'

// Interpreter The instance of the function interpreter for a script context.
export interface Interpreter {
    // getScriptContext Get the original script context input for this instance.
    getScriptContext(): ScriptContext

    // setDebugger Set callbacks into the debugger for interpreter execution.
    setDebugger(callback: InterpreterDebuggerCallbacks): void

    // runFunction Run a function with arguments and return the result.
    // The function must be a CallableValue constant stored in the module with the given
    //   name.
    runFunction(module: string, name: string, argument: {[key: string]: StoredConstantValue}): GeneratedValue | GeneratedError
}
