// Internal memory value representation

import { RuntimeSourcePosition } from "../../source"
import { EvaluatedValue, IterableValue, MemoryCell, MemoryValue } from "../../vm-api/memory-store"

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

// MemoryIterable Basic implementation of an iterable value.
export class MemoryIterable implements IterableValue {
    private readonly data: MemoryValue[]

    constructor(data: MemoryValue[]) {
        this.data = data
    }

    forEach(callback: (value: MemoryValue, extra: { index: number; first: boolean; last: boolean; }) => boolean): void
    forEach(callback: (value: MemoryValue, extra: { index: number; first: boolean; last: boolean; }) => boolean, options: { startIndex?: number | undefined; endIndex?: number | undefined; }): void
    forEach(
        callback: (value: MemoryValue, extra: { index: number; first: boolean; last: boolean; }) => boolean,
        options?: { startIndex?: number | undefined; endIndex?: number | undefined; },
    ): void {
        let start = 0
        let end = this.data.length
        if (options !== undefined) {
            if (options.startIndex !== undefined) {
                start = Math.max(0, Math.min(options.startIndex, this.data.length - 1))
            }
            if (options.endIndex !== undefined) {
                end = options.endIndex
                if (end < 0) {
                    end = this.data.length + end
                }
                end = Math.max(0, Math.min(end, this.data.length - 1))
            }
        }
        for (let i = start; i <= end; i++) {
            callback(
                this.data[i],
                {
                    index: i,
                    first: i === start,
                    last: i === end,
                },
            )
        }
    }

    size(): number {
        return this.data.length
    }

}
