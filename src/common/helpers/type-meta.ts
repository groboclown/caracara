// Declares the built-in integer simple type.

import { ERROR__USER__UNKOWN_TYPE, ValidationProblem, VM_BUG_NON_EVALUATED_VALUE, VM_MEMORY_TYPE_CONFUSION } from '../../errors'
import { OpCodeFrame } from '../../vm-api/interpreter'
import { EvaluatedValue, MemoryCell, MemoryValue, VmMemoryIndex } from '../../vm-api/memory-store'
import { isVmNativeType, META_TYPE, VmType } from '../../vm-api/type-system'

// createEvaluatedMetaType Create an evaluated value that is of META_TYPE
export function createEvaluatedMetaType(typeName: string): EvaluatedValue {
    return typeName
}

// isEvaluatedMetaType Cursory glance into the value to see if it smells like a META_TYPE value
export function isEvaluatedMetaType(value: EvaluatedValue): value is VmType {
    return typeof value === 'string'
}

export function isMemoryCellMetaType(value: MemoryCell): boolean {
    return isVmNativeType(value.type) && value.type.internalType === META_TYPE.internalType
}

export function isMemoryValueMetaType(value: MemoryValue): boolean {
    if (!isMemoryCellMetaType(value.cell)) {
        return false
    }
    if (value.value === undefined) {
        // could be!
        return true
    }
    return isEvaluatedMetaType(value.value)
}

export function validateMemoryValueMetaType(
    settings: OpCodeFrame,
    index: VmMemoryIndex,
    requiresEvaluation = true,
): ValidationProblem | null {
    const value = settings.args[index]
    if (value.value === undefined) {
        if (!requiresEvaluation) {
            return null
        }
        return {
            source: settings.source,
            problemId: VM_BUG_NON_EVALUATED_VALUE,
            parameters: {
                index,
            },
        } as ValidationProblem
    }
    if (!isMemoryValueMetaType(value)) {
        return {
            source: settings.source,
            problemId: VM_MEMORY_TYPE_CONFUSION,
            parameters: {
                index,
                expected: META_TYPE.name,
                actual: value.cell.type.name,
            },
        } as ValidationProblem
    }
    if (settings.context.types.getTypeByName(value.value as string) === undefined) {
        return {
            source: settings.source,
            problemId: ERROR__USER__UNKOWN_TYPE,
            parameters: {
                index,
                name: value.value as string,
            },
        }
    }
    return null
}

// memoryValueAsMetaType Quickly extract the already validated value as a VmType.
export function memoryValueAsMetaType(settings: OpCodeFrame, index: VmMemoryIndex): VmType {
    return settings.context.types.getTypeByName(settings.args[index].value as string) as VmType
}
