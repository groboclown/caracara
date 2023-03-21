// Extract a key value from a structure.

import { RuntimeError, ValidationProblem, VM_MEMORY_TYPE_CONFUSION } from '../../errors'
import { createCoreSource, RuntimeSourcePosition } from '../../source'
import { OpCodeInstruction, EvaluationKind, OpCodeFrame } from '../../vm-api/interpreter'
import { EvaluatedValue, GeneratedError, LazyValue, OpCodeResult, StructuredValue, VmOpCode } from '../../vm-api/memory-store'
import { KeyOfValue } from '../../vm-api/memory-store/value'
import { VmGenericBindHint } from '../../vm-api/type-system'
import { GENERIC_S_TYPE, BOUND_KEYOF_S_TYPE, GENERIC_R_TYPE } from '../helpers/type-generic'

// OPCODE_GET_KEY opcode for the instruction.
export const OPCODE__GET_KEY: VmOpCode = 'kload'

// GetKeyOpCode retrieve a key's value from a structure.
export class GetKeyOpCode implements OpCodeInstruction {
    readonly source: RuntimeSourcePosition
    readonly opcode = OPCODE__GET_KEY

    readonly generics = [
        {
            id: 'S',
            bindHint: VmGenericBindHint.structure,
        },
        {
            id: 'R',
            bindHint: VmGenericBindHint.any,

            // the secret sauce...
            keyedTypeArgumentIndex: 1,
        },
    ]

    readonly argumentTypes = [
        {
            name: 'structure',
            type: GENERIC_S_TYPE,
            evaluation: EvaluationKind.shallow_evaluation,
        },
        {
            name: 'key',
            type: BOUND_KEYOF_S_TYPE,
            evaluation: EvaluationKind.evaluated,
        },
    ]

    readonly returnType = GENERIC_R_TYPE

    constructor() {
        this.source = createCoreSource('core.structures')
    }

    staticValidation(_settings: OpCodeFrame): ValidationProblem[] {
        // Could perform some limited evaluations if arguments are constant.
        return []
    }

    runtimeValidation(_settings: OpCodeFrame): ValidationProblem[] {
        // Could perform some limited evaluations if arguments are constant.
        return []
    }

    returnValidation(_settings: OpCodeFrame, _value: EvaluatedValue): ValidationProblem[] {
        // Could perform some limited evaluations if arguments are constant.
        return []
    }

    evaluate(settings: OpCodeFrame): OpCodeResult {
        // Arguments are expected to be already matching the declaration.
        const structure = settings.args[0].memoized as StructuredValue
        const key = settings.args[1].memoized as KeyOfValue
        const lazy = structure.get(key.key)
        if (lazy === undefined) {
            return {
                error: {
                    source: settings.source,
                    errorId: VM_MEMORY_TYPE_CONFUSION,
                    parameters: {
                        type: settings.args[0].cell.type.name,
                        key: key.key,
                    },
                } as RuntimeError
            } as GeneratedError
        }
        return { lazy } as LazyValue
    }
}
