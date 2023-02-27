# caracara

***A Functional Language Interpreter***


## Status

Design phase.  It's currently written in TypeScript.


## Overview

[Caracara](https://en.wikipedia.org/wiki/Caracara_(genus)) started life as an experiment to create an interpreter for strongly typed functional languages that meet certain criteria.  It's intended to be safe and embed-able.

Caracara has several design goals:

* The execution time and script load time can have flexibility in the optimizations taken.  If a single script is run many times, then the tooling can take extra time to optimize it.  The system embedding Caracara can make that decision.
* Caracara performs memory manipulation and ordering of execution operations.  It does not dictate low level types (like int or float), and leaves that to the embedding system.
* There is no fixed high level language that can be used to write scripts.  Different script loaders can parse different languages.
* The execution of the scripts can be monitored and stepped through and carefully managed for run-time.

The interpreter runs a pseudo-byte code to perform data movement and invoking both user-space functions and system functions.  The base interpreter provides some examples of system functions, but it is intended to be an embedded language.

The interpreter has these parts:

* [Script](#script): The user input byte code.  These are broken into modules.
* [Script Loader](#script-loader): Loads the user input byte code.
* [Type System](#type-system): A prototype-based static typing system.
* [Memory Store](#memory-store): The memory layout.
* [Op Codes](#op-codes): The instructions that the script can use to define a program.
* [Validator](#validator): Ensures that the script meets the requirements of Caracara.
* [Interpreter](#interpreter): Runs the script's op codes to evaluate a return value.
* [System Functions](#system-functions): Functions native to the embedding system that the script can invoke.


## Type System

The interpreter has a strong typing system, meaning that it requires all values to have a type, and that the type system is enforced at load and runtime.  Types have a one-way compatibility function with a clear definition.

The interpreter allows for these basic categories:

* Native types.  These are values that the system functions know how to work with.  There should be capability to allow the script to define these values as constants.  The scripts can create aliases for native types, but the underlying native types are incompatible with each other.
* Iterable types.  Collections of a single type of element.  The collection is very explicitly *non-indexable*.  The number of elements is not enforced by the type (two objects of the same iterable type can be of different lengths).  An iterable type is compatible with another iterable type if the underlying element types are compatible.
* Structured types.  An explicit list of named keys, each of which can be its own type.  This is not a hashtable, because the keyed values must be present.  With structured types, they are prototype based, meaning that one type may be compatible with another if it provides the same named keys with matching types (there may be more keys).
* Callable types.  Scripts may define functions, and they are assigned a type and may be used as a value.
* Meta types.  Types are themselves a type.  These are really a form of native types, but are required to be included.

Additionally, because the interpreter is for functional languages, types are immutable.  Iterable types cannot have more elements added, and structured types cannot have values changed.


## Script

A user script provides several items:

* Type definitions.  All values must have an explicit type, and the script provides all of its type definitions up front.  This includes the native types, which allows the interpreter to detect whether the script is compatible with the system.
* Constant definitions.  Initial values for things, from numbers to strings to full tree layouts, can be constructed in the constants for reference by the script program.
* Function definitions.  The heart of a program.  This is parsed by the script loader.


## Script Loader

The script loader parses the user [script](#script) into a form usable by the interpreter.  It loads the type definitions into the [type system](#type-system), loads the constants into a constant store, and populates [memory stores](#memory-store) for each function.

The generated data can then be passed to the [validator](#validator) to ensure it meets all requirements and doesn't have errors.  At this point, the interpreter can be called to run script functions.


## Memory Store

The system embedding Caracara runs the interpreter on individual functions from the user script in order to retrieve a single typed value.  So, Caracara views memory from the function standpoint.

Each function is nothing more than indexed values.  The indexed values may take two forms:

* Constant reference.  One of these is the structured type argument passed to the function.
* [Op Code](#op-codes) and arguments.  The op code indicates an action for the interpreter to run, and the arguments are a list of memory indicies.  This implies a directed graph that the validator should ensure is acyclic.

The return value is also one of the indexed values, and may be either a constant reference or an opcode.

The op code + memory index references allows for the interpreter to memoize values, share them where possible, shorten execution frames, throw away unused values, perform forest detangling and parallel execution, and many other optimizations.

Under the hood, the memory system stores individual values as "cells", which may include evaluated (memoized) values.  Lists and structured types are cells that store collections of references to other cells.  The interpreter gains much of its power by condensing these cells to provide optimal paths through the program.


# System Functions

The embedding system should provide system functions to provide core functionality used by scripts.  These can be anything from adding two numbers together, to performing a map-reduce, to looking up all the zip codes in a city.

System functions can be broken into two categories:

* functional - they always return the same value for the same inputs, and are side-effect free, *for the life of the executing script*.  So, for example, an HTTP server would need to run a script separately for each client request.
* variant - they can return different output for the same input (for example, `random(10)`).

It's up to the system function to ensure it's properly marked.

Variant system functions severely cripple the optimizations inherit in a functional system by preventing memoization.  Not all interpreters are expected to support variant functions.


## Op Codes

Out of the box, Caracara provides a very limited set of op codes, and relies upon the embedding system to provide common functionality.

Each opcode has an return type that its assigned-to memory index uses.

In a few cases, an opcode may have a *runtime* return type, such as dynamic lookup.  Due to the strong typing system, the memory value that the opcode is assigned to must have a strong type, which forces the interpreter to perform time consuming runtime type checking.

Opcodes can define whether their arguments must be evaluated to a value or not.  An example of a case where they do not is the `map` function - it can return a new list with each value transformed into an invocation of the function passed to the map + the index value.

If an opcode takes a structured value or iterable value as an argument, then the definition of that opcode can include the construction of the new value.  This is a built-in feature of the functional interpreter and doesn't need explicit opcodes to create a new fixed-length list or structure.


## Interpreter

The interpreter runs a function with a memory layout, and attempts to evaluate the return memory index using as few steps as possible.


## Validator

The validator inspects the data passed from the script loader for problems and conformity to the requirements.  If it detects no problems, then it creates an interpreter to run the script.

When the validator inspects the data, it knows the constant values, and the memory layout (which includes the op codes).  There may be some scenarios which require runtime evaluation to determine legitimacy of the expressions.
