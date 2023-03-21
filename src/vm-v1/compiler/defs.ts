// Compiles the call cells into an internal, optimal representation.

import { ValidationResult } from '../../errors/struct'
import { InterpreterDebuggerCallbacks, OpCodeInstruction } from '../../vm-api/interpreter'
import { EvaluatedValue, OpCodeResult, VmOpCode } from '../../vm-api/memory-store'
import { MemoryFront, MemoryStore } from '../memory'
import { StoredConstantValue } from '../../vm-api/interpreter/loaded-script'

// CallCompiler A Just In Time compiler for the interpreter
export interface CallCompiler {
    // compile Compile the memory value at the call index.
    //   Call index is the memory store's memory value index.
    compile(
        moduleMemory: MemoryStore,
        callIndex: number,
    ): ValidationResult<CompiledCall>
}

// RuntimeAction The action that a compiled call constructs from invocation.
export interface RuntimeAction {
    readonly dependencies: RuntimeAction[]

    // Compute the operation, and include the results of the dependencies (ordered).
    //
    compute(dependencies: EvaluatedValue[]): OpCodeResult | RuntimeAction
}

// isRuntimeAction Type checker.
export function isRuntimeAction(value: OpCodeResult | RuntimeAction): value is RuntimeAction {
    return (<RuntimeAction>value).compute !== undefined
}

// CompiledCall A call that's been compiled down for simple execution.
export interface CompiledCall {
    // cellIndex Index in the memory cells.
    readonly cellIndex: number

    // constructCall Uses the argument and opcodes to construct a runtime action chain.
    constructCall(
        opcodes: {[mnemonic: VmOpCode]: OpCodeInstruction},
        localMemory: MemoryFront,
        argument: { [key: string]: StoredConstantValue },
        debuggerCallback: InterpreterDebuggerCallbacks,
    ): ValidationResult<RuntimeAction>
}
