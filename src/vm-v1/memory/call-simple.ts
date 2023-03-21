// Simple call value manager.

import { CallFactory, MemoryValue } from "../../vm-api/memory-store"
import { FactoryMemory } from "../../vm-api/memory-store/factory"
import { MemoryValueAdder } from "./store"

export class SimpleCallFactory implements CallFactory {
    readonly stack: MemoryValueAdder

    constructor(stack: MemoryValueAdder) {
        this.stack = stack
    }

    createCall(_callable: MemoryValue, _argument: MemoryValue): FactoryMemory {
        throw new Error("Method not implemented.")
    }
}
