// Validating OpCodes

import { ValidationCollector } from "../../common/helpers";
import { ERROR__IMPL_ARGUMENT_EVAL_SHALLOW_SIMPLE, ERROR__IMPL_ARGUMENT_REQUIRES_STRUCT_BINDING, ERROR__IMPL_ARGUMENT_RUNTIME_TYPE, ERROR__IMPL_DUPLICATE_GENERIC_BINDING, ERROR__IMPL_GENERIC_BINDING_DEEP, ERROR__IMPL_GENERIC_BINDING_FROM_TYPE, ERROR__IMPL_GENERIC_BINDING_INDEX, ERROR__IMPL_GENERIC_BINDING_KEYED_TYPE, ERROR__IMPL_GENERIC_BINDING_STATE, ERROR__IMPL_UNBOUND_GENERIC, ValidationProblem } from "../../errors";
import { OpCodeInstruction } from "../../vm-api/interpreter";
import { EvaluationKind, OpCodeArgument, OpCodeGenericBinding } from "../../vm-api/interpreter/instructions";
import { isVmGenericRef, isVmIterableType, isVmKeyOfType, isVmNativeType, isVmStructuredType, META_TYPE, RUNTIME_TYPE, VmGenericBindHint, VmGenericRef, VmType } from "../../vm-api/type-system";

// validateOpCode Validate the internal construction of the opcode.
export function validateOpCode(opcode: OpCodeInstruction): ValidationProblem[] {
    // The opcode validation is essentially checking types.
    if (opcode.generics.length > 0) {
        return validateOpCodeGenerics(opcode)
    }
    return validateOpCodeStd(opcode)
}

// validateOpCodeGenerics Validate generic bound opcodes.
export function validateOpCodeGenerics(opcode: OpCodeInstruction): ValidationProblem[] {
    const problems = new ValidationCollector()
    const bindings = getBindings(opcode, problems)

    // Check arguments
    for (let i = 0; i < opcode.argumentTypes.length; i++) {
        validateGenericArg(opcode, i, opcode.argumentTypes[i], bindings, problems)
    }

    // Check return
    validateGenericReturn(opcode, bindings, problems)

    return problems.validations
}

// getBindings Get the collated generic bindings for the opcode, with validation checks.
function getBindings(
    opcode: OpCodeInstruction, problems: ValidationCollector,
): {[id: string]: OpCodeGenericBinding} {
    let bindings: {[id: string]: OpCodeGenericBinding} = {}
    opcode.generics.forEach((g) => {
        // Duplicate check
        if (bindings[g.id] !== undefined) {
            problems.add(createBindingProblem(ERROR__IMPL_DUPLICATE_GENERIC_BINDING, opcode, g))
        } else {
            bindings[g.id] = g
        }

        // State check
        //   Can't have both from + keyed set.
        if (g.fromArgumentIndex !== undefined && g.keyedTypeArgumentIndex !== undefined) {
            problems.add(createBindingProblem(ERROR__IMPL_GENERIC_BINDING_STATE, opcode, g))
        }

        // from argument check.
        if (g.fromArgumentIndex !== undefined) {
            if (g.fromArgumentIndex < 0 || g.fromArgumentIndex >= opcode.argumentTypes.length) {
                problems.add(createBindingProblem(ERROR__IMPL_GENERIC_BINDING_INDEX, opcode, g))
            } else {
                const argType = opcode.argumentTypes[g.fromArgumentIndex].type
                if (isVmGenericRef(argType)) {
                    // Can't have generic -> generic.  Just reference the primary generic.
                    problems.add(createBindingProblem(ERROR__IMPL_GENERIC_BINDING_DEEP, opcode, g))
                } else {
                    // The referenced argument must be a meta type.
                    if (!isVmNativeType(argType) || argType.internalType !== META_TYPE.internalType) {
                        problems.add(createBindingProblem(ERROR__IMPL_GENERIC_BINDING_FROM_TYPE, opcode, g))
                    }
                }
            }
        }

        // keyed type check.
        if (g.keyedTypeArgumentIndex !== undefined) {
            if (g.keyedTypeArgumentIndex < 0 || g.keyedTypeArgumentIndex >= opcode.argumentTypes.length) {
                problems.add(createBindingProblem(ERROR__IMPL_GENERIC_BINDING_INDEX, opcode, g))
            } else {
                const argType = opcode.argumentTypes[g.keyedTypeArgumentIndex].type
                if (isVmGenericRef(argType)) {
                    // Can't have generic -> generic.  It should instead be a keyof with a bound generic.
                    problems.add(createBindingProblem(ERROR__IMPL_GENERIC_BINDING_DEEP, opcode, g))
                } else {
                    // The referenced argument must be a keyof.
                    if (!isVmKeyOfType(argType)) {
                        problems.add(createBindingProblem(ERROR__IMPL_GENERIC_BINDING_KEYED_TYPE, opcode, g))
                    }
                }
            }
        }
    })
    return bindings
}

