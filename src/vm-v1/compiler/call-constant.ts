// Compile a constant result.

import { ValidationResult } from "../../errors/struct"
import { RuntimeSourcePosition } from "../../source"
import { InterpreterDebuggerCallbacks, OpCodeInstruction } from "../../vm-api/interpreter"
import { StoredConstantValue } from "../../vm-api/interpreter/loaded-script"
import { ConstantRefMemoryCell, EvaluatedValue, GeneratedValue, OpCodeResult } from "../../vm-api/memory-store"
import { isVmStructuredType, TypeStore, VmStructuredType } from "../../vm-api/type-system"
import { MemoryFront } from "../memory"
import { CompiledCall, RuntimeAction } from "./defs"
import { ArgNormalizer, CallConstruction, getConstantValue } from "./internal"

// createConstantCall Create a call that returns a constant value.
export function createConstantCall(cc: CallConstruction<ConstantRefMemoryCell>): ValidationResult<CompiledCall> {
    const constRes = getConstantValue(
        cc.returns,
        cc.moduleMemory,
        cc.typeStore,
    )
    if (constRes.result === undefined) {
        return {
            result: undefined,
            problems: constRes.problems,
        }
    }
    if (!isVmStructuredType(cc.argument.type)) {
        throw new Error(`Bad argument type ${cc.argument.type.name}`)
    }
    return {
        result: new ValidatingConstantCall(
            cc.callable.source,
            cc.callIndex,
            constRes.result,
            cc.typeStore,
            cc.argument.type,
        ),
        problems: [],
    }
}

// ValidatingConstantCall A call whose return value is constant, and validates the argument.
export class ValidatingConstantCall implements CompiledCall {
    readonly cellIndex: number
    private readonly normalizer: ArgNormalizer
    readonly action: ConstantAction

    constructor(
        source: RuntimeSourcePosition,
        cellIndex: number,
        returns: EvaluatedValue,
        typeStore: TypeStore,
        expectedArgument: VmStructuredType,
    ) {
        this.cellIndex = cellIndex
        this.normalizer = new ArgNormalizer(source, typeStore, expectedArgument)
        this.action = new ConstantAction(returns)
    }

    constructCall(
        _opcodes: { [mnemonic: string]: OpCodeInstruction; },
        _localMemory: MemoryFront,
        argument: { [key: string]: StoredConstantValue },
        _debuggerCallback: InterpreterDebuggerCallbacks,
    ): ValidationResult<RuntimeAction> {
        const constValueRes = this.normalizer.validateArgument(argument)
        if (constValueRes.result === undefined) {
            return {
                result: undefined,
                problems: constValueRes.problems,
            }
        }
        return {
            result: this.action,
            problems: [],
        }
    }
}

class ConstantAction implements RuntimeAction {
    readonly dependencies: RuntimeAction[] = []
    readonly returns: EvaluatedValue

    constructor(returns: EvaluatedValue) {
        this.returns = returns
    }

    compute(
        // dependencies: OpCodeResult[],
    ): RuntimeAction | OpCodeResult {
        return { value: this.returns } as GeneratedValue
    }
}
