// Some type validation

import { ValidationCollector } from "../../common/helpers";
import { ERROR__IMPL_MISSING_DECLARED_TYPE, ERROR__IMPL_MISSING_NATIVE_TYPE, ValidationProblem } from "../../errors";
import { OpCodeInstruction } from "../../vm-api/interpreter";
import { isVmNativeType, TypeStore, VmType } from "../../vm-api/type-system";

// validateHasNativeTypes Validate the type store contains all the internal type named native types
export function validateHasNativeTypes(
    expectedNativeTypes: string[],
    typeStore: TypeStore,
): ValidationProblem[] {
    const problems = new ValidationCollector()
    const existingNatives: {[name: string]: boolean} = {}
    typeStore.getTypeNames().forEach((name) => {
        const type = typeStore.getTypeByName(name)
        if (type !== undefined && isVmNativeType(type)) {
            existingNatives[type.internalType] = true
        }
    })
    expectedNativeTypes.forEach((name) => {
        if (existingNatives[name] === undefined) {
            problems.add({
                source: null,
                problemId: ERROR__IMPL_MISSING_NATIVE_TYPE,
                parameters: {
                    internalName: name,
                },
            } as ValidationProblem)
        }
    })
    return problems.validations
}

// validateTypeStore Ensure the type store contains only valid types.
export function validateTypeStore(typeStore: TypeStore): ValidationProblem[] {
    const problems = new ValidationCollector()

    typeStore.getTypeNames().forEach((name) => {
        const type = typeStore.getTypeByName(name)
        if (type === undefined) {
            problems.add({
                source: null,
                problemId: ERROR__IMPL_MISSING_DECLARED_TYPE,
                parameters: {
                    name,
                },
            } as ValidationProblem)
        }
    })

    return problems.validations
}
