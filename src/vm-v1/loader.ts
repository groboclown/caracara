// VM Loader implementation

import { ValidationProblem, ValidationResult } from '../errors/struct'
import { ValidationCollector } from '../common/helpers'
import { ScriptLoaderFactory, ScriptLoader, OpCodeInstruction, Interpreter, ScriptContext } from '../vm-api/interpreter'
import { validateOpCode } from './validation/opcodes'
import { VmOpCode } from '../vm-api/memory-store'
import { ERROR__IMPL_DUPLICATE_OPCODES } from '../errors'
import { isVmGenericRef, isVmIterableType, isVmNativeType, isVmStructuredType, VmGenericRef, VmType } from '../vm-api/type-system'
import { OpCodeCollector, validateHasNativeTypes } from './validation'
import { InterpreterImpl } from './interpreter'
import { validateTypeStore } from './validation/types'
import { createOpCodeCollector } from './validation/loader-collector'

// ScriptLoaderFactoryImpl The script loader constructor.
export class ScriptLoaderFactoryImpl implements ScriptLoaderFactory {
    createScriptLoader(opcodes: OpCodeInstruction[]): ValidationResult<ScriptLoader> {
        const collector = createOpCodeCollector(opcodes)
        if (collector.isErr()) {
            return {
                result: undefined,
                problems: collector.problems,
            } as ValidationResult<ScriptLoader>
        }
        return {
            result: new ScriptLoaderImpl(collector),
            problems: collector.problems,
        }
    }
}

// SCRIPT_LOADER The entrypoint.
export const SCRIPT_LOADER = new ScriptLoaderFactoryImpl()

// ScriptLoaderImpl The interpreter constructor.
export class ScriptLoaderImpl implements ScriptLoader {
    private opcodes: OpCodeCollector

    constructor(opcodes: OpCodeCollector) {
        this.opcodes = opcodes
    }

    parseScript(context: ScriptContext): ValidationResult<Interpreter> {
        const problems = new ValidationCollector()
        problems.add(this.opcodes.checkTypeStore(context.types))
        problems.add(validateTypeStore(context.types))

        // TODO validate modules
        //      This will probably be done as part of a memory construction
        //      routine that will be passed to the interpreter.

        return {
            result: problems.isErr()
                ? undefined
                : new InterpreterImpl(this.opcodes.opcodes, context),
            problems: problems.validations,
        }
    }
}
