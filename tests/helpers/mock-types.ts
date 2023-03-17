// Helper to run opcodes in a unit test framework.

import { RuntimeError } from '../../src/errors'
import { RuntimeSourcePosition } from '../../src/source'
import { ScriptContext } from '../../src/vm-api/interpreter'
import { TypeStore, TypeStoreManager, VmType } from '../../src/vm-api/type-system'


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
