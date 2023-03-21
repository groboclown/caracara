// Compile the module memory into a easy to use form.

import { ValidationCollector } from "../../common/helpers"
import { ERROR__IMPL_DUPLICATE_MODULE_NAMES } from "../../errors"
import { RuntimeError, ValidationResult } from "../../errors/struct"
import { ConstantValue, Module } from "../../vm-api/interpreter"
import { CallableValue, CallFactory, ConstantRefMemoryCell, EvaluatedValue, IterableFactory, StructuredFactory } from "../../vm-api/memory-store"
import { ExternalMemoryCell, isConstantRefMemoryCell, MemoryCell } from "../../vm-api/memory-store/cell"
import { isVmCallableType, TypeStoreManager } from "../../vm-api/type-system"
import { addConstantValue } from "./constant-memory"
import { InternalMemoryValue } from "./memory-value"
import { MemoryFront, MemoryStore, MemoryValueAdder } from "./store"
import { SimpleIterableFactory } from "./iterable-simple"
import { SimpleStructuredFactory } from "./struct-simple"
import { SimpleCallFactory } from "./call-simple"
import { RuntimeSourcePosition } from "../../source"

// CompiledMemory Modules converted to internal memory format.
export interface CompiledMemory {
    // modules Modules indexed by name.
    readonly modules: {[name: string]: Module}

    // memory Indexed constants (and sub-values) defined from the modules.
    readonly memory: MemoryStore
}

// compileMemory Compile the module constant values into internal forms.
//   This does not compile the callable values.
export function compileMemory(
    typeStore: TypeStoreManager,
    modules: Module[],
): ValidationResult<CompiledMemory> {
    const problems = new ValidationCollector()
    const moduleMap: {[name: string]: Module} = {}
    const memory = new CompilingMemoryFront()

    modules.forEach((module) => {
        if (moduleMap[module.name] !== undefined) {
            problems.add({
                source: module.source,
                problemId: ERROR__IMPL_DUPLICATE_MODULE_NAMES,
                parameters: {
                    moduleName: module.name,
                },
            })
            return
        }
        moduleMap[module.name] = module
        Object.keys(module.constants).forEach((constantName) => {
            const constant = module.constants[constantName]

            // Type registration and enforcement
            const addRes = registerConstantType(typeStore, constant)
            if (addRes !== null) {
                problems.add(addRes)
                return
            }

            // Create the constant value.
            const valueRes = addConstantValue(
                memory,
                {
                    source: constant.source,
                    type: constant.type,
                    kind: "constant",
                    module: module.name,
                    constant: constantName,
                } as ConstantRefMemoryCell,
                constant.type,
                constant.value,
            )
            problems.add(valueRes.problems)
        })
    })


    return {
        result: {
            modules: moduleMap,
            memory: memory.store,
        } as CompiledMemory,
        problems: problems.validations,
    }
}

class ModuleMemoryStore implements MemoryStore {
    memory: InternalMemoryValue[] = []
    constLookup: {[key: string]: number} = {}

    count(): number {
        return this.memory.length
    }

    get(index: number): InternalMemoryValue | undefined {
        return this.memory[index]
    }

    lookupConstIdIndex(constId: string): number | undefined {
        return this.constLookup[constId]
    }

    lookupConstIndex(module: string, constant: string): number | undefined {
        return this.constLookup[`${module}!${constant}`]
    }

    getConstIdByName(module: string, constant: string): string {
        return `${module}!${constant}`
    }

    getConstIdByRef(ref: ConstantRefMemoryCell): string {
        return `${ref.module}!${ref.constant}`
    }
}

// ModuleMemoryAdder Adder implementation for the store.
//   Tightly coupled with the store.
class ModuleMemoryAdder implements MemoryValueAdder {
    private readonly store: ModuleMemoryStore

    constructor(store: ModuleMemoryStore) {
        this.store = store
    }

    addMemoryValue(source: RuntimeSourcePosition, cell: MemoryCell, value: EvaluatedValue | undefined, isConstant?: boolean | undefined): ValidationResult<InternalMemoryValue> {
        if (!isConstant || !isConstantRefMemoryCell(cell)) {
            throw new Error(`only constant values allowed to be added during compile phase`)
        }
        const index = this.store.memory.length
        const mem = new InternalMemoryValue(
            source,
            index,
            cell,
            value,
        )
        this.store.memory.push(mem)
        if (isConstant && isConstantRefMemoryCell(cell)) {
            this.store.constLookup[`${cell.module}!${cell.constant}`] = index
        }
        return {
            result: mem,
            problems: [],
        }
    }
}

// CompilingMemoryFront Creates memory from the constant converter.
//   For the memory compiling phase, the memory can only come from constants.
class CompilingMemoryFront implements MemoryFront {
    readonly iterable: IterableFactory
    readonly structure: StructuredFactory
    readonly call: CallFactory
    readonly adder: MemoryValueAdder
    readonly store: MemoryStore

    constructor() {
        const memory = new ModuleMemoryStore()
        this.store = memory
        this.adder = new ModuleMemoryAdder(memory)
        this.iterable = new SimpleIterableFactory()
        this.structure = new SimpleStructuredFactory()
        this.call = new SimpleCallFactory(this.adder)
    }

    addConstantMemoryCell(
        cell: ConstantRefMemoryCell | ExternalMemoryCell,
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

function registerConstantType(typeStore: TypeStoreManager, constant: ConstantValue): RuntimeError | null {
    // Note that this could perform checking for every cell, helping the user reduce rerun attempts.
    const outerTypeRes = typeStore.addType(constant.type)
    if (outerTypeRes !== null) {
        return outerTypeRes
    }
    if (isVmCallableType(constant.type)) {
        // Register / check the cell types, too.
        const callableValue = constant.value as CallableValue
        const cellIdxList = Object.keys(callableValue.cells)
        for (let idx = 0; idx < cellIdxList.length; idx++) {
            const cell = callableValue.cells[+cellIdxList[idx] as keyof typeof callableValue.cells]
            const cellRes = typeStore.addType(cell.type)
            if (cellRes !== null) {
                return cellRes
            }
        }
    }
    return null
}
