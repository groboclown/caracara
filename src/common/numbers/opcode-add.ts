// Add numbers together.

import { ValidationProblem } from '../../errors'
import { isRuntimeError } from '../../errors/struct'
import { createCoreSource, RuntimeSourcePosition } from '../../source'
import { OpCodeInstruction, ScriptContext } from '../../vm-api/interpreter'
import { GeneratedError, GeneratedValue, OpCodeResult, RequiresArgumentEvaluation } from '../../vm-api/interpreter/instructions'
import { MemoryValue, VmOpCode } from '../../vm-api/memory-store'
import { extractMemoryValueInteger, extractMemoryValueNumber, INTEGER_TYPE, NUMBER_TYPE } from './type-number'

// OPCODE__ADD_NUMBERS opcode for this operation.
export const OPCODE__ADD_NUMBERS: VmOpCode = 'nadd'

// OpCodeAddNumbers Add two numbers together.
export class OpCodeAddNumbers implements OpCodeInstruction {
    readonly source: RuntimeSourcePosition
    readonly opcode = OPCODE__ADD_NUMBERS
    readonly argumentTypes = [NUMBER_TYPE, NUMBER_TYPE]
    readonly returnType = NUMBER_TYPE

    constructor() {
        this.source = createCoreSource('core.numbers.add')
    }

    validate(): ValidationProblem[] {
        // No additional checks necessary beyond the arugment count and type checks.
        return []
    }

    evaluate(
        source: RuntimeSourcePosition,
        _context: ScriptContext, args: MemoryValue[],
    ): OpCodeResult {
        if (args[0].value === undefined || args[1].value === undefined) {
            // Arguments must be evaluated.
            return {
                requires: args.filter((x: MemoryValue) => x.value === undefined)
            } as RequiresArgumentEvaluation
        }
        const arg0 = extractMemoryValueNumber(source, 0, args[0])
        if (isRuntimeError(arg0)) {
            return { error: arg0 } as GeneratedError
        }
        const arg1 = extractMemoryValueNumber(source, 1, args[1])
        if (isRuntimeError(arg1)) {
            return { error: arg1 } as GeneratedError
        }
        return {
            value: arg0 + arg1
        } as GeneratedValue
    }
}

// OPCODE__ADD_INTEGERS opcode for this operation.
export const OPCODE__ADD_INTEGERS: VmOpCode = 'iadd'

// OpCodeAddNumbers Add two integers together.
export class OpCodeAddIntegers implements OpCodeInstruction {
    readonly source: RuntimeSourcePosition
    readonly opcode = OPCODE__ADD_INTEGERS
    readonly argumentTypes = [INTEGER_TYPE, INTEGER_TYPE]
    readonly returnType = INTEGER_TYPE

    constructor() {
        this.source = createCoreSource('core.integers.add')
    }

    validate(): ValidationProblem[] {
        // No additional checks necessary beyond the arugment count and type checks.
        return []
    }

    evaluate(
        source: RuntimeSourcePosition,
        _context: ScriptContext, args: MemoryValue[],
    ): OpCodeResult {
        if (args[0].value === undefined || args[1].value === undefined) {
            // Arguments must be evaluated.
            return {
                requires: args.filter((x: MemoryValue) => x.value === undefined)
            } as RequiresArgumentEvaluation
        }
        const arg0 = extractMemoryValueInteger(source, 0, args[0])
        if (isRuntimeError(arg0)) {
            return { error: arg0 } as GeneratedError
        }
        const arg1 = extractMemoryValueInteger(source, 1, args[1])
        if (isRuntimeError(arg1)) {
            return { error: arg1 } as GeneratedError
        }
        return {
            value: arg0 + arg1
        } as GeneratedValue
    }
}
