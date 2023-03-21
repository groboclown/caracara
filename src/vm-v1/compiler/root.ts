// A base compiler to call the real compiler.

import { ERROR__IMPL_NO_SUCH_CONSTANT } from "../../errors"
import { ValidationResult } from "../../errors/struct"
import { InterpreterDebuggerCallbacks, OpCodeInstruction } from "../../vm-api/interpreter"
import { StoredConstantValue } from "../../vm-api/interpreter/loaded-script"
import { VmOpCode } from "../../vm-api/memory-store"
import { TypeStore } from "../../vm-api/type-system"
import { MemoryStore } from "../memory"
import { LocalStackMemoryFront } from "../memory/stack-local"
import { CallCompiler, RuntimeAction } from "./defs"

// RootCompiler The base compiler that makes it easy for the interpreter to call.
export class RootCompiler {
    private readonly moduleMemory: MemoryStore
    private readonly types: TypeStore
    private readonly compiler: CallCompiler
    private readonly opcodes: {[mnemonic: VmOpCode]: OpCodeInstruction}

    constructor(
        moduleMemory: MemoryStore,
        types: TypeStore,
        opcodes: {[mnemonic: VmOpCode]: OpCodeInstruction},
        compiler: CallCompiler,
    ) {
        this.moduleMemory = moduleMemory
        this.types = types
        this.compiler = compiler
        this.opcodes = opcodes
    }

    compile(
        moduleName: string,
        callConstantName: string,
        argument: { [key: string]: StoredConstantValue },
        debuggerCallback: InterpreterDebuggerCallbacks,
    ): ValidationResult<RuntimeAction> {
        const constIndex = this.moduleMemory.lookupConstIndex(moduleName, callConstantName)
        if (constIndex === undefined) {
            return {
                result: undefined,
                problems: [
                    {
                        source: null,
                        problemId: ERROR__IMPL_NO_SUCH_CONSTANT,
                        parameters: {
                            module: moduleName,
                            constant: callConstantName,
                        },
                    },
                ]
            }
        }
        const callRes = this.compiler.compile(
            this.moduleMemory,
            constIndex,
        )
        if (callRes.result === undefined) {
            return {
                result: undefined,
                problems: callRes.problems,
            }
        }
        return callRes.result.constructCall(
            this.opcodes,
            this.createLocalMemoryManager(),
            argument,
            debuggerCallback,
        )
    }

    // createLocalMemoryManager Creates a memory manager for single call's "stack".
    private createLocalMemoryManager(): LocalStackMemoryFront {
        return new LocalStackMemoryFront(
            this.types, this.moduleMemory,
        )
    }
}
