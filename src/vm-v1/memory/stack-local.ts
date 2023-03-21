// Memory manager for running in a local "stack".

import { ValidationCollector } from '../../common/helpers'
import { ValidationResult } from '../../errors/struct'
import { RuntimeSourcePosition } from '../../source'
import { CallFactory, EvaluatedValue, IterableFactory, StructuredFactory } from '../../vm-api/memory-store'
import { ConstantRefMemoryCell, ExternalMemoryCell, MemoryCell } from '../../vm-api/memory-store/cell'
import { TypeStore } from '../../vm-api/type-system'
import { InternalMemoryValue } from './memory-value'
import { MemoryFront, MemoryStore, MemoryValueAdder } from './store'
import { SplicedIterableFactory } from './iterable-spliced'
import { LayeredStructuredFactory } from './struct-layered'
import { SimpleCallFactory } from './call-simple'

// LocalStackMemory Local memory store for a call.
//   In order to conserve memory, the on-the-fly values need to be able to assemble
//   on top of other values.
export class LocalStackMemoryFront implements MemoryFront {
    readonly adder: LocalStackMemoryAdder
    readonly store: LocalMemoryStore
    readonly iterable: IterableFactory
    readonly structure: StructuredFactory
    readonly call: CallFactory

    constructor(types: TypeStore, parent: MemoryStore) {
        this.store = new LocalMemoryStore(parent)
        this.adder = new LocalStackMemoryAdder(types, this.store)
        this.iterable = new SplicedIterableFactory(this.adder)
        this.structure = new LayeredStructuredFactory()
        this.call = new SimpleCallFactory(this.adder)
    }

    addConstantMemoryCell(
        cell: ExternalMemoryCell | ConstantRefMemoryCell,
        value: EvaluatedValue,
    ): ValidationResult<InternalMemoryValue> {
        return this.adder.addMemoryValue(
            cell.source,
            cell,
            value,
            true,
        )
    }
}

class LocalMemoryStore implements MemoryStore {
    private readonly parentSize: number
    private readonly parentMemory: MemoryStore
    local: InternalMemoryValue[]

    constructor(parentMemory: MemoryStore) {
        this.parentMemory = parentMemory
        // Record the parent size at the time of the local memory construction.
        //   After this point, the parent memory indexes shouldn't be referenced.
        //   Should they?
        this.parentSize = this.parentMemory.count()
        this.local = []
    }

    count(): number {
        return this.parentSize + this.local.length
    }

    get(index: number): InternalMemoryValue | undefined {
        if (index < this.parentSize) {
            return this.parentMemory.get(index)
        }
        return this.local[index - this.parentSize]
    }

    lookupConstIdIndex(constId: string): number | undefined {
        return this.parentMemory.lookupConstIdIndex(constId)
    }

    lookupConstIndex(module: string, constant: string): number | undefined {
        return this.parentMemory.lookupConstIndex(module, constant)
    }

    getConstIdByName(module: string, constant: string): string {
        return this.parentMemory.getConstIdByName(module, constant)
    }

    getConstIdByRef(ref: ConstantRefMemoryCell): string {
        return this.parentMemory.getConstIdByRef(ref)
    }

    localAdd(
        source: RuntimeSourcePosition,
        cell: MemoryCell,
        constantValue: EvaluatedValue | undefined,
    ): InternalMemoryValue {
        const index = this.count()
        const mem = new InternalMemoryValue(
            source || cell.source,
            index,
            cell,
            constantValue,
        )
        this.local.push(mem)
        return mem
    }
}

class LocalStackMemoryAdder implements MemoryValueAdder {
    readonly types: TypeStore
    readonly local: LocalMemoryStore

    constructor(types: TypeStore, local: LocalMemoryStore) {
        this.types = types
        this.local = local
    }

    // addMemoryValue Adds the memory value into the local store.
    //   Can only be called from internal VM places, so we assume that the value is of the correct type.
    //   The value can be undefined if the value hasn't been evaluated yet.
    addMemoryValue(
        source: RuntimeSourcePosition,
        cell: MemoryCell,
        value: EvaluatedValue | undefined,
        isConstant?: boolean
    ): ValidationResult<InternalMemoryValue> {
        const problems = new ValidationCollector()
        const res = this.types.enforceTypeMatch(
            source || cell.source,
            cell.type,
            this.types.getTypeByName(cell.type.name),
        )
        problems.add(res)
        if (res !== null) {
            return { result: undefined, problems: problems.validations }
        }
        const mem = this.local.localAdd(source, cell, isConstant === true ? value : undefined)
        mem.memoized = value
        return { result: mem, problems: problems.validations }
    }
}
