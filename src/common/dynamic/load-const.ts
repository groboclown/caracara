// Store constant value into call memory.

import { ERROR__USER__CONST_NOT_FOUND, ERROR__USER__MODULE_NOT_FOUND, RuntimeError, ValidationProblem } from '../../errors'
import { isRuntimeError } from '../../errors/struct'
import { createCoreSource, RuntimeSourcePosition } from '../../source'
import { GeneratedError, GeneratedValue, OpCodeInstruction, OpCodeResult, RequiresArgumentEvaluation, ScriptContext } from '../../vm-api/interpreter'
import { MemoryValue, VmOpCode } from '../../vm-api/memory-store'
import { RUNTIME_TYPE, VmType } from '../../vm-api/type-system'
import { extractMemoryValueMetaType } from '../helpers/type-meta'
import { extractMemoryValueString, STRING_TYPE } from '../strings'

// OPCODE_LOAD_CONST opcode for the instruction.
export const OPCODE__LOAD_CONST: VmOpCode = 'cload'

// LoadConstOpCode lookup a dynamically named constant.
export class LoadConstOpCode implements OpCodeInstruction {
    readonly source: RuntimeSourcePosition
    readonly opcode = OPCODE__LOAD_CONST

    readonly argumentTypes = [
        // module name
        STRING_TYPE,
        // constant name
        STRING_TYPE,
    ]

    readonly returnType = RUNTIME_TYPE

    constructor() {
        this.source = createCoreSource('core.const-lookup')
    }

    validate(): ValidationProblem[] {
        // Could perform some limited evaluations if arguments are constant.
        return []
    }

    evaluate(
        source: RuntimeSourcePosition,
        context: ScriptContext,
        args: MemoryValue[],
        returnType: VmType,
    ): OpCodeResult {
        if (args[0].value === undefined || args[1].value === undefined || args[2].value == undefined) {
            // Arguments must be evaluated.
            return {
                requires: args.filter((x: MemoryValue) => x.value === undefined)
            } as RequiresArgumentEvaluation
        }
        const moduleName = extractMemoryValueString(source, 0, args[0])
        if (isRuntimeError(moduleName)) {
            return { error: moduleName } as GeneratedError
        }
        const constantName = extractMemoryValueString(source, 1, args[1])
        if (isRuntimeError(constantName)) {
            return { error: constantName } as GeneratedError
        }
        const expectedType = extractMemoryValueMetaType(source, 2, args[2])
        if (isRuntimeError(expectedType)) {
            return { error: expectedType } as GeneratedError
        }

        // Look up the constant value.
        const module = context.modules[constantName]
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
