// VM Loader implementation

import { ValidationResult } from '../errors/struct'
import { ScriptLoaderFactory, ScriptLoader, OpCodeInstruction, Interpreter, Module, ScriptContext } from '../vm-api/interpreter'
import { VmNativeType } from '../vm-api/type-system'
import { OpCodeCollector } from './validation'
import { InterpreterImpl } from './interpreter'
import { createOpCodeCollector } from './validation/loader-collector'
import { compileMemory } from './memory'
import { RootCompiler } from './compiler/root'
import { CachingCallCompiler } from './compiler/caching'


// getScriptLoaderFactory Get the script loader for this implementation.
export function getScriptLoaderFactory(): ScriptLoaderFactoryImpl {
    return SCRIPT_LOADER
}

// ScriptLoaderFactoryImpl The script loader constructor.
class ScriptLoaderFactoryImpl implements ScriptLoaderFactory {
    createScriptLoader(
        opcodes: OpCodeInstruction[],
        nativeTypes: VmNativeType[],
    ): ValidationResult<ScriptLoader> {
        const collector = createOpCodeCollector(opcodes, nativeTypes)
        if (collector.isErr()) {
            return {
                result: undefined,
                problems: collector.problems,
            } as ValidationResult<ScriptLoader>
        }
        return {
            result: new ScriptLoaderImpl(collector),
            problems: collector.problems,
        } as ValidationResult<ScriptLoader>
    }
}

// SCRIPT_LOADER The entrypoint.
const SCRIPT_LOADER = new ScriptLoaderFactoryImpl()

// ScriptLoaderImpl The interpreter constructor.
export class ScriptLoaderImpl implements ScriptLoader {
    private opcodes: OpCodeCollector

    constructor(opcodes: OpCodeCollector) {
        this.opcodes = opcodes
    }

    parseScript(
        modules: Module[],
    ): ValidationResult<Interpreter> {
        const memoryRes = compileMemory(
            this.opcodes.typeManager.getTypeStore(),
            modules,
        )

        if (memoryRes.result === undefined) {
            return { result: undefined, problems: memoryRes.problems }
        }

        const context = {
            modules: memoryRes.result.modules,
            types: this.opcodes.typeManager.getTypeStore(),
        } as ScriptContext
        const compiler = new RootCompiler(
            memoryRes.result.memory.map((mcm) => mcm.memory),
            memoryRes.result.moduleConsts,
            this.opcodes.opcodes,
            new CachingCallCompiler(context.types),
        )

        return {
            result: new InterpreterImpl(context, compiler),
            problems: memoryRes.problems,
        }
    }
}
