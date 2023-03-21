// Mock memory construction tools for testing.

import { CallFactory, EvaluatedValue, IterableFactory, MemoryFactory, MemoryValue, StructuredFactory } from "../../src/vm-api/memory-store"
import { FactoryMemory, FactoryValue } from "../../src/vm-api/memory-store/factory"
import { VmStructuredType, VmType } from "../../src/vm-api/type-system"
import { MockModule } from "./mock-module"

// MockIterableFactory Iterable factory
export class MockIterableFactory implements IterableFactory {
    readonly scope: MockModule

    constructor(scope: MockModule) {
        this.scope = scope
    }

    createFromMemoryArray(_values: MemoryValue[], _type: VmType): FactoryValue {
        throw new Error("Method not implemented.")
    }
    createFromValueArray(_values: EvaluatedValue[], _type: VmType): FactoryValue {
        throw new Error("Method not implemented.")
    }
    append(_iterable: MemoryValue, _appended: MemoryValue): FactoryValue {
        throw new Error("Method not implemented.")
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
}

// MockStructureFactory Structure factory
export class MockStructureFactory implements StructuredFactory {
    readonly scope: MockModule

    constructor(scope: MockModule) {
        this.scope = scope
    }

    updateFromValues(_base: MemoryValue, _updatedValues: { [name: string]: EvaluatedValue }, _newType?: VmStructuredType | undefined): FactoryValue {
        throw new Error("Method not implemented.")
    }

    updateFromMemory(_base: MemoryValue, _updatedValues: { [name: string]: MemoryValue }, _newType?: VmStructuredType | undefined): FactoryValue {
        throw new Error("Method not implemented.")
    }

    createFromMemory(_value: { [name: string]: MemoryValue }, _type: VmType): FactoryValue {
        throw new Error("Method not implemented.")
    }
    createFromValues(_value: { [name: string]: EvaluatedValue }, _type: VmType): FactoryValue {
        throw new Error("Method not implemented.")
    }

}

// MockCallFactory Call Memory factory
export class MockCallFactory implements CallFactory {
    readonly scope: MockModule

    constructor(scope: MockModule) {
        this.scope = scope
    }

    createCall(_callable: MemoryValue, _argument: MemoryValue): FactoryMemory {
        throw new Error("Method not implemented.")
    }

}

export class MockMemoryFactory implements MemoryFactory {
    readonly mockIterable: MockIterableFactory
    readonly mockStructure: MockStructureFactory
    readonly mockCall: MockCallFactory

    readonly iterable: IterableFactory
    readonly structure: StructuredFactory
    readonly call: CallFactory

    constructor(scope: MockModule) {
        this.mockIterable = this.iterable = new MockIterableFactory(scope)
        this.mockStructure = this.structure = new MockStructureFactory(scope)
        this.mockCall = this.call = new MockCallFactory(scope)
    }
}
