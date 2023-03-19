// A base compiler to call the real compiler.

import { ERROR__IMPL_NO_SUCH_CONSTANT } from "../../errors"
import { ValidationResult } from "../../errors/struct"
import { InterpreterDebuggerCallbacks, OpCodeInstruction } from "../../vm-api/interpreter"
import { StoredConstantValue } from "../../vm-api/interpreter/loaded-script"
import { VmOpCode } from "../../vm-api/memory-store"
import { createModuleConstantId, InternalMemoryValue, MemoryValueManager } from "../memory"
import { CallCompiler, RuntimeAction } from "./defs"

// RootCompiler The base compiler that makes it easy for the interpreter to call.
export class RootCompiler {
    private readonly moduleMemory: InternalMemoryValue[]
    private readonly moduleConsts: {[id: string]: number}
    private readonly compiler: CallCompiler
    private readonly opcodes: {[mnemonic: VmOpCode]: OpCodeInstruction}

    constructor(
        moduleMemory: InternalMemoryValue[],
        moduleConsts: {[id: string]: number},
        opcodes: {[mnemonic: VmOpCode]: OpCodeInstruction},
        compiler: CallCompiler,
    ) {
        this.moduleMemory = moduleMemory
        this.moduleConsts = moduleConsts
        this.compiler = compiler
        this.opcodes = opcodes
    }

    compile(
        moduleName: string,
        callConstantName: string,
        argument: { [key: string]: StoredConstantValue },
        debuggerCallback: InterpreterDebuggerCallbacks,
    ): ValidationResult<RuntimeAction> {
        const constId = createModuleConstantId(moduleName, callConstantName)
        const constIndex = this.moduleConsts[constId]
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
            this.moduleConsts,
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

    private createLocalMemoryManager(): MemoryValueManager {
        throw new Error("not implemented yet")
    }
}
