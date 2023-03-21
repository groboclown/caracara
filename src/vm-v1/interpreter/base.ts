// The base interpreter implementation

import { ValidationCollector } from "../../common/helpers"
import { Interpreter, InterpreterDebuggerCallbacks, ScriptContext } from "../../vm-api/interpreter"
import { StoredConstantValue } from "../../vm-api/interpreter/loaded-script"
import { EvaluatedValue, GeneratedError, GeneratedValue, MemoryValue } from "../../vm-api/memory-store"
import { isFunctionReducerValue, isGeneratedError, isGeneratedValue, isOpCodeReducerValue, isLazyValue, FunctionReducerValue, OpCodeReducerValue } from "../../vm-api/memory-store/returns"
import { isRuntimeAction, RuntimeAction } from "../compiler/defs"
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

    runFunction(module: string, name: string, argument: { [key: string]: StoredConstantValue }): Promise<GeneratedError | GeneratedValue> {
        const problems = new ValidationCollector()
        const actionRes = this.compiler.compile(module, name, argument, this.debugger)
        problems.add(actionRes.problems)
        if (actionRes.result === undefined) {
            return Promise.resolve({
                error: problems.asRuntimeError(),
            } as GeneratedError)
        }
        return this.runAction(actionRes.result)
    }

    private runAction(action: RuntimeAction): Promise<GeneratedError | GeneratedValue> {
        const prev = Promise.all(action.dependencies.map((d) => this.runAction(d)))
        return prev.then((values) => {
            const processed = this.processResults(values)
            if ((<GeneratedError>processed).error !== undefined) {
                return processed as GeneratedError
            }
            const res = action.compute((<{values: EvaluatedValue[]}>processed).values)
            if (isRuntimeAction(res)) {
                return this.runAction(res)
            } else if (isGeneratedValue(res) || isGeneratedError(res)) {
                return res
            } else if (isFunctionReducerValue(res)) {
                return this.runFunctionReducer(res)
            } else if (isOpCodeReducerValue(res)) {
                return this.runOpCodeReducer(res)
            } else if (isLazyValue(res)) {
                return this.evaluateMemoryValue(res.lazy)
            } else {
                throw new Error(`unsupported value type ${res}`)
            }
        })
    }

    private processResults(results: (GeneratedError | GeneratedValue)[]): GeneratedError | { values: EvaluatedValue[] } {
        const problems = new ValidationCollector()
        const values: EvaluatedValue[] = []
        results.forEach((res) => {
            if (isGeneratedError(res)) {
                problems.add(res.error)
            } else {
                values.push(res.value)
            }
        })
        if (problems.isErr()) {
            return { error: problems.asRuntimeError() }
        }
        return { values }
    }

    private runFunctionReducer(_reducer: FunctionReducerValue): Promise<GeneratedError | GeneratedValue> {
        // This will need to run evaluateMemoryValue on all the values, and as they resolve, run the
        // reducer on them.
        return Promise.reject(new Error(`Function reducer not supported yet.`))
    }

    private runOpCodeReducer(_reducer: OpCodeReducerValue): Promise<GeneratedError | GeneratedValue> {
        return Promise.reject(new Error(`OpCode reducer not supported yet.`))
    }

    private evaluateMemoryValue(memoryValue: MemoryValue): Promise<GeneratedError | GeneratedValue> {
        if (memoryValue.memoized !== undefined) {
            return Promise.resolve({ value: memoryValue.memoized })
        }
        return Promise.reject(new Error(`Evaluation not supported yet.`))
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
