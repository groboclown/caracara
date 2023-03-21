// Some type validation

import { ValidationCollector } from "../../common/helpers";
import { ERROR__IMPL_DUPLICATE_OPCODES, ERROR__IMPL_GENERIC_BINDING_DEEP, ERROR__IMPL_MISSING_NATIVE_TYPE, RuntimeError, ValidationProblem } from "../../errors";
import { OpCodeInstruction } from "../../vm-api/interpreter";
import { VmOpCode } from "../../vm-api/memory-store";
import { isVmGenericRef, isVmIterableType, isVmNativeType, isVmStructuredType, TypeStoreManager, VmGenericRef, VmNativeType, VmType } from "../../vm-api/type-system";
import { TypeStoreManagerImpl } from "../interpreter/type-manager";
import { validateOpCode } from "./opcodes";


// createOpCodeCollector Construct a collection for the declared opcodes.
export function createOpCodeCollector(
    opcodes: OpCodeInstruction[],
    nativeTypes: VmNativeType[],
): OpCodeCollector {
    const builder = new OpCodeCollectorBuilder()
    nativeTypes.forEach((nt) => builder.addNativeType(nt))
    opcodes.forEach((oc) => builder.addOpCode(oc))
    return builder.build()
}

// OpCodeCollector Collects validation issues with the declared opcodes.
export class OpCodeCollector {
    readonly opcodes: {[mnemonic: VmOpCode]: OpCodeInstruction}
    readonly problems: ValidationProblem[]
    readonly typeManager: TypeStoreManager

    constructor(
        opcodes: {[mnemonic: VmOpCode]: OpCodeInstruction},
        typeManager: TypeStoreManager,
        problems: ValidationProblem[],
    ) {
        this.opcodes = opcodes
        this.typeManager = typeManager
        this.problems = problems
    }

    isErr(): boolean {
        return this.problems.length > 0
    }
}

// OpCodeCollectorBuilder Partial state to construct a collector.
class OpCodeCollectorBuilder {
    opcodes: {[mnemonic: VmOpCode]: OpCodeInstruction[]} = {}
    types: {[name: string]: ReferencedType[]} = {}
    nativeTypes: VmNativeType[] = []
    problems: ValidationCollector = new ValidationCollector()
    private built: boolean = false

    // addNativeType Add an implementing system native type.
    addNativeType(type: VmNativeType) {
        this.nativeTypes.push(type)
    }

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

        const retOpcodes = winnowDuplicateOpCodes(this.opcodes, this.problems)

        const typeStore = this.createTypeStoreManager()

        // TODO Validate the types are consistent between opcode definitions.

        return new OpCodeCollector(
            retOpcodes,
            typeStore,
            this.problems.validations,
        )
    }

    // addType Just add the type from the opcode + recursive types into the type record.
    //   Later, this will be verified.
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
            if (isVmIterableType(type)) {
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

    // createTypeStore Create the type store based off the current state, and populate error messages.
    //   Should only be called at build time.
    private createTypeStoreManager(): TypeStoreManager {
        // Strategy: load up the native types, as they are supposed to be valid.  Also, while doing so,
        //   keep track of the internal types.
        //   Then, process the opcode types to ensure they line up.  Any native type in the opcode type
        //   needs to be registered as a native type.
        const nativeTypeInternalNames: {[name: string]: boolean} = {}
        const ret = new TypeStoreManagerImpl()
        this.nativeTypes.forEach((nt) => {
            this.problems.add(ret.addType(nt))
            nativeTypeInternalNames[nt.internalType] = true
        })
        Object.keys(this.types).forEach((typeName) => {
            const typeList = this.types[typeName]
            if (typeList.length === 1) {
                // Simple form.
                this.addTypeToStore(typeList[0], ret, nativeTypeInternalNames)
            } else if (typeList.length > 1) {
                // These need to all be identical, or it's an error.
                // Fortunately, the type store semantics handle that well.
                typeList.forEach((type) => this.addTypeToStore(type, ret, nativeTypeInternalNames))
            }
        })
        return ret
    }

    // addTypeToStore Helper to put a type into the type store and some simple validation around native checking.
    private addTypeToStore(ref: ReferencedType, tsm: TypeStoreManager, natives: {[name: string]: boolean}) {
        const type = ref.type
        if (isVmNativeType(type)) {
            if (natives[type.internalType] === undefined) {
                this.problems.add({
                    source: ref.opcode.source,
                    problemId: ERROR__IMPL_MISSING_NATIVE_TYPE,
                    parameters: {
                        type: type.name,
                        nativeInternalType: type.internalType,
                    }
                } as ValidationProblem)
            }
        }
        if (tsm.getTypeStore().getTypeByName(ref.type.name) === undefined) {
            const res = tsm.addType(type)
            if (res !== null) {
                // Augment the error with information about the offending opcode source.
                this.problems.add({
                    ...res,
                    parameters: {
                        ...res.parameters,
                        sourceOpCode: ref.opcode.opcode,
                    },
                } as RuntimeError)
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
