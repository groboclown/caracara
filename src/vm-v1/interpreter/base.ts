// The base interpreter implementation

import { Interpreter, InterpreterDebuggerCallbacks, OpCodeInstruction, ScriptContext } from "../../vm-api/interpreter"
import { EvaluatedValue, GeneratedError, GeneratedValue, VmOpCode } from "../../vm-api/memory-store"

export class InterpreterImpl implements Interpreter {
    private context: ScriptContext

    constructor(
        _opcodes: {[name: VmOpCode]: OpCodeInstruction},
        context: ScriptContext,
    ) {
        this.context = context
    }

    getScriptContext(): ScriptContext {
        return this.context
    }
    setDebugger(_callback: InterpreterDebuggerCallbacks): void {
        throw new Error("Method not implemented.")
    }
    runFunction(_module: string, _name: string, _argument: { [key: string]: EvaluatedValue; }): GeneratedError | GeneratedValue {
        throw new Error("Method not implemented.")
    }

}
