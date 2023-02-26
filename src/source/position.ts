// Locations of the source.

// SourcePosition Position in the source script.
export interface SourcePosition {
    readonly moduleName: string
    readonly line: number
    readonly column: number
}


// RuntimeSourcePosition Position in the source script stored in the runtime environment.
//   Might be null if the debugging is disabled, or if it originates from inside the
//   interpreter.
export type RuntimeSourcePosition = SourcePosition | null
