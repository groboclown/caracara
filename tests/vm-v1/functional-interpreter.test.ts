// Test a full load + compile + execution of the interpreter.

import { getScriptLoaderFactory } from '../../src/vm-v1'
import { INTEGER_TYPE, OpCodeAddIntegers } from '../../src/common/numbers'
import { VmCallableType, VmNativeType } from '../../src/vm-api/type-system'
import { Interpreter, Module, OpCodeInstruction, ScriptLoader } from '../../src/vm-api/interpreter'
import { createTestSource } from '../helpers/test-source'
import { ANY_STRUCT_TYPE } from '../../src/common/helpers'
import { CallableValue } from '../../src/vm-api/memory-store'
import { CALLABLE_ARGUMENT_MEMORY_INDEX, CALLABLE_RETURN_MEMORY_INDEX } from '../../src/vm-api/memory-store/value'
import { ConstantRefMemoryCell, ExternalMemoryCell } from '../../src/vm-api/memory-store/cell'
import { isGeneratedValue } from '../../src/vm-api/memory-store/returns'

describe('Functional test for the interpreter', () => {
    const nativeTypes: VmNativeType[] = [
        INTEGER_TYPE,
    ]
    const opcodes: OpCodeInstruction[] = [
        new OpCodeAddIntegers(),
    ]
    const scriptLoaderRes = getScriptLoaderFactory().createScriptLoader(opcodes, nativeTypes)
    expect(scriptLoaderRes.problems).toStrictEqual([])
    expect(scriptLoaderRes.result).not.toBe(undefined)
    const scriptLoader = scriptLoaderRes.result as ScriptLoader

    describe('with a constant value load', () => {
        const callableType: VmCallableType = {
            source: createTestSource(),
            name: "Generate An Integer",
            argumentType: ANY_STRUCT_TYPE,
            returnType: INTEGER_TYPE,
        }
        const modules: Module[] = [
            {
                name: "constant-load",
                source: createTestSource(),
                constants: {
                    "one": {
                        source: createTestSource(),
                        type: INTEGER_TYPE,
                        value: 1,
                    },
                    "load-one": {
                        source: createTestSource(),
                        type: callableType,
                        value: {
                            source: createTestSource(),
                            cells: {
                                // The return is just a constant reference.
                                [CALLABLE_RETURN_MEMORY_INDEX]: {
                                    source: createTestSource(),
                                    kind: "constant",
                                    module: "constant-load",
                                    constant: "one",
                                    type: INTEGER_TYPE,
                                } as ConstantRefMemoryCell,
                                [CALLABLE_ARGUMENT_MEMORY_INDEX]: {
                                    source: createTestSource(),
                                    kind: "external",
                                    name: "arguments",
                                    type: ANY_STRUCT_TYPE,
                                } as ExternalMemoryCell,
                            },
                        } as CallableValue,
                    }
                },
            } as Module,
        ]
        it('then it produces the constant value', () => {
            const interpreterRes = scriptLoader.parseScript(modules)
            expect(interpreterRes.problems).toStrictEqual([])
            expect(interpreterRes.result).not.toBe(undefined)
            const interpreter = interpreterRes.result as Interpreter
            const res = interpreter.runFunction("constant-load", "load-one", {})
            expect(isGeneratedValue(res)).toBe(true)
        })
    })

    describe('with a single simple opcode', () => {

    })
})
