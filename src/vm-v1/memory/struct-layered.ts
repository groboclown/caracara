// Simple implementation of a structured type.

import { EvaluatedValue, MemoryValue, StructuredFactory, StructuredValue } from '../../vm-api/memory-store'
import { FactoryValue } from '../../vm-api/memory-store/factory';
import { StructuredKeyType, VmStructuredType } from '../../vm-api/type-system/categories';

// SimpleStructuredFactory Creates simple structured values.
export class LayeredStructuredFactory implements StructuredFactory {
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

// LayeredStructuredValue Maintains a set of parent values that are default values.
export class LayeredStructuredValue implements StructuredValue {
    private layers: {[key: StructuredKeyType]: MemoryValue}[]
    private type: VmStructuredType

    constructor(layers: {[key: StructuredKeyType]: MemoryValue}[], type: VmStructuredType) {
        this.layers = layers
        this.type = type
    }

    createChild(
        newLayer: {[key: StructuredKeyType]: MemoryValue},
        newType?: VmStructuredType
    ): LayeredStructuredValue {
        const newLayers = [
            newLayer,
            ...this.layers,
        ]
        return new LayeredStructuredValue(newLayers, newType || this.type)
    }

    keys(): StructuredKeyType[] {
        return Object.keys(this.type.stores)
    }

    get(key: StructuredKeyType): MemoryValue | undefined {
        for (let i = 0; i < this.layers.length; i++) {
            const ret = this.layers[i][key]
            if (ret !== undefined) {
                return ret
            }
        }
        return undefined
    }

    forEach(callback: (key: StructuredKeyType, value: MemoryValue) => boolean): void {
        const keys = this.keys()
        // This is a slow process for finding the key value.  There are ways to optimize this,
        //   but they are much more complex to manage:
        //   - maintain a list of remaining keys.
        //   - loop through each layer, fetching each key that's in the layer and
        //     removing that key from the remaining key list.
        //   - when the key list is empty, or the layers finished looping, or the callback
        //     returns 'true', return.
        for (let i = 0; i < keys.length; i++) {
            const ret = callback(keys[i], this.get(keys[i]) as MemoryValue)
            if (ret === true) {
                return
            }
        }
    }

    contains(key: StructuredKeyType): boolean {
        return this.type.stores[key] !== undefined
    }
}

