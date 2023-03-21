// Internal compilation helpers.

import { ERROR__IMPL_NO_SUCH_CONSTANT } from "../../errors";
import { ValidationResult } from "../../errors/struct";
import { RuntimeSourcePosition } from "../../source";
import { ConstantValue, StoredConstantValue } from "../../vm-api/interpreter/loaded-script";
import { CallableValue, ConstantRefMemoryCell, MemoryCell } from "../../vm-api/memory-store";
import { TypeStore, VmStructuredType } from "../../vm-api/type-system";
import { InternalMemoryValue, MemoryStore } from "../memory";

// CallConstruction Assembly of information to pass between compiler sub-parts.
export interface CallConstruction<R extends MemoryCell> {
    readonly callable: CallableValue
    readonly moduleMemory: MemoryStore
    readonly callIndex: number
    readonly argument: MemoryCell
    readonly returns: R
    readonly typeStore: TypeStore
}

// ArgNormalizer Converts an argument structure into a constant value.
export class ArgNormalizer {
    readonly source: RuntimeSourcePosition
    readonly typeStore: TypeStore
    readonly expectedArgument: VmStructuredType

    constructor(
        source: RuntimeSourcePosition,
        typeStore: TypeStore,
        expectedArgument: VmStructuredType,
    ) {
        this.source = source
        this.typeStore = typeStore
        this.expectedArgument = expectedArgument
    }

    validateArgument(argument: { [key: string]: StoredConstantValue }): ValidationResult<ConstantValue> {
        // TODO enforce type of each key on the argument
        return {
            result: {
                source: null,
                type: this.expectedArgument,
                value: argument,
            } as ConstantValue,
            problems: [],
        }
    }
}

// getConstantValue Get a constant value, with type validation, from the module memory store.
export function getConstantValue(
    constantCell: ConstantRefMemoryCell,
    moduleMemory: MemoryStore,
    typeStore: TypeStore,
): ValidationResult<InternalMemoryValue> {
    const constIndex = moduleMemory.lookupConstIndex(constantCell.module, constantCell.constant)
    if (constIndex === undefined) {
        return {
            result: undefined,
            problems: [
                {
                    source: constantCell.source,
                    problemId: ERROR__IMPL_NO_SUCH_CONSTANT,
                    parameters: {
                        module: constantCell.module,
                        constant: constantCell.constant,
                    },
                },
            ]
        }
    }
    // If returned as undefined from lookup, it must be valid.
    const value = moduleMemory.get(constIndex) as InternalMemoryValue
    const typeCheck = typeStore.enforceTypeMatch(
        constantCell.source,
        value.cell.type,
        constantCell.type,
    )
    if (typeCheck !== null) {
        return {
            result: undefined,
            problems: [{
                source: typeCheck.source,
                problemId: typeCheck.errorId,
                parameters: {
                    ...(typeCheck.parameters || {}),
                    module: constantCell.module,
                    constant: constantCell.constant,
                },
            }],
        }
    }
    if (value.constant === undefined) {
        return {
            result: undefined,
            problems: [{
                source: constantCell.source,
                problemId: ERROR__IMPL_NO_SUCH_CONSTANT,
                parameters: {
                    module: constantCell.module,
                    constant: constantCell.constant,
                },
            }],
        }
    }
    return {
        result: value,
        problems: [],
    }
}
