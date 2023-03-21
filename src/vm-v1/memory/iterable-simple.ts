// Simple iterable value.

import { EvaluatedValue, IterableFactory, IterableValue, MemoryValue } from "../../vm-api/memory-store"
import { FactoryValue } from "../../vm-api/memory-store/factory";
import { VmType } from "../../vm-api/type-system";

export class SimpleIterableFactory implements IterableFactory {
    createFromMemoryArray(_values: MemoryValue[], _type: VmType): FactoryValue {
        throw new Error("Method not implemented.");
    }
    createFromValueArray(_values: EvaluatedValue[], _type: VmType): FactoryValue {
        throw new Error("Method not implemented.");
    }
    append(_iterable: MemoryValue, _appended: MemoryValue): FactoryValue {
        throw new Error("Method not implemented.");
    }
    replace(_iterable: MemoryValue, _index: number, _replaceWith: MemoryValue): FactoryValue {
        throw new Error("Method not implemented.");
    }
    sub(_iterable: MemoryValue, _start: number, _end: number): FactoryValue {
        throw new Error("Method not implemented.");
    }
    insertIterable(_first: MemoryValue, _second: MemoryValue, _insertAt: number): FactoryValue {
        throw new Error("Method not implemented.");
    }

}

// SimpleIterableMemory Basic implementation of an iterable value.
export class SimpleIterableMemory implements IterableValue {
    private readonly data: MemoryValue[]

    constructor(data: MemoryValue[]) {
        this.data = data
    }

    get(index: number): MemoryValue | undefined {
        // JS index will, on its own, return undefined if the index is out of bounds.
        return this.data[index]
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
