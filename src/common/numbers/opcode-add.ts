// Add numbers together.

import { ValidationProblem } from '../../errors'
import { isRuntimeError } from '../../errors/struct'
import { createCoreSource, RuntimeSourcePosition } from '../../source'
import { LoadTimeSettings, OpCodeInstruction } from '../../vm-api/interpreter'
import { EvaluationKind, GeneratedError, GeneratedValue, OpCodeResult, RunTimeSettings } from '../../vm-api/interpreter/instructions'
import { VmOpCode } from '../../vm-api/memory-store'
import { extractMemoryValueInteger, extractMemoryValueNumber, INTEGER_TYPE, NUMBER_TYPE } from './type-number'

// OPCODE__ADD_NUMBERS opcode for this operation.
export const OPCODE__ADD_NUMBERS: VmOpCode = 'nadd'

// OpCodeAddNumbers Add two numbers together.
export class OpCodeAddNumbers implements OpCodeInstruction {
    readonly source: RuntimeSourcePosition
    readonly opcode = OPCODE__ADD_NUMBERS
    readonly argumentTypes = [
        {
            name: "first",
            type: NUMBER_TYPE,
            evaluation: EvaluationKind.evaluated,
        },
        {
            name: "second",
            type: NUMBER_TYPE,
            evaluation: EvaluationKind.evaluated,
        },
    ]
    readonly returnType = NUMBER_TYPE
    readonly generics = []

    constructor() {
        this.source = createCoreSource('core.numbers.add')
    }

    validate(): ValidationProblem[] {
        // No additional checks necessary beyond the arugment count and type checks.
        return []
    }

    evaluate(settings: RunTimeSettings): OpCodeResult {
        const arg0 = extractMemoryValueNumber(settings, 0)
        if (isRuntimeError(arg0)) {
            return { error: arg0 } as GeneratedError
        }
        const arg1 = extractMemoryValueNumber(settings, 1)
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
    readonly argumentTypes = [
        {
            name: "first",
            type: INTEGER_TYPE,
            evaluation: EvaluationKind.evaluated,
        },
        {
            name: "second",
            type: INTEGER_TYPE,
            evaluation: EvaluationKind.evaluated,
        },
    ]
    readonly returnType = INTEGER_TYPE
    readonly generics = []

    constructor() {
        this.source = createCoreSource('core.integers.add')
    }

    validate(_settings: LoadTimeSettings): ValidationProblem[] {
        // No additional checks necessary beyond the arugment count and type checks.
        return []
    }

    evaluate(settings: RunTimeSettings): OpCodeResult {
        const arg0 = extractMemoryValueInteger(settings, 0)
        if (isRuntimeError(arg0)) {
            return { error: arg0 } as GeneratedError
        }
        const arg1 = extractMemoryValueInteger(settings, 1)
        if (isRuntimeError(arg1)) {
            return { error: arg1 } as GeneratedError
        }
        return {
            value: arg0 + arg1
        } as GeneratedValue
    }
}
