// Declares the built-in integer simple type.

import { RuntimeError, VM_BUG_NON_EVALUATED_VALUE, VM_MEMORY_TYPE_CONFUSION } from '../../errors'
import { RuntimeSourcePosition } from '../../source'
import { EvaluatedValue, MemoryCell, MemoryValue, VmMemoryIndex } from '../../vm-api/memory-store'
import { isVmCallableType, isVmIterableType, isVmNativeType, isVmStructuredType, META_TYPE, VmType } from '../../vm-api/type-system'

export function isEvaluatedMetaType(value: EvaluatedValue): value is VmType {
    if  (typeof value !== 'object') {
        return false
    }
    // This is a very explicit check.  It could be faster.
    if (typeof (<VmType>value).name !== 'string') {
        return false
    }
    // VmTypes must be one of these four categories.
    const valt = value as VmType
    return (
        isVmNativeType(valt)
        || isVmIterableType(valt)
        || isVmStructuredType(valt)
        || isVmCallableType(valt)
    )
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

export function extractMemoryValueMetaType(source: RuntimeSourcePosition, index: VmMemoryIndex, value: MemoryValue): VmType | RuntimeError {
    if (value.value === undefined) {
        return {
            source,
            errorId: VM_BUG_NON_EVALUATED_VALUE,
            parameters: {
                index,
            },
        } as RuntimeError
    }
    if (!isMemoryValueMetaType(value)) {
        return {
            source,
            errorId: VM_MEMORY_TYPE_CONFUSION,
            parameters: {
                index,
                expected: META_TYPE.name,
                actual: value.cell.type.name,
            },
        } as RuntimeError
    }
    return value.value as VmType
}
