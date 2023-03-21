// Simple iterable value.

import { ValidationCollector } from "../../common/helpers";
import { ERROR__IMPL_WRONG_VALUE_TYPE, RuntimeError, VM_BUG_BAD_SPLICE_RANGE } from "../../errors";
import { isRuntimeError } from "../../errors/struct";
import { EvaluatedValue, IterableFactory, IterableValue, MemoryValue } from "../../vm-api/memory-store"
import { ExternalMemoryCell } from "../../vm-api/memory-store/cell";
import { FactoryValue } from "../../vm-api/memory-store/factory"
import { VmIterableType } from "../../vm-api/type-system"
import { MemoryValueAdder } from "./store";

// SplicedIterableFactory Maintains iterables as spliced.
export class SplicedIterableFactory implements IterableFactory {
    private readonly adder: MemoryValueAdder

    constructor(adder: MemoryValueAdder) {
        this.adder = adder
    }

    createFromMemoryArray(values: MemoryValue[], _type: VmIterableType): FactoryValue {
        // TODO ensure the values all have compatible types with type argument.
        // Note that the type argument must be an iterable type.
        const inner = createSpliceArray(values)
        if (isRuntimeError(inner)) {
            return { error: inner }
        }
        return { value: new SpliceNode(undefined, inner, undefined) }
    }

    createFromValueArray(values: EvaluatedValue[], type: VmIterableType): FactoryValue {
        const problems = new ValidationCollector()
        const newMem: MemoryValue[] = []
        const itemCell = {
            source: null,
            type: type.valueType,
            kind: "external",
            name: "constructed iterable",
        } as ExternalMemoryCell
        for (let i = 0; i < values.length; i++) {
            const memRes = this.adder.addMemoryValue(
                null,
                itemCell,
                values[i],
                true,
            )
            problems.add(memRes.problems)
            if (memRes.result === undefined) {
                return { error: problems.asRuntimeError() }
            }
            newMem.push(memRes.result)
        }
        return this.createFromMemoryArray(newMem, type)
    }

    append(iterable: MemoryValue, appended: MemoryValue): FactoryValue {
        // The appended value will be higher than the original iterable.
        const sourceSplice = this.getSpliceValue(iterable)
        if (isRuntimeError(sourceSplice)) {
            return { error: sourceSplice }
        }
        const appendedSplice = this.getSpliceValue(appended)
        if (isRuntimeError(appendedSplice)) {
            return { error: appendedSplice }
        }
        // Put the two together with a zero-length array as the bounding index.
        //    The zero-length array needs to align the appended at the end,
        const current = createZeroSizeSpliceArray(sourceSplice.end)
        return { value: new SpliceNode(sourceSplice, current, appendedSplice) }
    }

    replace(_iterable: MemoryValue, _index: number, _replaceWith: MemoryValue): FactoryValue {
        throw new Error("Method not implemented.")
    }

    sub(_iterable: MemoryValue, _start: number, _end: number): FactoryValue {
        throw new Error("Method not implemented.")
    }

    insertIterable(_first: MemoryValue, _second: MemoryValue, _insertAt: number): FactoryValue {
        throw new Error("Method not implemented.")
    }

    private getSpliceValue(iterable: MemoryValue): RuntimeError | SpliceNode {
        if (iterable.memoized === undefined || !(iterable.memoized instanceof SpliceNode)) {
            return {
                source: iterable.cell.source,
                errorId: ERROR__IMPL_WRONG_VALUE_TYPE,
                parameters: {},
            } as RuntimeError
        }
        const source: SpliceNode = iterable.memoized
        return source
    }
}


// SpliceNode A tree for a single, continuous range of values.
//   Can contain a lower and higher splice node children, and current values.
//   The internally stored structures have their own indicies that may not align
//   this this node.  The node masks that by having its own virtual index space
//   aligned around the "current" array.  The "current" array is considered to
//   beh the node's virtual index space.
class SpliceNode implements IterableValue {
    // start The start virtual index for this node.
    readonly start: number

