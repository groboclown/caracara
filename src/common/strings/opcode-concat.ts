// Concatenate two strings together.

import { ERROR__IMPL_RETURN_VALUE_TYPE, ValidationProblem } from '../../errors'
import { ValidationCollector } from '../helpers/validation'
import { createCoreSource, RuntimeSourcePosition } from '../../source'
import { OpCodeInstruction } from '../../vm-api/interpreter'
import { EvaluationKind, GeneratedValue, OpCodeFrame, OpCodeResult } from '../../vm-api/interpreter/instructions'
import { EvaluatedValue, VmOpCode } from '../../vm-api/memory-store'
import { validateMemoryValueString, memoryValueAsString, STRING_TYPE, isEvaluatedString } from './type-string'

// OPCODE__ADD_NUMBERS opcode for this operation.
export const OPCODE__CONCAT_STRINGS: VmOpCode = 'concat'

// OpCodeAddNumbers Add two numbers together.
export class OpCodeConcatStrings implements OpCodeInstruction {
    readonly source: RuntimeSourcePosition
    readonly opcode = OPCODE__CONCAT_STRINGS
    readonly argumentTypes = [
        {
            name: 'first',
            type: STRING_TYPE,
            evaluation: EvaluationKind.evaluated,
        },
        {
            name: 'second',
            type: STRING_TYPE,
            evaluation: EvaluationKind.evaluated,
        },
    ]
    readonly returnType = STRING_TYPE
    readonly generics = []

    constructor() {
        this.source = createCoreSource('core.strings.concat')
    }

    staticValidation(settings: OpCodeFrame): ValidationProblem[] {
        // Can perform checks on constant values.
        return new ValidationCollector()
            // At static time, the memory value does not need to exist.
            .add(validateMemoryValueString(settings, 0, false))
            .add(validateMemoryValueString(settings, 1, false))
            .validations
    }

    runtimeValidation(settings: OpCodeFrame): ValidationProblem[] {
        return new ValidationCollector()
            .add(validateMemoryValueString(settings, 0, true))
            .add(validateMemoryValueString(settings, 1, true))
            .validations
    }

    returnValidation(settings: OpCodeFrame, value: EvaluatedValue): ValidationProblem[] {
        if (!isEvaluatedString(value)) {
            return [
                {
                    source: settings.source,
                    problemId: ERROR__IMPL_RETURN_VALUE_TYPE,
                    parameters: {
                        expected: STRING_TYPE.internalType,
                        found: String(value),
                    }
                } as ValidationProblem
            ]
        }
        return []
    }

    evaluate(settings: OpCodeFrame): OpCodeResult {
        const arg0 = memoryValueAsString(settings.args[0])
        const arg1 = memoryValueAsString(settings.args[1])
        return {
            value: arg0 + arg1
        } as GeneratedValue
    }
}
