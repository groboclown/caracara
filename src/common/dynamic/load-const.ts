// Store constant value into call memory.

import { ERROR__USER__CONST_NOT_FOUND, ERROR__USER__MODULE_NOT_FOUND, RuntimeError, ValidationProblem } from '../../errors'
import { isRuntimeError } from '../../errors/struct'
import { createCoreSource, RuntimeSourcePosition } from '../../source'
import { GeneratedError, GeneratedValue, OpCodeInstruction, OpCodeResult, EvaluationKind, RunTimeSettings } from '../../vm-api/interpreter'
import { VmOpCode } from '../../vm-api/memory-store'
import { RUNTIME_TYPE } from '../../vm-api/type-system'
import { extractMemoryValueMetaType } from '../helpers/type-meta'
import { extractMemoryValueString, STRING_TYPE } from '../strings'

// OPCODE_LOAD_CONST opcode for the instruction.
export const OPCODE__LOAD_CONST: VmOpCode = 'cload'

// LoadConstOpCode lookup a dynamically named constant.
export class LoadConstOpCode implements OpCodeInstruction {
    readonly source: RuntimeSourcePosition
    readonly opcode = OPCODE__LOAD_CONST

    readonly argumentTypes = [
        {
            name: "module-name",
            type: STRING_TYPE,
            evaluation: EvaluationKind.evaluated,
        },
        {
            name: "constant-name",
            type: STRING_TYPE,
            evaluation: EvaluationKind.evaluated,
        },
    ]

    readonly generics = []

    readonly returnType = RUNTIME_TYPE

    constructor() {
        this.source = createCoreSource('core.const-lookup')
    }

    validate(): ValidationProblem[] {
        // Could perform some limited evaluations if arguments are constant.
        return []
    }

    evaluate(settings: RunTimeSettings): OpCodeResult {
        // Arguments are expected to be already matching the declaration.
        const moduleName = extractMemoryValueString(settings.source, 0, settings.args[0])
        if (isRuntimeError(moduleName)) {
            return { error: moduleName } as GeneratedError
        }
        const constantName = extractMemoryValueString(settings.source, 1, settings.args[1])
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
                    source: settings.source,
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
                    source: settings.source,
                    errorId: ERROR__USER__CONST_NOT_FOUND,
                    parameters: {
                        'module': moduleName,
                        'constant': constantName,
                    }
                } as RuntimeError
            } as GeneratedError
        }

        const typeMatch = settings.context.types.enforceTypeMatch(
            settings.source, constantVal.type, settings.returnType,
        )
        if (typeMatch !== null) {
            return { error: typeMatch } as GeneratedError
        }
        return { value: constantVal.value } as GeneratedValue
    }
}
