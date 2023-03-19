// Compile the module memory into a easy to use form.

import { ValidationCollector } from "../../common/helpers"
import { ERROR__IMPL_CONFLICTING_TYPES, ERROR__IMPL_DUPLICATE_MODULE_NAMES, ERROR__IMPL_MISSING_DECLARED_TYPE } from "../../errors"
import { ValidationProblem, ValidationResult } from "../../errors/struct"
import { Module } from "../../vm-api/interpreter"
import { ConstantRefMemoryCell, EvaluatedValue } from "../../vm-api/memory-store"
import { ExternalMemoryCell, isConstantRefMemoryCell } from "../../vm-api/memory-store/cell"
import { TypeStore } from "../../vm-api/type-system"
import { addConstantValue, MemoryValueManager } from "./constant-memory"
import { InternalMemoryValue, ModuleConstantMemory } from "./memory-value"

// CompiledMemory Modules converted to internal memory format.
export interface CompiledMemory {
    // modules Modules indexed by name.
    readonly modules: {[name: string]: Module}

    // moduleConsts Module constant identifier pointing to the memory index.
    //   Identifier constructed by calling createModuleConstantId
    readonly moduleConsts: {[id: string]: number}

    // memory Indexed constants (and sub-values) defined from the modules.
    readonly memory: ModuleConstantMemory[]
}

// compileMemory Compile the module constant values into internal forms.
//   This does not compile the callable values.
export function compileMemory(
    typeStore: TypeStore,
    modules: Module[],
): ValidationResult<CompiledMemory> {
    const problems = new ValidationCollector()
    const moduleMap: {[name: string]: Module} = {}
    const moduleConsts: {[id: string]: number} = {}
    const memory = new CompilingMemoryManager()

    modules.forEach((module) => {
        if (moduleMap[module.name] !== undefined) {
            problems.add({
                source: module.source,
                problemId: ERROR__IMPL_DUPLICATE_MODULE_NAMES,
                parameters: {
                    moduleName: module.name,
                },
            })
            return
        }
        moduleMap[module.name] = module
        Object.keys(module.constants).forEach((constantName) => {
            const constant = module.constants[constantName]

            // Simple type checking
            const realType = typeStore.getTypeByName(constant.type.name)
            if (realType === undefined) {
                problems.add({
                    source: constant.source,
                    problemId: ERROR__IMPL_MISSING_DECLARED_TYPE,
                    parameters: {
                        module: module.name,
                        constant: constantName,
                        type: constant.type.name,
                    }
                } as ValidationProblem)
                return
            }
            if (realType !== constant.type) {
                problems.add({
                    source: constant.source,
                    problemId: ERROR__IMPL_CONFLICTING_TYPES,
                    parameters: {
                        module: module.name,
                        constant: constantName,
                        type: constant.type.name,
                    }
                } as ValidationProblem)
                return
            }

            // Create the constant value.
            const valueRes = addConstantValue(
                memory,
                {
                    source: constant.source,
                    type: constant.type,
                    kind: "constant",
                    module: module.name,
                    constant: constantName,
                } as ConstantRefMemoryCell,
                constant.type,
                constant.value,
            )
            problems.add(valueRes.problems)
            if (valueRes.result !== undefined) {
                const id = createModuleConstantId(module.name, constantName)
                moduleConsts[id] = valueRes.result.cellIndex
            }
        })
    })


    return {
        result: {
            modules: moduleMap,
            moduleConsts,
            memory: memory.constMemory,
        } as CompiledMemory,
        problems: problems.validations,
    }
}

// CompilingMemoryManager Creates memory from the constant converter.
//   For the memory compiling phase, the memory can only come from constants.
class CompilingMemoryManager implements MemoryValueManager {
    constMemory: ModuleConstantMemory[] = []

    addConstantMemoryCell(
        cell: ConstantRefMemoryCell | ExternalMemoryCell,
        value: EvaluatedValue,
    ): ValidationResult<InternalMemoryValue> {
        if (isConstantRefMemoryCell(cell)) {
            const index = this.constMemory.length
            const mem = new InternalMemoryValue(
                cell.source,
                index,
                cell,
                value,
            )
            this.constMemory.push({
                memory: mem,
                module: cell.module,
                constant: cell.constant,
            })
            return {
                result: mem,
                problems: [],
            }
        }
        throw new Error("Should only define constants for memory compilation phase")
    }

}

// createModuleConstantId Create a module/constant identifier for quick lookups.
export function createModuleConstantId(moduleName: string, constantName: string): string {
    return `${moduleName}!${constantName}`
}