    // end The end virtual index for this node (== start + size, so 1 more than last index)
    readonly end: number

    // lowEnd Quick look-ahead to see where the low splice virtual index ends.
    //   If there is no low splice index, this will === start.
    readonly lowEnd: number

    // low The splice node containing the splices with indicies below the current splice.
    readonly low: SpliceNode | undefined

    // highStart Quick look-ahead to see where the high splice virtual index starts.
    //   If there is no high splice index, this will === end.
    readonly highStart: number

    // high The splice node containing the data above the current splice
    readonly high: SpliceNode | undefined

    // current The this-node splice data.
    readonly current: SpliceArray

    constructor(low: SpliceNode | undefined, current: SpliceArray, high: SpliceNode | undefined) {
        let lowStart = current.startVIndex
        const lowEnd = current.startVIndex
        const highStart = current.endVIndex
        let highEnd = current.endVIndex

        if (low !== undefined && low.size() > 0) {
            lowStart = lowStart - low.size()
        } else {
            // If low is zero size, then ignore it.
            low = undefined
        }
        if (high !== undefined && high.size() > 0) {
            highEnd = highStart + high.size()
        } else {
            // If high is zero size, then ignore it.
            high = undefined
        }

        this.start = lowStart
        this.low = low
        this.lowEnd = lowEnd
        this.high = high
        this.highStart = highStart
        this.end = highEnd
        this.current = current
    }

    // getLowIndexSpace Translates the given index into the low index space.
    //   Preconditions: this.low !== undefined
    private getLowIndexSpace(currentVirtualIndex: number): number {
        const dlow = <SpliceNode>this.low
        // Expected:
        //   When index == lowEnd, then dlow space index == dlow.end
        // Test:
        //   If index = 3, lowEnd = 5, dlow.end = 12, then dlow space index = 10
        return dlow.end + currentVirtualIndex - this.lowEnd
    }

    // getHighIndexSpace Translates the given index into the high index space.
    //   Preconditions: this.high !== undefined
    private getHighIndexSpace(currentVirtualIndex: number): number {
        const dhigh = <SpliceNode>this.high
        // Expected:
        //   When index == highStart, then dhigh space index == dhigh.start
        // Test
        //   If index = 10, highStart = 8, dhigh.start = 2, then dhigh space index = 4
        return dhigh.start + currentVirtualIndex - this.highStart
    }

    // virtualForEach Loop over the virtual indicies; called by the parent node.
    //   Used to ensure the "first" and "last" values to the callback are set correctly.
    //   Caller must guarantee that the startIndex and endIndex are within bounds.
    protected virtualForEach(
        callback: (value: MemoryValue, extra: { index: number; first: boolean; last: boolean; }) => boolean,
        startIndex: number,
        endIndex: number,
        totalStart: number,
        totalEnd: number,
    ): boolean {
        if (startIndex < this.lowEnd) {
            // Implied that this.low !== undefined, because ranges are guaranteed to be correct.
            // Need to map the input indicies from the "current" array vitual index space to
            //   low's vitual index space.
            const ret = (<SpliceNode>this.low).virtualForEach(
                callback,
                // because the bounds are guaranteed, startIndex must be >= low start.
                this.getLowIndexSpace(startIndex),
                this.getLowIndexSpace(Math.min(endIndex, this.lowEnd)),
                this.getLowIndexSpace(totalStart),
                this.getLowIndexSpace(totalEnd),
            )
            if (ret === true) {
                return true
            }
        }
        if (startIndex < this.current.endVIndex && endIndex > this.current.startVIndex) {
            // if endIndex === this.current.startVIndex, then current is never iterated over.
            // The input indicies are in the "current" array index space, so no translation is needed here.
            const ret = this.current.forEach(
                callback,
                Math.max(startIndex, this.current.startVIndex),
                Math.min(endIndex, this.current.endVIndex),
                totalStart,
                totalEnd,
            )
            if (ret === true) {
                return true
            }
        }
        if (endIndex >= this.highStart) {
            // implied that this.high !== undefined, because ranges are guaranteed to be correct.
            return (<SpliceNode>this.high).virtualForEach(
                callback,
                this.getHighIndexSpace(Math.max(startIndex, this.highStart)),
                // because bounds are guaranteed, endIndex must be <= high end.
                this.getHighIndexSpace(endIndex),
                this.getHighIndexSpace(totalStart),
                this.getHighIndexSpace(totalEnd),
            )
        }
        return false
    }

