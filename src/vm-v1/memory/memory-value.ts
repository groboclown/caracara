// Internal memory value representation

import { RuntimeSourcePosition } from "../../source"
import { EvaluatedValue, MemoryCell, MemoryValue } from "../../vm-api/memory-store"

// InternalMemoryValue An internal MemoryValue representation for quick usage.
export class InternalMemoryValue implements MemoryValue {
    readonly source: RuntimeSourcePosition
    readonly cellIndex: number
    readonly cell: MemoryCell

    // constant The constant value, if this came from a constant.
    //   If this didn't come from a constant, then the value is undefined.
    readonly constant: EvaluatedValue | undefined

    // memoized The evaluated value of this memory.  Set to the constant if the memory is a constant.
    memoized: EvaluatedValue | undefined

    constructor(
        source: RuntimeSourcePosition,
        cellIndex: number,
        cell: MemoryCell,
        constant: EvaluatedValue | undefined,
    ) {
        this.source = source
        this.cellIndex = cellIndex
        this.cell = cell
        this.constant = constant
        this.memoized = constant
    }

    emptyClone(): InternalMemoryValue {
        return new InternalMemoryValue(
            this.source,
            this.cellIndex,
            this.cell,
            this.constant,
        )
    }
}

// ModuleConstantMemory Detailed source information for a module's constant value.
export interface ModuleConstantMemory {
    memory: InternalMemoryValue
    module: string
    constant: string
}
