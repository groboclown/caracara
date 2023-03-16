// Iterable helpers.

import { IterableValue, MemoryValue } from '../../vm-api/memory-store'

export function createFixedIterable(items: MemoryValue[]): IterableValue {
    return new FixedIterableValue(items)
}

// FixedIterableValue A fixed length iterable with other memory values.
//   Is this right?  Should this be an internal VM construction?
class FixedIterableValue implements IterableValue {
    private items: MemoryValue[]

    constructor(items: MemoryValue[]) {
        this.items = [...items]
    }

    forEach(callback: (value: MemoryValue) => boolean): void {
        for (let i = 0; i < this.items.length; i++) {
            if (callback(this.items[i]) === true) {
                break
            }
        }
   }
}