    get(index: number): MemoryValue | undefined {
        if (this.low !== undefined && index < this.lowEnd) {
            // Don't check if it's within low's bounds; the low get will do that.
            return this.low.get(this.getLowIndexSpace(index))
        }
        if (this.high !== undefined && index >= this.highStart) {
            // Don't check if it's within high's bounds; the high get will do that.
            return this.high.get(this.getHighIndexSpace(index))
        }
        // index may be out of bounds for current, but we'll let current figure that out.
        return this.current.get(index)
    }

    forEach(callback: (value: MemoryValue, extra: { index: number; first: boolean; last: boolean; }) => boolean): void
    forEach(callback: (value: MemoryValue, extra: { index: number; first: boolean; last: boolean; }) => boolean, options: { startIndex?: number | undefined; endIndex?: number | undefined; }): void
    forEach(
        callback: (value: MemoryValue, extra: { index: number; first: boolean; last: boolean; }) => boolean,
        options?: { startIndex?: number | undefined; endIndex?: number | undefined; },
    ): void {
        let si = this.start
        let ei = this.end
        if (options !== undefined) {
            if (options.startIndex !== undefined) {
                si = options.startIndex
            }
            if (options.endIndex !== undefined) {
                ei = options.endIndex
            }
        }
        if (ei < 0) {
            // This is the entry call, so we assume that this.end is the total end.
            ei = this.end + ei
        }
        if (ei <= si || ei < this.start || si >= this.end) {
            // Nothing to do.  Either not in range, or invalid values.
            return
        }
        // Use the virtual recursion calls.  In this first call, the requested start === total start & same for end.
        this.virtualForEach(callback, si, ei, si, ei)
    }

    size(): number {
        return this.end - this.start
    }

}

// SpliceArray Maps from a virtual index to a local index.
//   The data can be copied between lots of other splices.
export interface SpliceArray {
    readonly startVIndex: number
    readonly endVIndex: number
    readonly size: number

    // subRange Create a new SpliceArray with new virtual start position.
    //   The returned splice will start from the given virtual index in the current SpliceArray fragment.
    subRange(newStartVIndex: number, newEndVIndex: number, startingAtVIndex: number): SpliceArray | RuntimeError
    get(virtualIndex: number): MemoryValue | undefined

    // forEach Loop over this array with the virtual indicies.
    //   Caller must guarantee that start and end are within the bounds.
    //   total indicies are for the full scan range, so that the "first" and "last" can be set correctly.
    forEach(
        callback: (value: MemoryValue, extra: { index: number; first: boolean; last: boolean; }) => boolean,
        startIndex: number,
        endIndex: number,
        totalStart: number,
        totalEnd: number,
    ): boolean
}

// createSpliceArray Create an initial SpliceArray
export function createSpliceArray(
    memory: MemoryValue[],
    startIndex?: number,
    virtualStart?: number,
    size?: number,
): SpliceArray | RuntimeError {
    const si: number =
        (startIndex === undefined)
        ? 0
        : startIndex
    const sz: number =
        (size === undefined)
        ? memory.length - si
        : size
    const vsi: number =
        (virtualStart === undefined)
        ? 0
        : virtualStart
    const evi = vsi + sz
    if (si < 0 || sz < 0 || si + sz > memory.length) {
        // if start index is greater than the memory size, then start index + size is greater than the size.
        return createIndexOutOfBoundsError(0, memory.length, memory.length, vsi, sz)
    }
    if (sz === 0) {
        // special zero size case
        return createZeroSizeSpliceArray(vsi)
    }
    return new SpliceArrayImpl(
        vsi, evi, sz, si, memory,
    )
}

