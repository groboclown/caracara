// Tests for the add opcodes.

import { INTEGER_TYPE, OpCodeAddIntegers } from '../../../src/common/numbers'
import { GeneratedValue } from '../../../src/vm-api/interpreter'
import { MemoryCell, MemoryValue } from '../../../src/vm-api/memory-store'
import { generateConstCell, generateLoadTimeSettings, generateRunTimeSettings, MockTypeStoreManager } from '../../helpers/opcode-runner'

describe("With two integers", () => {
    const cells: MemoryCell[] = [
        generateConstCell(INTEGER_TYPE, "i1"),
        generateConstCell(INTEGER_TYPE, "i2"),
        generateConstCell(INTEGER_TYPE, "r0"),
    ]
    const memory: MemoryValue[] = [
        {
            cell: cells[0],
            value: 13,
        },
        {
            cell: cells[1],
            value: 32,
        },
    ]
    const types = new MockTypeStoreManager()
    describe("When added together", () => {
        const opcode = new OpCodeAddIntegers()
        it("validate", () => {
            const res = opcode.validate(generateLoadTimeSettings({
                cells: [cells[0], cells[1]],
                returnType: INTEGER_TYPE,
                types,
            }))
            expect(res).toStrictEqual([])
        })

        it("add up", () => {
            const res = opcode.evaluate(generateRunTimeSettings({
                values: [memory[0], memory[1]],
                returnType: INTEGER_TYPE,
                types,
            }))
            expect((<GeneratedValue>res).value).toBe(13 + 32)
        })
    })
})
