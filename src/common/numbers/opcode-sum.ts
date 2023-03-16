// Add numbers together.

import { ValidationProblem } from '../../errors'
import { createCoreSource, RuntimeSourcePosition } from '../../source'
import { OpCodeInstruction } from '../../vm-api/interpreter'
import { EvaluationKind, OpCodeResult, OpCodeFrame, ReducerValue } from '../../vm-api/interpreter/instructions'
import { EvaluatedValue, VmOpCode } from '../../vm-api/memory-store'
import { INTEGER_TYPE, NUMBER_TYPE, FINITE_INTEGER_ITERABLE_TYPE, FINITE_NUMBER_ITERABLE_TYPE } from './type-number'
import { OPCODE__ADD_INTEGERS, OPCODE__ADD_NUMBERS } from './opcode-add'

// OPCODE__SUM_NUMBERS opcode for this operation.
export const OPCODE__SUM_NUMBERS: VmOpCode = 'nsum'

// OpCodeSumNumbers Add numbers in a list via reduction.
export class OpCodeSumNumbers implements OpCodeInstruction {
    readonly source: RuntimeSourcePosition
    readonly opcode = OPCODE__SUM_NUMBERS
    readonly argumentTypes = [
        {
            name: 'items',
            type: FINITE_NUMBER_ITERABLE_TYPE,
            evaluation: EvaluationKind.lazy,
        },
        {
            name: 'initial',
            type: NUMBER_TYPE,
            evaluation: EvaluationKind.lazy,
        }
    ]
    readonly returnType = NUMBER_TYPE
    readonly generics = []

    constructor() {
        this.source = createCoreSource('core.numbers.sum')
    }

    staticValidation(_settings: OpCodeFrame): ValidationProblem[] {
        return []
    }

    runtimeValidation(_settings: OpCodeFrame): ValidationProblem[] {
        return []
    }

    evaluate(settings: OpCodeFrame): OpCodeResult {
        const iterable = settings.args[0]
        const initialValue = settings.args[1]
        return {
            opcode: OPCODE__ADD_NUMBERS,
            initialValue,
            iterable,
        } as ReducerValue
    }

    returnValidation(_settings: OpCodeFrame, _value: EvaluatedValue): ValidationProblem[] {
        return []
    }
}

// OPCODE__SUM_INTEGERS opcode for this operation.
export const OPCODE__SUM_INTEGERS: VmOpCode = 'isum'

// OpCodeSumIntegers Add integers in a list via reduction.
export class OpCodeSumIntegers implements OpCodeInstruction {
    readonly source: RuntimeSourcePosition
    readonly opcode = OPCODE__SUM_INTEGERS
    readonly argumentTypes = [
        {
            name: 'items',
            type: FINITE_INTEGER_ITERABLE_TYPE,
            evaluation: EvaluationKind.lazy,
        },
        {
            name: 'initial',
            type: INTEGER_TYPE,
            evaluation: EvaluationKind.lazy,
        }
    ]
    readonly returnType = INTEGER_TYPE
    readonly generics = []

    constructor() {
        this.source = createCoreSource('core.integers.sum')
    }

    staticValidation(_settings: OpCodeFrame): ValidationProblem[] {
        return []
    }

    runtimeValidation(_settings: OpCodeFrame): ValidationProblem[] {
        return []
    }

    evaluate(settings: OpCodeFrame): OpCodeResult {
        const iterable = settings.args[0]
        const initialValue = settings.args[1]
        return {
            opcode: OPCODE__ADD_INTEGERS,
            initialValue,
            iterable,
        } as ReducerValue
    }

    returnValidation(_settings: OpCodeFrame, _value: EvaluatedValue): ValidationProblem[] {
        return []
    }
}
