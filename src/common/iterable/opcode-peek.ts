// Extract the first element from a list.

import { ValidationProblem } from '../../errors'
import { GENERIC_T_TYPE, GENERIC_ITERABLE_T_TYPE } from '../helpers/type-generic'
import { createCoreSource, RuntimeSourcePosition } from '../../source'
import { OpCodeFrame, OpCodeInstruction, EvaluationKind } from '../../vm-api/interpreter'
import { EvaluatedValue, IterableValue, LazyValue, MemoryValue, OpCodeResult, VmOpCode } from '../../vm-api/memory-store'
import { VmGenericBindHint } from '../../vm-api/type-system'

// OPCODE__PEEK Mneumonic for the instruction.
export const OPCODE__PEEK: VmOpCode = 'peek'

// PeekIterableOpCode Peeks the first element in an interable, or a default value if empty.
export class PeekIterableOpCode implements OpCodeInstruction {
    readonly source: RuntimeSourcePosition
    readonly opcode = OPCODE__PEEK
    argumentTypes = [
        {
            name: 'iterable',
            type: GENERIC_ITERABLE_T_TYPE,
            evaluation: EvaluationKind.shallow_evaluation,
        },
        {
            name: 'default',
            type: GENERIC_T_TYPE,
            evaluation: EvaluationKind.lazy,
        }
    ]
    generics = [
        {
            id: GENERIC_T_TYPE.genericId,
            bindHint: VmGenericBindHint.any,
        }
    ]
    returnType = GENERIC_T_TYPE

    constructor() {
        this.source = createCoreSource('core.iterable.peek')
    }

    staticValidation(_settings: OpCodeFrame): ValidationProblem[] {
        return []
    }

    runtimeValidation(_settings: OpCodeFrame): ValidationProblem[] {
        return []
    }

    evaluate(settings: OpCodeFrame): OpCodeResult {
        const list = settings.args[0].memoized as IterableValue
        const loaded: MemoryValue[] = []
        list.forEach((v) => {
            loaded.push(v)
            // Stop iterating over the values
            return true
        })
        if (loaded.length < 1) {
            // Empty list.  Return the default value.
            return {
                lazy: settings.args[0].memoized
            } as LazyValue
        }
        return {
            lazy: loaded[0]
        } as LazyValue
    }

    returnValidation(_settings: OpCodeFrame, _value: EvaluatedValue): ValidationProblem[] {
        return []
    }
}
