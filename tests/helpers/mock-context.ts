// Helper to run opcodes in a unit test framework.

import { Module, OpCodeFrame, ScriptContext } from '../../src/vm-api/interpreter'
import { MemoryValue, OpCodeBoundTypes } from '../../src/vm-api/memory-store'
import { TypeStore, TypeStoreManager, VmType } from '../../src/vm-api/type-system'
import { MockMemoryFactory } from './mock-memory'
import { MockModule } from './mock-module'
import { MockTypeStoreManager } from './mock-types'
import { createTestSource } from './test-source'

export class MockScriptContext implements ScriptContext {
    // modules Referencable memory modules.
    mockModules: {[name: string]: MockModule} = {}
    modules: {[name: string]: Module} = {}

    // types The types declared by the scripts for use.
    types: TypeStore

    // typeManager Add in your own types.
    typeManager: TypeStoreManager

    constructor() {
        this.typeManager = new MockTypeStoreManager()
        this.types = this.typeManager.getTypeStore()
    }

    createModule(name: string, testStackDepth: number = 0): MockModule {
        const ret = new MockModule(createTestSource(testStackDepth + 1), name)
        this.mockModules[name] = this.modules[name] = ret
        return ret
    }

    getMemoryValue(module: string, cell: string): MemoryValue {
        const ret = this.mockModules[module].getValue(cell)
        if (ret === undefined) {
            throw new Error(`No such ${module}.${cell}`)
        }
        return ret
    }

    getMemoryValueRef(name: string): MemoryValue {
        const parts = name.split(".", 2)
        if (parts.length !== 2) {
            throw new Error(`bad name ${name}`)
        }
        return this.getMemoryValue(parts[0], parts[1])
    }

    createOpCodeFrame(
        argNames: (string | MemoryValue)[],
        returnType: VmType,
        boundTypes: OpCodeBoundTypes = {},
    ): OpCodeFrame {
        const args = argNames.map((n) =>
            typeof n === 'string' ? this.getMemoryValueRef(n) : n
        )
        return {
            source: createTestSource(1),
            context: this,
            args,
            returnType,
            boundTypes,
        } as OpCodeFrame
    }

    createMemoryFactory(moduleScope: string): MockMemoryFactory {
        return new MockMemoryFactory(this.mockModules[moduleScope])
    }
}
