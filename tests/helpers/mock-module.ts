// Mock memory construction tools for testing.

import { RuntimeSourcePosition, SourcePosition } from "../../src/source"
import { ConstantValue, Module } from "../../src/vm-api/interpreter"
import { ConstantRefMemoryCell, EvaluatedValue, MemoryCell, MemoryValue } from "../../src/vm-api/memory-store"
import { VmType } from "../../src/vm-api/type-system"


// MockModule A single module's memory layout, or runtime frame memory layout.
export class MockModule implements Module {
    readonly source: RuntimeSourcePosition
    readonly name: string
    private memValues: MemoryValue[] = []
    private byName: {[name: string]: MemoryValue} = {}
    constants: {[name: string]: ConstantValue} = {}

    constructor(source: RuntimeSourcePosition, name: string) {
        this.source = source
        this.name = name
    }

    values(): MemoryValue[] {
        return this.memValues
    }

    cells(): MemoryCell[] {
        return this.memValues.map((v) => v.cell)
    }

    getValue(name: string): MemoryValue | undefined {
        return this.byName[name]
    }

    addConstant(name: string, type: VmType, value: EvaluatedValue): MemoryValue {
        const index = this.memValues.length
        const source = {
            moduleName: this.name,
            line: index,
            column: 1,
        } as SourcePosition
        const memv = {
            cell: {
                source,
                type,
                module: this.name,
                constant: name,
            } as ConstantRefMemoryCell,
            memoized: value,
        } as MemoryValue
        this.memValues.push(memv)
        this.byName[name] = memv
        this.constants[name] = {
            source,
            type,
            value,
        } as ConstantValue
        return memv
    }
}
