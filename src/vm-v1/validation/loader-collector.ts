// Some type validation

import { ValidationCollector } from "../../common/helpers";
import { ERROR__IMPL_DUPLICATE_OPCODES, ERROR__IMPL_GENERIC_BINDING_DEEP, ERROR__IMPL_MISSING_DECLARED_TYPE, ERROR__IMPL_MISSING_NATIVE_TYPE, ValidationProblem } from "../../errors";
import { OpCodeInstruction } from "../../vm-api/interpreter";
import { VmOpCode } from "../../vm-api/memory-store";
import { isVmGenericRef, isVmIterableType, isVmNativeType, isVmStructuredType, TypeStore, VmGenericRef, VmType } from "../../vm-api/type-system";
import { validateOpCode } from "./opcodes";
import { validateHasNativeTypes } from "./types";


// createOpCodeCollector Construct a collection for the declared opcodes.
export function createOpCodeCollector(opcodes: OpCodeInstruction[]): OpCodeCollector {
    const builder = new OpCodeCollectorBuilder()
    opcodes.forEach((oc) => builder.addOpCode(oc))
    return builder.build()
}

// OpCodeCollector Collects validation issues with the declared opcodes.
export class OpCodeCollector {
    readonly opcodes: {[mnemonic: VmOpCode]: OpCodeInstruction}
    readonly problems: ValidationProblem[]
    private nativeTypes: {[name: string]: boolean}

    constructor(
        opcodes: {[mnemonic: VmOpCode]: OpCodeInstruction},
        nativeTypes: {[name: string]: boolean},
        problems: ValidationProblem[],
    ) {
        this.opcodes = opcodes
        this.nativeTypes = nativeTypes
        this.problems = problems
    }

    isErr(): boolean {
        return this.problems.length > 0
    }

    // checkTypeStore Ensure the opcode declaration works with the given type store.
    //   Returns validation issues associated just with the typestore.
    checkTypeStore(typeStore: TypeStore): ValidationProblem[] {
        const retProbs = new ValidationCollector()
        retProbs.add(validateHasNativeTypes(
            Object.keys(this.nativeTypes),
            typeStore,
        ))

        return retProbs.validations
    }
}

// OpCodeCollectorBuilder Partial state to construct a collector.
class OpCodeCollectorBuilder {
    opcodes: {[mnemonic: VmOpCode]: OpCodeInstruction[]} = {}
    types: {[name: string]: ReferencedType[]} = {}
    problems: ValidationCollector = new ValidationCollector()
    nativeTypes: {[name: string]: boolean}
    private built: boolean = false

    // addOpCode Add an opcode, extract types to the type values, and inspect it for problems.
    addOpCode(opcode: OpCodeInstruction) {
        if (this.opcodes[opcode.opcode] === undefined) {
            this.opcodes[opcode.opcode] = [opcode]
        } else {
            this.opcodes[opcode.opcode].push(opcode)
        }
        this.problems.add(validateOpCode(opcode))
        opcode.argumentTypes.forEach((arg) => {
            this.addType(opcode, arg.type)
        })
        this.addType(opcode, opcode.returnType)
    }

    build(): OpCodeCollector {
        if (this.built) {
            throw new Error("Already built")
        }
        this.built = true

        // Ensure there aren't duplicate opcodes.  This allows us to report
        //   just one error for duplicates.

        const retOpcodes: {[mnemonic: VmOpCode]: OpCodeInstruction} = winnowDuplicateOpCodes(
            this.opcodes, this.problems,
        )

        // TODO Validate the types are consistent between opcode definitions.

        return new OpCodeCollector(
            retOpcodes,
            this.nativeTypes,
            this.problems.validations,
        )
    }

    private addType(
        opcode: OpCodeInstruction, topType: VmType | VmGenericRef,
    ) {
        let seenTypes: {[name: string]: boolean} = {}
        let stack: TypeCheckDepth[] = [{
            type: topType,
            depth: 0,
            parent: null,
        }]
        while (true) {
            const depth = stack.pop()
            if (depth === undefined) {
                return
            }
            const type = depth.type
            if (isVmGenericRef(type)) {
                // The only allowed cases for generic usages:
                const parent = depth.parent
                if (
                    //   * Top level type.
                    depth.depth !== 0

                    //   * The valueType of a top level iterable.
                    && !(
                        depth.depth === 1
                        && parent !== null
                        && !isVmGenericRef(parent)
                        && isVmIterableType(parent)
                    )
                ) {
                    this.problems.add({
                        source: null,
                        problemId: ERROR__IMPL_GENERIC_BINDING_DEEP,
                        parameters: {
                            opcode: opcode.opcode,
                            genericId: type.genericId,
                            depth: depth.depth,
                            parent: (parent !== null && !isVmGenericRef(parent))
                                ? parent.name
                                : "<unknown>",
                        },
                    } as ValidationProblem)
                }
                continue
            }
            if (isVmGenericRef(type) || seenTypes[type.name] === true) {
                // Recursive types are okay.
                continue
            }

            if (this.types[type.name] === undefined) {
                this.types[type.name] = [{opcode, type}]
            } else {
                // Delay the evaluation of whether these match up until the end
                // of opcode loading.
                this.types[type.name].push({opcode, type})
            }

            // Complex type checking for deep inspection.
            if (isVmNativeType(type)) {
                // ... and native type addition.
                this.nativeTypes[type.internalType] = true
            } else if (isVmIterableType(type)) {
                if (!isVmGenericRef(type.valueType)){
                    stack.push({
                        parent: type,
                        type: type.valueType,
                        depth: depth.depth + 1,
                    })
                }
            } else if (isVmStructuredType(type)) {
                Object.keys(type.stores).forEach((key) => {
                    stack.push({
                        parent: type,
                        type: type.stores[key].valueType,
                        depth: depth.depth + 1,
                    })
                })
            }
        }
    }

}

// ReferencedType Container for tracking where types were declared.
interface ReferencedType {
    opcode: OpCodeInstruction
    type: VmType
}

// TypeCheck Used for deep checking of types
interface TypeCheckDepth {
    type: VmType | VmGenericRef
    depth: number
    parent: VmType | VmGenericRef | null
}

// winnowDuplicateOpCodes Reduce the opcode list down to just singletons of mneumonics.
function winnowDuplicateOpCodes(
    opcodes: {[mnemonic: VmOpCode]: OpCodeInstruction[]},
    problems: ValidationCollector,
): {[mnemonic: VmOpCode]: OpCodeInstruction} {
    const retOpcodes: {[mnemonic: VmOpCode]: OpCodeInstruction} = {}
    Object.keys(opcodes).forEach((mnemonic) => {
        const opcodeList = opcodes[mnemonic]
        if (opcodeList.length !== 1) {
            problems.add({
                source: null,
                problemId: ERROR__IMPL_DUPLICATE_OPCODES,
                parameters: {
                    opcode: mnemonic,
                    count: opcodeList.length,
                }
            } as ValidationProblem)
        } else {
            retOpcodes[mnemonic] = opcodeList[0]
        }
    })
    return retOpcodes
}
