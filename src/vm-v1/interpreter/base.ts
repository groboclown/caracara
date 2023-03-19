// The base interpreter implementation

import { ValidationCollector } from "../../common/helpers"
import { Interpreter, InterpreterDebuggerCallbacks, ScriptContext } from "../../vm-api/interpreter"
import { StoredConstantValue } from "../../vm-api/interpreter/loaded-script"
import { GeneratedError, GeneratedValue } from "../../vm-api/memory-store"
import { RuntimeAction } from "../compiler/defs"
import { RootCompiler } from "../compiler/root"

export class InterpreterImpl implements Interpreter {
    private context: ScriptContext
    private compiler: RootCompiler
    private debugger: InterpreterDebuggerCallbacks = new NoOpDebugger()

    constructor(
        context: ScriptContext,
        compiler: RootCompiler,
    ) {
        this.context = context
        this.compiler = compiler
    }

    getScriptContext(): ScriptContext {
        return this.context
    }

    setDebugger(callback: InterpreterDebuggerCallbacks) {
        if (this.debugger !== null) {
            throw new Error("already registered a debugger")
        }
        this.debugger = callback
    }

    runFunction(module: string, name: string, argument: { [key: string]: StoredConstantValue }): GeneratedError | GeneratedValue {
        const problems = new ValidationCollector()
        const actionRes = this.compiler.compile(module, name, argument, this.debugger)
        problems.add(actionRes.problems)
        if (actionRes.result === undefined) {
            return {
                error: problems.asRuntimeError(),
            } as GeneratedError
        }
        return this.runAction(actionRes.result)
    }

    private runAction(_action: RuntimeAction): GeneratedError | GeneratedValue {
        throw new Error("Not implemented yet")
    }
}

class NoOpDebugger implements InterpreterDebuggerCallbacks {
    log(): void {}
    generatedError(): void {}
    functionStarted(): void {}
    functionReturned(): void {}
    opCodeEvaluationStart(): void {}
    opCodeEvaluationResolved(): void {}
}