function validateGenericArg(
    opcode: OpCodeInstruction,
    index: number,
    arg: OpCodeArgument,
    bindings: {[id: string]: OpCodeGenericBinding},
    problems: ValidationCollector,
) {
    const type = arg.type
    if (isVmGenericRef(type)) {
        validateGenericRefArg(opcode, index, arg, bindings, type, problems)
        return
    }

    // Runtime Type check.
    //   Only usable in return types.
    if (isRuntimeType(type)) {
        problems.add(createArgumentProblem(ERROR__IMPL_ARGUMENT_RUNTIME_TYPE, opcode, index, arg))
    }

    // Evaluation check.
    //   Shalow evaluation is only applicable to iterable and structured types.
    if (
        arg.evaluation === EvaluationKind.shallow_evaluation
        && !(isVmIterableType(type) || isVmStructuredType(type))
    ) {
        problems.add(createArgumentProblem(ERROR__IMPL_ARGUMENT_EVAL_SHALLOW_SIMPLE, opcode, index, arg))
    }

    // Binding checks.
    if (isVmIterableType(type) && isVmGenericRef(type.valueType)) {
        validateGenericRefArg(opcode, index, arg, bindings, type.valueType, problems)
    }
    if (isVmKeyOfType(type) && isVmGenericRef(type.structureSource)) {
        validateGenericRefArg(opcode, index, arg, bindings, type.structureSource, problems)
        // Additionally, the binding hint for the structure source generic should be structure.
        if (type.structureSource.bindHint !== VmGenericBindHint.structure) {
            problems.add(createArgumentProblem(ERROR__IMPL_ARGUMENT_REQUIRES_STRUCT_BINDING, opcode, index, arg))
        }
        const bind = bindings[type.structureSource.genericId]
        // undef error check already performed
        if (bind !== undefined && bind.bindHint !== VmGenericBindHint.structure) {
            // subtly different from the above error.  Maybe a different error id?
            problems.add(createArgumentProblem(ERROR__IMPL_ARGUMENT_REQUIRES_STRUCT_BINDING, opcode, index, arg))
        }
    }
}

function validateGenericReturn(
    opcode: OpCodeInstruction,
    bindings: {[id: string]: OpCodeGenericBinding},
    problems: ValidationCollector,
) {
    const retType = opcode.returnType
    if (isVmGenericRef(retType)) {
        validateGenericRefReturn(opcode, bindings, retType, problems)
        return
    }

    // Runtime Type check.
    // ... it's okay for return types to be runtime types.

    // Binding checks.
    if (isVmIterableType(retType) && isVmGenericRef(retType.valueType)) {
        validateGenericRefReturn(opcode, bindings, retType.valueType, problems)
    }
    if (isVmKeyOfType(retType) && isVmGenericRef(retType.structureSource)) {
        validateGenericRefReturn(opcode, bindings, retType.structureSource, problems)
        // Additionally, the binding hint for the structure source generic should be structure.
        if (retType.structureSource.bindHint !== VmGenericBindHint.structure) {
            problems.add(createReturnProblem(ERROR__IMPL_ARGUMENT_REQUIRES_STRUCT_BINDING, opcode))
        }
        const bind = bindings[retType.structureSource.genericId]
        // undef error check already performed
        if (bind !== undefined && bind.bindHint !== VmGenericBindHint.structure) {
            // subtly different from the above error.  Maybe a different error id?
            problems.add(createReturnProblem(ERROR__IMPL_ARGUMENT_REQUIRES_STRUCT_BINDING, opcode))
        }
    }
}

