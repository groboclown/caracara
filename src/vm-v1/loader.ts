// VM Loader implementation

import { ValidationProblem, ValidationResult } from '../errors/struct'
import { ValidationCollector } from '../common/helpers'
import { ScriptLoaderFactory, ScriptLoader, OpCodeInstruction, Interpreter, ScriptContext } from '../vm-api/interpreter'
import { validateOpCode } from './validation/opcodes'
import { VmOpCode } from '../vm-api/memory-store'
import { ERROR__IMPL_DUPLICATE_OPCODES } from '../errors'
import { isVmGenericRef, isVmIterableType, isVmNativeType, isVmStructuredType, VmGenericRef, VmType } from '../vm-api/type-system'
import { validateHasNativeTypes } from './validation'
import { InterpreterImpl } from './interpreter'

// ScriptLoaderFactoryImpl The script loader constructor.
export class ScriptLoaderFactoryImpl implements ScriptLoaderFactory {
    createScriptLoader(opcodes: OpCodeInstruction[]): ValidationResult<ScriptLoader> {
        const ocRes = validateOpCodes(opcodes)
        if (ocRes.problems.isErr()) {
            return {
                result: undefined,
                problems: ocRes.problems.validations,
            } as ValidationResult<ScriptLoader>
        }
        return {
            result: new ScriptLoaderImpl(ocRes.collated, ocRes.requiredNativeTypes),
            problems: ocRes.problems.validations,
        }
    }
}

// SCRIPT_LOADER The entrypoint.
export const SCRIPT_LOADER = new ScriptLoaderFactoryImpl()

// ScriptLoaderImpl The interpreter constructor.
export class ScriptLoaderImpl implements ScriptLoader {
    private opcodes: {[name: VmOpCode]: OpCodeInstruction}
    private requiredNativeTypes: string[]

    constructor(
        opcodes: {[name: VmOpCode]: OpCodeInstruction},
        requiredNativeTypes: string[],
    ) {
        this.opcodes = opcodes
        this.requiredNativeTypes = requiredNativeTypes
    }

    parseScript(context: ScriptContext): ValidationResult<Interpreter> {
        const problems = new ValidationCollector()
        problems.add(validateHasNativeTypes(
            this.requiredNativeTypes,
            context.types,
        ))

        // TODO validate type store
        // TODO validate modules
        //      This will probably be done as part of a memory construction
        //      routine that will be passed to the interpreter.

        return {
            result: problems.isErr() ? undefined : new InterpreterImpl(this.opcodes, context),
            problems: problems.validations,
        }
    }
}

interface ValidatedOpCodes {
    collated: {[name: VmOpCode]: OpCodeInstruction}
    requiredNativeTypes: string[]
    problems: ValidationCollector
}

// validateOpCodes Validate that all the opcodes are okay, and collate them.
function validateOpCodes(
    opcodes: OpCodeInstruction[],
): ValidatedOpCodes {
    const problems = new ValidationCollector()
    let collated: {[name: VmOpCode]: OpCodeInstruction} = {}
    let natives: {[name: string]: boolean} = {}
    opcodes.forEach((opcode) => {
        let okay = true
        // One validation: duplicate opcodes
        if (collated[opcode.opcode] !== undefined) {
            okay = false
            problems.add({
                source: null,
                problemId: ERROR__IMPL_DUPLICATE_OPCODES,
                parameters: {
                    opcode: opcode.opcode,
                }
            } as ValidationProblem)
        }
        // Internal opcode validations
        const res = validateOpCode(opcode)
        problems.add(res)
        okay = okay && res.length <= 0

        if (okay) {
            collated[opcode.opcode] = opcode
            addNativeTypes(opcode.returnType, natives)
            opcode.argumentTypes.forEach((arg) => addNativeTypes(arg.type, natives))
        }
    })
    return {
        collated,
        requiredNativeTypes: Object.keys(natives),
        problems: problems,
    }
}

function addNativeTypes(type: VmType | VmGenericRef, natives: {[name: string]: boolean}) {
    if (isVmGenericRef(type)) {
        return
    }
    if (isVmNativeType(type)) {
        natives[type.internalType] = true
    } else if (isVmIterableType(type)) {
        if (!isVmGenericRef(type.valueType) && isVmNativeType(type.valueType)){
            natives[type.valueType.internalType] = true
        }
    } else if (isVmStructuredType(type)) {
        Object.keys(type.stores).forEach((key) => {
            const vt = type.stores[key].valueType
            if (isVmNativeType(vt)) {
                natives[vt.internalType] = true
            }
        })
    }
}