// createZeroSizeSpliceArray Special zero size case.
//   This discards the source memory and uses a static zero-length data instead.
function createZeroSizeSpliceArray(virtualStartIndex: number): SpliceArray {
    return new SpliceArrayImpl(
        virtualStartIndex, virtualStartIndex, 0, 0, EMPTY_MEMORY,
    )
}

// SplicedIterableMemory Joins different arrays through splices.
class SpliceArrayImpl implements SpliceArray {
    readonly startVIndex: number
    readonly endVIndex: number
    readonly size: number
    private readonly vposStart: number
    private readonly data: MemoryValue[]

    constructor(
        startVIndex: number,
        endVIndex: number,
        size: number,
        vposStart: number,
        data: MemoryValue[],
    ) {
        this.startVIndex = startVIndex
        this.endVIndex = endVIndex
        this.vposStart = vposStart
        this.size = size
        this.data = data
    }

    forEach(
        callback: (value: MemoryValue, extra: { index: number; first: boolean; last: boolean; }) => boolean,
        startIndex: number,
        endIndex: number,
        totalStart: number,
        totalEnd: number,
    ): boolean {
        // because of guarantee, this is easy.
        for (let i = startIndex; i < endIndex; i++) {
            const ret = callback(
                this.data[i - this.vposStart],
                {
                    index: i,
                    first: i === totalStart,
                    last: i === totalEnd - 1,
                }
            )
            if (ret === true) {
                // early termination
                return true
            }
        }
        return false
    }

    subRange(newStartVIndex: number, newEndVIndex: number, startingAtVIndex: number): SpliceArray | RuntimeError {
        // Optimization: we can eliminate a check by realizing the subrange MUST be within the
        //   the requested range.  That means that, since the current slice is within the covered
        //   data range, the new request must also be within the range.

        const newSize = newEndVIndex - newStartVIndex
        if (
            startingAtVIndex >= this.startVIndex
            && newSize < this.size - (startingAtVIndex - this.startVIndex)
            && newEndVIndex > newStartVIndex
        ) {
            const newVposStart = this.vposStart + (newStartVIndex - this.startVIndex)
            return new SpliceArrayImpl(
                // new positions are relative to the current virtual index.
                newStartVIndex + this.startVIndex,
                newEndVIndex + this.startVIndex,
                newSize,
                newVposStart,
                this.data,
            )
        }
        // size === 0 is special.
        if (newSize === 0) {
            return createZeroSizeSpliceArray(newStartVIndex)
        }
        return createIndexOutOfBoundsError(
            this.startVIndex, this.endVIndex, this.size, startingAtVIndex, newSize,
        )
    }

    get(virtualIndex: number): MemoryValue | undefined {
        // JS index will, on its own, return undefined if the index is out of bounds.
        //   However, the data array could be bigger than what's allowed by the virtual indicies,
        //   so perform bounds checking explicitly.
        if (virtualIndex < this.startVIndex) {
            return undefined
        }
        if (virtualIndex >= this.endVIndex) {
            return undefined
        }
        return this.data[virtualIndex - this.vposStart]
    }
}

function createIndexOutOfBoundsError(
    sourceStart: number, sourceEnd: number, sourceSize: number,
    newStart: number, newSize: number,
): RuntimeError {
    return {
        source: null,
        errorId: VM_BUG_BAD_SPLICE_RANGE,
        parameters: {
            sourceStart,
            sourceEnd,
            sourceSize,
            newStart,
            newSize,
        }
    } as RuntimeError

}

const EMPTY_MEMORY: MemoryValue[] = []