function validateGenericRefArg(
    opcode: OpCodeInstruction,
    index: number,
    arg: OpCodeArgument,
    bindings: {[id: string]: OpCodeGenericBinding},
    type: VmGenericRef,
    problems: ValidationCollector,
) {
    if (bindings[type.genericId] === undefined) {
        problems.add(createArgumentProblem(ERROR__IMPL_UNBOUND_GENERIC, opcode, index, arg))
    }
}

function validateGenericRefReturn(
    opcode: OpCodeInstruction,
    bindings: {[id: string]: OpCodeGenericBinding},
    type: VmGenericRef,
    problems: ValidationCollector,
) {
    if (bindings[type.genericId] === undefined) {
        problems.add(createReturnProblem(ERROR__IMPL_UNBOUND_GENERIC, opcode))
    }
}

// validateOpCodeStd Validate non-generic opcodes.
export function validateOpCodeStd(opcode: OpCodeInstruction): ValidationProblem[] {
    const problems = new ValidationCollector()

    // Check arguments
    for (let i = 0; i < opcode.argumentTypes.length; i++) {
        validateStdArg(opcode, i, opcode.argumentTypes[i], problems)
    }

    // Check return
    validateStdReturn(opcode, problems)

    return problems.validations
}

function validateStdArg(
    opcode: OpCodeInstruction,
    index: number,
    arg: OpCodeArgument,
    problems: ValidationCollector,
) {
    const type = arg.type
    validateNotGeneric(
        opcode, type, {
            position: "argument",
            argIndex: index,
            argName: arg.name || "<unset>",
        }, problems
    )
    if (isVmGenericRef(type)) {
        // already added errors.
        return
    }

    // Evaluation check.
    //   Shalow evaluation is only applicable to iterable and structured types.
    if (
        arg.evaluation === EvaluationKind.shallow_evaluation
        && !(isVmIterableType(type) || isVmStructuredType(type))
    ) {
        problems.add(createArgumentProblem(ERROR__IMPL_ARGUMENT_EVAL_SHALLOW_SIMPLE, opcode, index, arg))
    }
}

function validateStdReturn(opcode: OpCodeInstruction, problems: ValidationCollector) {
    const retType = opcode.returnType
    validateNotGeneric(
        opcode, retType, {
            position: "return",
        }, problems
    )
}

function validateNotGeneric(
    opcode: OpCodeInstruction,
    type: VmType | VmGenericRef,
    parameters: { [key: string]: string | number },
    problems: ValidationCollector,
) {
    if (isVmGenericRef(type)) {
        problems.add(createUnboundProblem(opcode, parameters))
        return
    }
    // Binding checks.
    if (isVmIterableType(type) && isVmGenericRef(type.valueType)) {
        problems.add(createUnboundProblem(opcode, parameters))
    }
    if (isVmKeyOfType(type) && isVmGenericRef(type.structureSource)) {
        problems.add(createUnboundProblem(opcode, parameters))
    }
}

function isRuntimeType(type: VmType): boolean {
    return (
        isVmNativeType(type)
        && type.internalType === RUNTIME_TYPE.internalType
    )
}

function createBindingProblem(
    problemId: number, opcode: OpCodeInstruction, binding: OpCodeGenericBinding,
): ValidationProblem {
    return {
        source: null,
        problemId,
        parameters: {
            opcode: opcode.opcode,
            genericId: binding.id,
        },
    } as ValidationProblem
}

function createArgumentProblem(
    problemId: number,
    opcode: OpCodeInstruction,
    index: number,
    arg: OpCodeArgument,
): ValidationProblem {
    return {
        source: null,
        problemId,
        parameters: {
            opcode: opcode.opcode,
            position: "argument",
            argIndex: index,
            argName: arg.name || "<unset>",
        }
    } as ValidationProblem
}

function createReturnProblem(
    problemId: number,
    opcode: OpCodeInstruction,
): ValidationProblem {
    return {
        source: null,
        problemId,
        parameters: {
            opcode: opcode.opcode,
            position: "return",
        }
    } as ValidationProblem
}

function createUnboundProblem(
    opcode: OpCodeInstruction,
    parameters: { [key: string]: string | number },
): ValidationProblem {
    return {
        source: null,
        problemId: ERROR__IMPL_UNBOUND_GENERIC,
        parameters: {
            opcode: opcode.opcode,
            ...parameters,
        }
    } as ValidationProblem
}
