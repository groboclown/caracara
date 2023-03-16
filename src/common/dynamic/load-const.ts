// Store constant value into call memory.

import { ERROR__USER__CONST_NOT_FOUND, ERROR__USER__MODULE_NOT_FOUND, RuntimeError, ValidationProblem } from '../../errors'
import { createCoreSource, RuntimeSourcePosition } from '../../source'
import { GeneratedError, GeneratedValue, OpCodeInstruction, OpCodeResult, EvaluationKind, OpCodeFrame, ScriptContext, Module } from '../../vm-api/interpreter'
import { EvaluatedValue, VmOpCode } from '../../vm-api/memory-store'
import { RUNTIME_TYPE, VmType } from '../../vm-api/type-system'
import { validateMemoryValueString, memoryValueAsString, STRING_TYPE } from '../strings'

// OPCODE_LOAD_CONST opcode for the instruction.
export const OPCODE__LOAD_CONST: VmOpCode = 'cload'

// LoadConstOpCode lookup a dynamically named constant.
export class LoadConstOpCode implements OpCodeInstruction {
    readonly source: RuntimeSourcePosition
    readonly opcode = OPCODE__LOAD_CONST

    readonly argumentTypes = [
        {
            name: 'module-name',
            type: STRING_TYPE,
            evaluation: EvaluationKind.evaluated,
        },
        {
            name: 'constant-name',
            type: STRING_TYPE,
            evaluation: EvaluationKind.evaluated,
        },
    ]

    readonly generics = []

    readonly returnType = RUNTIME_TYPE

    constructor() {
        this.source = createCoreSource('core.const-lookup')
    }

    staticValidation(settings: OpCodeFrame): ValidationProblem[] {
        // Perform some evaluations if arguments are constant.
        if (settings.args[0].value !== undefined && settings.args[1].value !== undefined) {
            // Can perform full evaluation here.  The values are constant.
            const res1 = this.runtimeValidation(settings)
            if (res1.length > 0) {
                return res1
            }
            const res2 = this.getModuleConstant({
                source: settings.source,
                context: settings.context,
                moduleName: memoryValueAsString(settings.args[0]),
                constantName: memoryValueAsString(settings.args[1]),
                returnType: settings.returnType,
            })
            if (isValidationProblemList(res2)) {
                return res2
            }
            return []
        }

        if (settings.args[0].value !== undefined) {
            // Can perform a limited evaluation here.  The module name is constant.
            const res1 = validateMemoryValueString(settings, 0)
            if (res1 !== null) {
                return [res1]
            }
            const moduleName = memoryValueAsString(settings.args[0])
            const module = settings.context.modules[moduleName]
            if (isValidationProblemList(module)) {
                return module
            }
            return []
        }

        // Can't deduce any other smart validation.
        return []
    }

    runtimeValidation(settings: OpCodeFrame): ValidationProblem[] {
        // Perform full validation, as by this time it's required to be in
        //   a valid state.  Note that this essentially already runs the evaluation
        //   code.
        const res0 = validateMemoryValueString(settings, 0)
        const res1 = validateMemoryValueString(settings, 1)
        if (res0 !== null || res1 !== null) {
            return [res0, res1].filter((v) => v !== null) as ValidationProblem[]
        }
        const res2 = this.getModuleConstant({
            source: settings.source,
            context: settings.context,
            moduleName: memoryValueAsString(settings.args[0]),
            constantName: memoryValueAsString(settings.args[1]),
            returnType: settings.returnType,
        })
        if (isValidationProblemList(res2)) {
            return res2
        }
        return []
    }

    returnValidation(_settings: OpCodeFrame, _value: EvaluatedValue): ValidationProblem[] {
        // Return checking is all done by the evaluation, as that requires more information
        //   than what this context provides.
        return []
    }

    private getModule(args: {
        source: RuntimeSourcePosition,
        context: ScriptContext,
        moduleName: string,
    }): Module | ValidationProblem[] {
        const module = args.context.modules[args.moduleName]
        if (module === undefined) {
            return [
                {
                    source: args.source,
                    problemId: ERROR__USER__MODULE_NOT_FOUND,
                    parameters: {
                        'module': args.moduleName,
                    }
                } as ValidationProblem
            ]
        }
        return module
    }

    // getModuleConstant Perform complete error checking on the return value.
    private getModuleConstant(args: {
        source: RuntimeSourcePosition,
        context: ScriptContext,
        moduleName: string,
        constantName: string,
        returnType: VmType,
    }): GeneratedValue | ValidationProblem[] {
        // Look up the constant value.
        //   This requires detailed error checking, as the
        //   interpreter cannot know this information in advance.
        //   This could (should?) be put into the
        const module = this.getModule({
            source: args.source,
            context: args.context,
            moduleName: args.moduleName,
        })
        if (isValidationProblemList(module)) {
            return module
        }
        const constantVal = module.constants[args.constantName]
        if (constantVal === undefined) {
            return [
                {
                    source: args.source,
                    problemId: ERROR__USER__CONST_NOT_FOUND,
                    parameters: {
                        module: args.moduleName,
                        constant: args.constantName,
                    }
                } as ValidationProblem
            ]
        }

        // Enforce return type
        const typeMatch = args.context.types.enforceTypeMatch(
            args.source, constantVal.type, args.returnType,
        )
        if (typeMatch !== null) {
            return [
                {
                    source: typeMatch.source,
                    problemId: typeMatch.errorId,
                    parameters: typeMatch.parameters,
                } as ValidationProblem
            ]
        }
        return { value: constantVal.value } as GeneratedValue
    }

    evaluate(settings: OpCodeFrame): OpCodeResult {
        // Because the runtimeValidation has already run, we know it to be in
        //   a good state... but with optimizations enabled, that's not necessarily
        //   true.  There's enough variability here when the arguments are generated
        //   at runtime that we need to check everything again.  The
        //   argument values themselves, though, are "guaranteed" to be of the right
        //   type and evaluation status.
        const res = this.getModuleConstant({
            source: settings.source,
            context: settings.context,
            moduleName: memoryValueAsString(settings.args[0]),
            constantName: memoryValueAsString(settings.args[1]),
            returnType: settings.returnType,
        })
        if (isValidationProblemList(res)) {
            return toGeneratedError(res)
        }
        return res
    }
}


function isValidationProblemList(
    value: GeneratedValue | Module | ValidationProblem[],
): value is ValidationProblem[] {
    return Array.isArray(value) && value.length > 0
}

function toGeneratedError(value: ValidationProblem[]): GeneratedError {
    // Should be just 1...
    return {
        error: {
            source: value[0].source,
            errorId: value[0].problemId,
            parameters: value[0].parameters,
        } as RuntimeError
    } as GeneratedError
}
