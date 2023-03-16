// Add numbers together.

import { ValidationProblem } from '../../errors'
import { ValidationCollector } from '../helpers/validation'
import { createCoreSource, RuntimeSourcePosition } from '../../source'
import { OpCodeInstruction } from '../../vm-api/interpreter'
import { EvaluationKind, GeneratedValue, OpCodeResult, OpCodeFrame } from '../../vm-api/interpreter/instructions'
import { EvaluatedValue, VmOpCode } from '../../vm-api/memory-store'
import { memoryValueAsInteger, validateMemoryValueNumber, INTEGER_TYPE, NUMBER_TYPE, validateMemoryValueInteger, memoryValueAsNumber } from './type-number'

// OPCODE__ADD_NUMBERS opcode for this operation.
export const OPCODE__ADD_NUMBERS: VmOpCode = 'nadd'

// OpCodeAddNumbers Add two numbers together.
export class OpCodeAddNumbers implements OpCodeInstruction {
    readonly source: RuntimeSourcePosition
    readonly opcode = OPCODE__ADD_NUMBERS
    readonly argumentTypes = [
        {
            name: 'first',
            type: NUMBER_TYPE,
            evaluation: EvaluationKind.evaluated,
        },
        {
            name: 'second',
            type: NUMBER_TYPE,
            evaluation: EvaluationKind.evaluated,
        },
    ]
    readonly returnType = NUMBER_TYPE
    readonly generics = []

    constructor() {
        this.source = createCoreSource('core.numbers.add')
    }

    staticValidation(settings: OpCodeFrame): ValidationProblem[] {
        return new ValidationCollector()
            .add(validateMemoryValueNumber(settings, 0, false))
            .add(validateMemoryValueNumber(settings, 1, false))
            .validations
    }

    runtimeValidation(settings: OpCodeFrame): ValidationProblem[] {
        return new ValidationCollector()
            .add(validateMemoryValueNumber(settings, 0, true))
            .add(validateMemoryValueNumber(settings, 1, true))
            .validations
    }

    evaluate(settings: OpCodeFrame): OpCodeResult {
        const arg0 = memoryValueAsNumber(settings.args[0])
        const arg1 = memoryValueAsNumber(settings.args[1])
        return {
            value: arg0 + arg1
        } as GeneratedValue
    }

    returnValidation(_settings: OpCodeFrame, _value: EvaluatedValue): ValidationProblem[] {
        return []
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
            name: 'first',
            type: INTEGER_TYPE,
            evaluation: EvaluationKind.evaluated,
        },
        {
            name: 'second',
            type: INTEGER_TYPE,
            evaluation: EvaluationKind.evaluated,
        },
    ]
    readonly returnType = INTEGER_TYPE
    readonly generics = []

    constructor() {
        this.source = createCoreSource('core.integers.add')
    }


    staticValidation(settings: OpCodeFrame): ValidationProblem[] {
        return new ValidationCollector()
            .add(validateMemoryValueInteger(settings, 0, false))
            .add(validateMemoryValueInteger(settings, 1, false))
            .validations
    }

    runtimeValidation(settings: OpCodeFrame): ValidationProblem[] {
        return new ValidationCollector()
            .add(validateMemoryValueInteger(settings, 0, true))
            .add(validateMemoryValueInteger(settings, 1, true))
            .validations
    }

    evaluate(settings: OpCodeFrame): OpCodeResult {
        const arg0 = memoryValueAsInteger(settings.args[0])
        const arg1 = memoryValueAsInteger(settings.args[1])
        return {
            value: arg0 + arg1
        } as GeneratedValue
    }

    returnValidation(_settings: OpCodeFrame, _value: EvaluatedValue): ValidationProblem[] {
        return []
    }
}
