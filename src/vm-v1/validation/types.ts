// Some type validation

import { ValidationCollector } from "../../common/helpers";
import { ERROR__IMPL_MISSING_NATIVE_TYPE, ValidationProblem } from "../../errors";
import { isVmNativeType, TypeStore } from "../../vm-api/type-system";

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
