// Helper to run opcodes in a unit test framework.

import { RuntimeError } from '../../src/errors'
import { RuntimeSourcePosition } from '../../src/source'
import { Module, OpCodeFrame, ScriptContext } from '../../src/vm-api/interpreter'
import { MemoryCell, MemoryValue, OpCodeBoundTypes } from '../../src/vm-api/memory-store'
import { TypeStore, TypeStoreManager, VmType } from '../../src/vm-api/type-system'

let cellCount = 0

// generateConstCell Create a memory cell to contain a constant value
export function generateConstCell(
    type: VmType,
    name: string,
    module: string = "test",
): MemoryCell {
    return {
        source: {
            moduleName: module,
            line: cellCount++,
            column: 1,
        },
        type,
        module,
        constant: name,
    }
}

export function generateOpCodeFrame(settings: {
    values: MemoryValue[],
    returnType: VmType,
    types: TypeStoreManager,
    boundTypes?: OpCodeBoundTypes,
    modules?: {[name: string]: Module},
}): OpCodeFrame {
    return {
        source: {
            moduleName: "test",
            line: cellCount++,
            column: 1,
        },
        context: {
            modules: settings.modules || {},
            types: settings.types.getTypeStore(),
        },
        args: settings.values,
        returnType: settings.returnType,
        boundTypes: settings.boundTypes || {},
    }
}


export class MockTypeStoreManager implements TypeStoreManager {
    private types: {[name: string]: VmType} = {}
    typeStore: TypeStore

    constructor() {
        this.typeStore = {
            getTypeNames: () => {
                return Object.keys(this.types)
            },

            getTypeByName: (name: string) => {
                return this.types[name]
            },

            enforceTypeMatch: (_requestor: RuntimeSourcePosition, _actual: VmType, _expected: VmType) => {
                throw new Error('Method not implemented.')
            },
        }
    }

    getTypeStore(): TypeStore {
        return this.typeStore
    }

    addType(type: VmType): RuntimeError | null {
        this.types[type.name] = type
        return null
    }

}


export class MockScriptContext implements ScriptContext {
    modules = {}

    // types The types declared by the scripts for use.
    types: TypeStore

    typeManager: TypeStoreManager

    constructor() {
        this.typeManager = new MockTypeStoreManager()
        this.types = this.typeManager.getTypeStore()
    }
}
