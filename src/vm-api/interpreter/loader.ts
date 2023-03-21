// Loads the parsed script into an internal representation, ready for execution.

import { ValidationResult } from '../../errors/struct'
import { VmNativeType } from '../type-system'
import { OpCodeInstruction } from './instructions'
import { Interpreter } from './interpreter'
import { Module } from './loaded-script'

// ScriptLoaderFactory Creates a script loader for an embedding system.
export interface ScriptLoaderFactory {
    // createScriptLoader Create a script loader that uses an embedding system's context.
    //   The implementing system needs to provide the native types that it supports.
    //   It's up to the caller to then also construct the right value for the type when
    //   the ScriptLoader.parseScript is called.
    //   The types that are added implicitly through the opcodes and module constructor are
    //   stored internally.  It's up to the implementing system to ensure they maintain
    //   consistency across names.
    createScriptLoader(
        opcodes: OpCodeInstruction[],
        nativeTypes: VmNativeType[],
    ): ValidationResult<ScriptLoader>
}

// ScriptLoader Constructs interpreter instances from a script context.
export interface ScriptLoader {
    // parseScript Turns the script into an interpreter context.
    //   This also validates the integrity of the script, which can generate validation problems.
    parseScript(
        modules: Module[],
    ): ValidationResult<Interpreter>
}
