// Extract a sub-list from another list.

import { ValidationProblem, VALIDATION_OPCODE_ARGUMENT_VALUE } from '../../errors'
import { ValidationCollector } from '../helpers/validation'
import { GENERIC_T_TYPE, GENERIC_ITERABLE_T_TYPE } from '../helpers/type-generic'
import { INTEGER_TYPE } from '../numbers'
import { createCoreSource, RuntimeSourcePosition } from '../../source'
import { OpCodeFrame, OpCodeInstruction, EvaluationKind } from '../../vm-api/interpreter'
import { EvaluatedValue, MemoryFactory, OpCodeResult, VmOpCode } from '../../vm-api/memory-store'
import { VmGenericBindHint } from '../../vm-api/type-system'
import { isEvaluatedInteger, memoryValueAsInteger, validateMemoryValueInteger } from '../numbers/type-number'
import { validateReturnTypeIterable } from './type-iterable'

// OPCODE__SLICE Mneumonic for the instruction.
export const OPCODE__SLICE: VmOpCode = 'slice'

// SliceIterableOpCode Splits a finite length list into a sub-list.
//   If the requested slice is bigger than the list, then this returns only the
//   part of the list it can fill.
export class SliceIterableOpCode implements OpCodeInstruction {
    readonly source: RuntimeSourcePosition
    readonly opcode = OPCODE__SLICE
    argumentTypes = [
        {
            name: 'iterable',
            type: GENERIC_ITERABLE_T_TYPE,
            evaluation: EvaluationKind.shallow_evaluation,
        },
        {
            name: 'start',
            type: INTEGER_TYPE,
            evaluation: EvaluationKind.evaluated,
        },
        {
            name: 'end',
            type: INTEGER_TYPE,
            evaluation: EvaluationKind.evaluated,
        },

    ]
    generics = [
        {
            id: GENERIC_T_TYPE.genericId,
            bindHint: VmGenericBindHint.any,
        },
    ]
    returnType = GENERIC_T_TYPE

    constructor() {
        this.source = createCoreSource('core.iterable.slice')
    }

    staticValidation(settings: OpCodeFrame): ValidationProblem[] {
        return new ValidationCollector()
            .add(validateMemoryValueInteger(settings, 1, false))
            .add(validateMemoryValueInteger(settings, 2, false))
            .add(validateReturnTypeIterable(settings))
            .addCollector(this.startEndCheck(settings))
            .validations
    }

    runtimeValidation(settings: OpCodeFrame): ValidationProblem[] {
        return new ValidationCollector()
            .add(validateMemoryValueInteger(settings, 1, true))
            .add(validateMemoryValueInteger(settings, 2, true))
            .addCollector(this.startEndCheck(settings))
            .validations
    }

    private startEndCheck(settings: OpCodeFrame): ValidationCollector {
        const probs = new ValidationCollector()
        const start = settings.args[1].memoized
        const end = settings.args[2].memoized
        if (start !== undefined && isEvaluatedInteger(start)) {
            // start cannot be negative.
            if (start < 0) {
                probs.add({
                    source: settings.source,
                    problemId: VALIDATION_OPCODE_ARGUMENT_VALUE,
                    parameters: {
                        value: start,
                        reason: 'start cannot be negative',
                    },
                })
                // end cannot be before start, unless it's negative.
                if (end !== undefined && isEvaluatedInteger(end) && end < start && end > 0) {
                    probs.add({
                        source: settings.source,
                        problemId: VALIDATION_OPCODE_ARGUMENT_VALUE,
                        parameters: {
                            value: end,
                            reason: 'end is before start',
                        },
                    })
                }
            }
        }
        return probs
    }

    evaluate(settings: OpCodeFrame, factory: MemoryFactory): OpCodeResult {
        // Note that the returnType has already been verified in the static analysis to be an interable type.
        const list = settings.args[0]
        const start = memoryValueAsInteger(settings.args[1])
        const end = memoryValueAsInteger(settings.args[2])
        return factory.iterable.sub(list, start, end)
    }

    returnValidation(_settings: OpCodeFrame, _value: EvaluatedValue): ValidationProblem[] {
        return []
    }
}
