// Tests for the add opcodes.

import { INTEGER_TYPE, OpCodeAddIntegers, createEvaluatedInteger } from '../../../src/common/numbers'
import { GeneratedValue } from '../../../src/vm-api/memory-store'
import { MockScriptContext } from '../../helpers'

describe("With two integers", () => {
    const context = new MockScriptContext()
    context.typeManager.addType(INTEGER_TYPE)
    const constMem = context.createModule("mem")
    const i1 = constMem.addConstant("i1", INTEGER_TYPE, createEvaluatedInteger(13))
    const i2 = constMem.addConstant("i2", INTEGER_TYPE, createEvaluatedInteger(32))

    describe("When added together", () => {
        const opcode = new OpCodeAddIntegers()
        it("static validate", () => {
            const res = opcode.staticValidation(context.createOpCodeFrame(
                [i1, i2], INTEGER_TYPE,
            ))
            expect(res).toStrictEqual([])
        })

        it("runtime validate", () => {
            const res = opcode.runtimeValidation(context.createOpCodeFrame(
                [i1, i2], INTEGER_TYPE,
            ))
            expect(res).toStrictEqual([])
        })

        it("add up", () => {
            const res = opcode.evaluate(context.createOpCodeFrame(
                [i1, i2], INTEGER_TYPE,
            ))
            expect((<GeneratedValue>res).value).toBe(13 + 32)
        })
    })
})
