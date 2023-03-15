// Extract a key value from a structure.

import { ERROR__USER__CONST_NOT_FOUND, ERROR__USER__MODULE_NOT_FOUND, RuntimeError, ValidationProblem } from '../../errors'
import { isRuntimeError } from '../../errors/struct'
import { createCoreSource, RuntimeSourcePosition } from '../../source'
import { GeneratedError, GeneratedValue, OpCodeInstruction, OpCodeResult, EvaluationKind, ScriptContext, RunTimeSettings } from '../../vm-api/interpreter'
import { MemoryValue, VmOpCode } from '../../vm-api/memory-store'
import { RUNTIME_TYPE, VmGenericBindHint, VmGenericRef, VmKeyOfType, VmType } from '../../vm-api/type-system'
import { extractMemoryValueMetaType } from '../helpers/type-meta'
import { GENERIC_S_TYPE, BOUND_KEYOF_S_TYPE, GENERIC_R_TYPE } from '../helpers/type-generic'
import { extractMemoryValueKeyOf } from './type-keyof'
import { extractMemoryValueString, STRING_TYPE } from '../strings'

// OPCODE_GET_KEY opcode for the instruction.
export const OPCODE__GET_KEY: VmOpCode = 'kload'

// GetKeyOpCode retrieve a key's value from a structure.
export class LoadConstOpCode implements OpCodeInstruction {
    readonly source: RuntimeSourcePosition
    readonly opcode = OPCODE__GET_KEY

    readonly generics = [
        {
            id: "S",
            bindHint: VmGenericBindHint.structure,
        },
        {
            id: "K",
            bindHint: VmGenericBindHint.keyof,
        },
        {
            id: "R",
            bindHint: VmGenericBindHint.any,
            keyedTypeArgumentIndex: 1,
        },
    ]

    readonly argumentTypes = [
        {
            name: "structure",
            type: GENERIC_S_TYPE,
            evaluation: EvaluationKind.shallow_evaluation,
        },
        {
            name: "key",
            type: BOUND_KEYOF_S_TYPE,
            evaluation: EvaluationKind.evaluated,
        },
    ]

    readonly returnType = GENERIC_R_TYPE

    constructor() {
        this.source = createCoreSource('core.structures')
    }

    validate(): ValidationProblem[] {
        // Could perform some limited evaluations if arguments are constant.
        return []
    }

    evaluate(settings: RunTimeSettings): OpCodeResult {
        // Arguments are expected to be already matching the declaration.
        const structure = extractMemoryValueString(settings.source, 0, settings.args[0])
        if (isRuntimeError(structure)) {
            return { error: structure } as GeneratedError
        }
        const constantName = extractMemoryValueKeyOf(settings.source, 1, settings.args[1])
        if (isRuntimeError(constantName)) {
            return { error: constantName } as GeneratedError
        }
        const expectedType = extractMemoryValueMetaType(settings.source, 2, settings.args[2])
        if (isRuntimeError(expectedType)) {
            return { error: expectedType } as GeneratedError
        }

        // Look up the constant value.
        //   This requires detailed error checking, as the
        //   interpreter cannot know this information in advance.
        const module = settings.context.modules[constantName]
        if (module === undefined) {
            return {
                error: {
                    source,
                    errorId: ERROR__USER__MODULE_NOT_FOUND,
                    parameters: {
                        'module': moduleName,
                    }
                } as RuntimeError
            } as GeneratedError
        }
        const constantVal = module.constants[constantName]
        if (constantVal === undefined) {
            return {
                error: {
                    source,
                    errorId: ERROR__USER__CONST_NOT_FOUND,
                    parameters: {
                        'module': moduleName,
                        'constant': constantName,
                    }
                } as RuntimeError
            } as GeneratedError
        }

        const typeMatch = context.types.enforceTypeMatch(
            source, constantVal.type, returnType,
        )
        if (typeMatch !== null) {
            return { error: typeMatch } as GeneratedError
        }
        return { value: constantVal.value } as GeneratedValue
    }
}
