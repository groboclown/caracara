// Creates internal memory reporesentations from constant values.

import { ValidationCollector } from "../../common/helpers"
import { ERROR__IMPL_CONSTANT_GENERIC_TYPE, ERROR__IMPL_TYPE_VALUE_MISMATCH, ERROR__IMPL_UNKNOWN_TYPE_CATEGORY } from "../../errors"
import { ValidationProblem, ValidationResult } from "../../errors/struct"
import { StoredConstantValue } from "../../vm-api/interpreter/loaded-script"
import { CallableValue, KeyOfValue, MemoryValue, NativeValue } from "../../vm-api/memory-store"
import { ConstantRefMemoryCell, ExternalMemoryCell, isConstantRefMemoryCell } from "../../vm-api/memory-store/cell"
import { isVmCallableType, isVmGenericRef, isVmIterableType, isVmKeyOfType, isVmNativeType, isVmStructuredType, VmType } from "../../vm-api/type-system"
import { InternalMemoryValue } from "./memory-value"
import { StructuredKeyType } from "../../vm-api/type-system/categories"
import { MemoryFront } from "./store"

// addConstantValue Recursive construction of a user-space value.
//   Converts the StoredConstantValue into a memory value.
//   Stores recursive values as memory cells in the memory front, and adds
//   the returned memory value to the memory front.
export function addConstantValue(
    memoryManager: MemoryFront,
    cell: ExternalMemoryCell | ConstantRefMemoryCell,
    type: VmType,
    value: StoredConstantValue,
): ValidationResult<InternalMemoryValue> {
    // Note: we could compress constants such that if they have the same value + type,
    //   then they share the same underlying memory value (sources would need to be figured
    //   out - maybe a touch of redirection?).  This would help shrink memory usage down,
    //   while also making duplication of code much easier to identify to help with
    //   memoization compression.

    // Easy stuff first.
    if (isVmNativeType(type)) {
        if (!type.isType(value)) {
            // Can't keep going.
            return {
                result: undefined,
                problems: [
                    createValueConversionError(cell, ERROR__IMPL_TYPE_VALUE_MISMATCH, type),
                ],
            }
        }
        return memoryManager.adder.addMemoryValue(
            cell.source,
            cell,
            value as NativeValue,
            true,
        )
    }
    if (isVmKeyOfType(type)) {
        // TODO ensure value is a KeyOfValue
        if (isVmGenericRef(type.structureSource)) {
            return {
                result: undefined,
                problems: [
                    createGenericConstantError(cell, type),
                ],
            }
        }
        return memoryManager.adder.addMemoryValue(
            cell.source,
            cell,
            value as KeyOfValue,
            true,
        )
    }

    if (isVmCallableType(type)) {
        // The callable value will need to be compiled at a later time.
        return memoryManager.adder.addMemoryValue(
            cell.source,
            cell,
            value as CallableValue,
            true,
        )
    }

    // Recursive stuff.
    if (isVmIterableType(type)) {
        if (isVmGenericRef(type.valueType)) {
            return {
                result: undefined,
                problems: [
                    createGenericConstantError(cell, type),
                ],
            }
        }
        if (!Array.isArray(value)) {
            // Can't continue
            return {
                result: undefined,
                problems: [
                    createValueConversionError(cell, ERROR__IMPL_TYPE_VALUE_MISMATCH, type),
                ],
            }
        }

        // Delay creation until all the children are created.
        const parentValue: MemoryValue[] = []
        const problems = new ValidationCollector()
        for (let i = 0; i < value.length; i++) {
            // The cell remains the same in the recursion.
            const inner = addConstantValue(
                memoryManager,
                createSubCell(cell, i),
                type.valueType,
                value[i],
            )
            problems.add(inner.problems)
            if (inner.result !== undefined) {
                parentValue.push(inner.result)
            }
        }
        if (problems.isErr()) {
            return {
                result: undefined,
                problems: problems.validations,
            }
        }
        return memoryManager.adder.addMemoryValue(
            cell.source,
            cell,
            memoryManager.iterable.createFromMemoryArray(parentValue, type),
            true,
        )
    }

    if (isVmStructuredType(type)) {
        if (typeof value !== "object" || Array.isArray(value)) {
            // Can't continue
            return {
                result: undefined,
                problems: [
                    createValueConversionError(cell, ERROR__IMPL_TYPE_VALUE_MISMATCH, type),
                ],
            }
        }

        // Delay creation until all the children are added.
        const parentValue: {[key: StructuredKeyType]: MemoryValue} = {}
        const problems = new ValidationCollector()
        Object.keys(value).forEach((key) => {
            const iv = value as object
            const mem = addConstantValue(
                memoryManager,
                createSubCell(cell, key),
                type.stores[key].valueType,
                value[key as keyof typeof iv],
            )
            problems.add(mem.problems)
            if (mem.result !== undefined) {
                parentValue[key] = mem.result
            }
        })
        return memoryManager.adder.addMemoryValue(
            cell.source,
            cell,
            memoryManager.structure.createFromMemory(parentValue, type),
            true,
        )
    }
    return {
        result: undefined,
        problems: [
            createValueConversionError(cell, ERROR__IMPL_UNKNOWN_TYPE_CATEGORY, type),
        ],
    }
}

// createGenericConstantError Create an error related to generics in the type.
function createGenericConstantError(
    cell: ExternalMemoryCell | ConstantRefMemoryCell,
    type: VmType,
): ValidationProblem {
    return createValueConversionError(cell, ERROR__IMPL_CONSTANT_GENERIC_TYPE, type)
}

// createValueConversionError Create an error for value conversion.
function createValueConversionError(
    cell: ExternalMemoryCell | ConstantRefMemoryCell,
    problemId: number,
    type: VmType,
): ValidationProblem {
    return {
        source: cell.source || type.source,
        problemId,
        parameters: createCellTypeProblemParameters(cell, type),
    } as ValidationProblem
}

// createCellTypeProblemParameters Create a problem for cell types.
function createCellTypeProblemParameters(
    cell: ExternalMemoryCell | ConstantRefMemoryCell,
    type: VmType,
): { [key: string]: string | number } {
    if (isConstantRefMemoryCell(cell)) {
        return {
            module: cell.module,
            constant: cell.constant,
            type: type.name,
        }
    } else {
        return {
            type: type.name,
        }
    }
}

// createSubCell Create a new cell for a child to another cell.
function createSubCell(
    cell: ExternalMemoryCell | ConstantRefMemoryCell,
    subname: string | number,
): ExternalMemoryCell | ConstantRefMemoryCell {
    if (isConstantRefMemoryCell(cell)) {
        return {
            ...cell,
            constant: `${cell.constant}.${subname}`,
        }
    } else {
        return {
            ...cell,
            name: `${cell.name}.${subname}`,
        }
    }
}
