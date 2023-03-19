// Generate a source for a test.

import { SourcePosition } from "../../src/source"

// createTestSource Create a source position based on the current call stack.
//   Use the "callDepth" parameter if this is called outside the direct test function.
export function createTestSource(callDepth: number = 0): SourcePosition {
    const pos = getStackLine(callDepth + 1)
    return {
        moduleName: pos.sourceFile,
        line: pos.sourceLine,
        column: pos.sourceColumn,
    }
}

interface StackLine {
    sourceName?: string
    sourceFile: string
    sourceLine: number
    sourceColumn: number
}

const UNKNOWN_STACK_LINE = { sourceFile: "unknown", sourceLine: 0, sourceColumn: 0 } as StackLine

const STACK_MATCH_ORDER = [
    // Format is generally one of:
    // '    at Script.runInThisContext (node:vm:128:12)'
    // '    at bound (node:domain:433:15)'
    // '    at [_onLine] [as _onLine] (node:internal/readline/interface:423:12)'
    /\(([^:]+):([^:]+):(\d+):(\d+)\)/,
    /\(([^:]+):(\d+):(\d+)\)/,
    // '    at REPL1:1:28'
    /\s+([^)(:\s]+):([^:)(]+):(\d+):(\d+)/,
    /\s+([^)(:\s]+):(\d+):(\d+)/,
]

function getStackLine(parentDepth: number): StackLine {
    let err: string | undefined = undefined
    try {
        throw new Error()
    } catch (e) {
        err = (<Error>e).stack
    }
    if (err === undefined) {
        return UNKNOWN_STACK_LINE
    }
    const stackLines = err.split("\n")
    // Line 0: The exception as a string line.
    // Line 1: This function.
    const lineNo = parentDepth + 2
    if (stackLines.length >= lineNo) {
        return UNKNOWN_STACK_LINE
    }
    const line = stackLines[lineNo]
    for (let idx = 0; idx < STACK_MATCH_ORDER.length; idx++) {
        const match = STACK_MATCH_ORDER[idx].exec(line)
        if (match !== null) {
            const count = match.length
            if (count === 1) {
                return {
                    sourceFile: match[0],
                    sourceLine: 0,
                    sourceColumn: 0,
                }
            }
            if (count === 2) {
                return {
                    sourceFile: match[0],
                    sourceLine: +match[1],
                    sourceColumn: 0,
                }
            }
            if (count === 3) {
                return {
                    sourceFile: match[0],
                    sourceLine: +match[1],
                    sourceColumn: +match[2],
                }
            }
            if (count > 3) {
                return {
                    sourceName: match[0],
                    sourceFile: match[1],
                    sourceLine: +match[2],
                    sourceColumn: +match[3],
                }
            }
        }
    }
    return UNKNOWN_STACK_LINE
}
