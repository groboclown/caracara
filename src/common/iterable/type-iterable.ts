// Iterable types and values.

import { ValidationProblem, VM_MEMORY_TYPE_CONFUSION } from '../../errors'
import { OpCodeFrame } from '../../vm-api/interpreter'
import { isVmIterableType } from '../../vm-api/type-system'

// validateTypeIterable Ensure the type of the memory at the position is iterable
export function validateReturnTypeIterable(
    settings: OpCodeFrame,
): ValidationProblem | null {
    if (!isVmIterableType(settings.returnType)) {
        return {
            source: settings.source,
            problemId: VM_MEMORY_TYPE_CONFUSION,
            parameters: {
                index: "return",
            },
        } as ValidationProblem
    }
    return null
}
