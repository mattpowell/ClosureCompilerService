Readme
=========

ClosureCompilerService is a lightweight service that sits on top of Closure Compiler. It's designed to make the lookup of infrequently used files less expensive and the total compilation time of several files quicker (compared to running Closure Compiler via closurebuilder.py). It also has the advantage of having the flexibility to pass custom flags to the compiler whereas if you use the REST service provided by Google, you're pretty much stuck with the vanilla set of options.

Features
--------
* It's quick, cuts compile time vs closurebuilder.py (or REST service) by 2-3x.
* Can automatically cache Closure Library files
* Makes accessible individual features of the compiler. E.g. you can specify SIMPLE_OPTIMZATIONS **and** dead code elimination!
* Communication is done purely in JSON.

API
---------------------

***-- more detail to come --***

You'll be interacting with the service via TCP sockets. Individual messages are parsed from the stream via valid JSON objects. The base of the JSON object will have a `cmd` property and will be one of the following values:

* `echo` - will echo back out to the client whatever's passed in in the `msg` property.
* `addFile` - Adds an individual file. See example below for more detail.
* `addFiles` - Batch call to add lots of files. See example below for more detail.
* `getFiles` - array of all files currently cached. Useful for when the client needs to sync up.
* `compile` - Where all the magic happens. Options that can be passed with the `args` property are mostly detailed by running: `java -jar compiler.jar --help`

Examples
--------
**echo**

    {
        cmd: 'echo',
        msg: 'message to get back'
    }
    //message to get back
**addFile**
    
    {
        cmd: 'addFile'
        file: {
            //needs to be the same name that will be referenced when `compile` gets called
            name: 'file1.js',
            //contents to be compiled
            contents: '...',
            //if name and contents aren't passed, ClosureCompilerService can read the file from disk via the path property. if all 3 properties are passed in, name and contents will be prioritized.
            path: 'optional/path/to/file1.js',
            //force ClosureCompilerService to read file from disk (even if it's already cached)
            reload: true|false
            
        }
    }
    //OK
**addFiles**
        
    {
        cmd: 'addFile',
        files: [
            {
                //same as addFile configuration.
                name: 'file2.js',
                //same as addFile configuration.
                contents: '...',
                //same as addFile configuration.
                path: 'optional/path/to/file2.js',
                //same as addFile configuration.
                reload: true|false
            },
            {
                //same as addFile configuration.
                name: 'file3.js',
                //same as addFile configuration.
                contents: '...',
                //same as addFile configuration.
                path: 'optional/path/to/file3.js',
                //same as addFile configuration.
                reload: true|false
            },
        ]
    }
    //OK
        
**getFiles**

    {
        cmd: 'getFiles'
    }
    //['file1.js', 'file2.js', 'file3.js']
**compile**

    {
        cmd: 'compile',
        args: {
            //needs to be the same name as when added via addFile(s)
            js:['file1.js', 'file2.js', 'file3.js'],
            compilation_level: ADVANCED_OPTIMIZATIONS|SIMPLE_OPTIMIZATIONS|WHITESPACE_ONLY,
            accept_const_keyword: true|false,
            charset: 'utf-8',
            closure_entry_point: 'main.entry.point',
            create_name_map_files: true|false, //although the param is accepted, there's no way to receive the output as of yet.
            debug: true|false,
            define: ['varName=true'], //values to define at compile time. Not working yet.
            externs: ['path/to/externs.js','or named file added via addFile'],
            manage_closure_dependencies: true|false,
            process_closure_primitives: true|false,
            deadAssignmentElimination: true|false,
            removeDeadCode: true|false,
            ideMode: true|false,
            warning_level: QUIET|DEFAULT|VERBOSE
        }
    }
    //...compiled source...

TODO
--------------------

* Read Closure Library from a zip. Currently clocking in at 13.3mb... need to slim that down.
* Get `create_name_map_files` working.
* Add support for:
    * `property_map_input_file`, `property_map_output_file`, `source_map_format`, `translations_file`, `variable_map_input_file`, `variable_map_output_file`, `module`, `module_wrapper`, `output_wrapper`, and `generate_exports`.
* Look in to using `HotSwapCompilerPass`.
* Write example clients for PHP and Python.
* Clean up messaging/verbosity param.
* ...?

  
  