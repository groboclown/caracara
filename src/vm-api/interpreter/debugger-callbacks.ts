// Callback API into the debugger for points of interest from the interpeter.

import { RuntimeError } from '../../errors'
import { CallableValue, EvaluatedValue, MemoryCell, VmMemoryIndex } from '../memory-store'
import { MemoryValue } from './memory'

export interface InterpreterDebuggerCallbacks {
    log(messageId: number, parameters: {[key: string]: number | string | boolean}): void
    generatedError(error: RuntimeError): void
    functionStarted(func: CallableValue): void
    functionReturned(func: CallableValue, value: EvaluatedValue): void
    opCodeEvaluationStart(func: CallableValue, index: VmMemoryIndex, memory: MemoryCell): void
    opCodeEvaluationResolved(func: CallableValue, index: VmMemoryIndex, value: MemoryValue): void
}
