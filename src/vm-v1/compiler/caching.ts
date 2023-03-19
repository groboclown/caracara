// A caching compiler.

import { ERROR__IMPL_INVALID_RETURN_CELL, ERROR__IMPL_NOT_CALLABLE } from "../../errors"
import { ValidationProblem, ValidationResult } from "../../errors/struct"
import { CallableValue } from "../../vm-api/memory-store"
import { CallingMemoryCell, ConstantRefMemoryCell, isCallingMemoryCell, isConstantRefMemoryCell, isIterableReferenceMemoryCell, isOpCodeMemoryCell, isStructureReferenceMemoryCell, IterableReferenceMemoryCell, MemoryCell, OpCodeMemoryCell, StructureReferenceMemoryCell } from "../../vm-api/memory-store/cell"
import { CALLABLE_ARGUMENT_MEMORY_INDEX, CALLABLE_RETURN_MEMORY_INDEX } from "../../vm-api/memory-store/value"
import { isVmCallableType, TypeStore } from "../../vm-api/type-system"
import { InternalMemoryValue } from "../memory"
import { createCallingCodeCall } from "./call-calling"
import { createConstantCall } from "./call-constant"
import { createIterableCall } from "./call-iterable"
import { createOpCodeCall } from "./call-opcode"
import { createStructureCall } from "./call-structure"
import { CallCompiler, CompiledCall } from "./defs"
import { CallConstruction } from "./internal"

// CachingCallCompiler Generates compiled calls assuming the same module consts and memory.
export class CachingCallCompiler implements CallCompiler {
    private cache: {[index: number]: ValidationResult<CompiledCall>} = {}
    private readonly typeStore: TypeStore

    constructor(
        typeStore: TypeStore,
    ) {
        this.typeStore = typeStore
    }

    compile(
        moduleMemory: InternalMemoryValue[],
        moduleConsts: { [id: string]: number; },
        callIndex: number,
    ): ValidationResult<CompiledCall> {
        if (this.cache[callIndex] !== undefined) {
            return this.cache[callIndex]
        }
        const callMem = moduleMemory[callIndex]
        if (!isVmCallableType(callMem.cell.type) || callMem.constant === undefined) {
            return {
                result: undefined,
                problems: [
                    {
                        source: callMem.cell.source,
                        problemId: ERROR__IMPL_NOT_CALLABLE,
                        parameters: {},
                    } as ValidationProblem
                ],
            }
        }
        const callable = callMem.constant as CallableValue
        const cc: CallConstruction<MemoryCell> = {
            callable,
            moduleMemory,
            moduleConsts,
            callIndex,
            argument: callable.cells[CALLABLE_ARGUMENT_MEMORY_INDEX],
            returns: callable.cells[CALLABLE_RETURN_MEMORY_INDEX],
            typeStore: this.typeStore,
        }
        return this.createCallFrom(cc)
    }

    private createCallFrom(cc: CallConstruction<MemoryCell>): ValidationResult<CompiledCall> {
        // If it's a constant ref, return that directly.
        if (isConstantRefMemoryCell(cc.returns)) {
            return this.storeRet(cc.callIndex, createConstantCall(cc as CallConstruction<ConstantRefMemoryCell>))
        }
        if (isStructureReferenceMemoryCell(cc.returns)) {
            return this.storeRet(cc.callIndex, createStructureCall(cc as CallConstruction<StructureReferenceMemoryCell>))
        }
        if (isIterableReferenceMemoryCell(cc.returns)) {
            return this.storeRet(cc.callIndex, createIterableCall(cc as CallConstruction<IterableReferenceMemoryCell>))
        }
        if (isOpCodeMemoryCell(cc.returns)) {
            return this.storeRet(cc.callIndex, createOpCodeCall(cc as CallConstruction<OpCodeMemoryCell>))
        }
        if (isCallingMemoryCell(cc.returns)) {
            return this.storeRet(cc.callIndex, createCallingCodeCall(cc as CallConstruction<CallingMemoryCell>))
        }

        // Anything else is an illegal cell value.
        // isExternalMemoryCell(cc.returns)
        return this.storeRet(cc.callIndex, {
            result: undefined,
            problems: [
                {
                    source: cc.callable.source,
                    problemId: ERROR__IMPL_INVALID_RETURN_CELL,
                    parameters: {
                        kind: cc.returns.kind,
                    },
                },
            ],
        })
    }

    private storeRet(index: number, ret: ValidationResult<CompiledCall>): ValidationResult<CompiledCall> {
        this.cache[index] = ret
        return ret
    }
}
