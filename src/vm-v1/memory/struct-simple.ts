// Simple implementation of a structured type.

import { MemoryValue, StructuredValue, StructuredFactory, EvaluatedValue } from '../../vm-api/memory-store'
import { FactoryValue } from '../../vm-api/memory-store/factory';
import { StructuredKeyType, VmStructuredType } from '../../vm-api/type-system/categories';

// SimpleStructuredFactory Creates simple structured values.
export class SimpleStructuredFactory implements StructuredFactory {
    createFromMemory(_value: { [name: StructuredKeyType]: MemoryValue; }, _type: VmStructuredType): FactoryValue {
        throw new Error('Method not implemented.')
    }
    createFromValues(_value: { [name: StructuredKeyType]: EvaluatedValue; }, _type: VmStructuredType): FactoryValue {
        throw new Error('Method not implemented.')
    }
    updateFromValues(_base: MemoryValue, _updatedValues: { [name: StructuredKeyType]: EvaluatedValue; }, _newType?: VmStructuredType | undefined): FactoryValue {
        throw new Error('Method not implemented.')
    }
    updateFromMemory(_base: MemoryValue, _updatedValues: { [name: StructuredKeyType]: MemoryValue; }, _newType?: VmStructuredType | undefined): FactoryValue {
        throw new Error('Method not implemented.')
    }
}

// SimpleStructuredValue Trivial implementation of a structured value.
export class SimpleStructuredValue implements StructuredValue {
    private data: {[key: StructuredKeyType]: MemoryValue}

    constructor(data: {[key: StructuredKeyType]: MemoryValue}) {
        this.data = data
    }

    keys(): StructuredKeyType[] {
        return Object.keys(this.data)
    }
    get(key: StructuredKeyType): MemoryValue | undefined {
        return this.data[key]
    }
    forEach(callback: (key: StructuredKeyType, value: MemoryValue) => boolean): void {
        const keys = this.keys()
        for (let i = 0; i < keys.length; i++) {
            const ret = callback(keys[i], this.data[keys[i]])
            if (ret === true) {
                return
            }
        }
    }
    contains(key: StructuredKeyType): boolean {
        return this.data[key] !== undefined
    }
}
