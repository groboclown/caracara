// Loads the parsed script into an internal representation, ready for execution.

import { ValidationResult } from '../../errors/struct'
import { OpCodeInstruction } from './instructions'
import { Interpreter } from './interpreter'
import { ScriptContext } from './loaded-script'

// ScriptLoaderFactory Creates a script loader for an embedding system.
export interface ScriptLoaderFactory {
    // createScriptLoader Create a script loader that uses an embedding system's context.
    createScriptLoader(
        opcodes: OpCodeInstruction[],
        // TODO should this also take a list of native types?
    ): ValidationResult<ScriptLoader>
}

// ScriptLoader Constructs interpreter instances from a script context.
export interface ScriptLoader {
    // parseScript Turns the script into an interpreter context.
    //   This also validates the integrity of the script, which can generate validation problems.
    parseScript(
        context: ScriptContext,
        // TODO this should instead take a module loader callback that accepts a
        //   factory to create memory values, and to register modules.
    ): ValidationResult<Interpreter>
}
