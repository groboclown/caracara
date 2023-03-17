// The memory store for the interpreter.

// ScriptMemory The basic memory store for the interpreter.
//   Optimial memory layout and management is critical to having a high performance
//   interpreter.  The more the memory can identify duplicate memory cells, the less
//   the interpreter has to do.
//
//   Memory also needs to track cell allocation usage within a call context.
//   If a factory creates a cell, but it isn't in the return value chain, then
//   it must be cleaned up.
//
//   This is version 1.  That means it's a simple. get-it-working implementation.
export class ScriptMemory {

}

