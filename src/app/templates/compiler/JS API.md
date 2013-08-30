# JS API Documentation

## Compiler
### Properties

*All the properties in the `package.json` are available*

### Methods

#### Compiler(config)
The constructor for the compiler.

* *param* `config` is of type `Object` and corresponds to parsed JSON from `package.json`.

#### compile(file, handlers)
The method that compiles the files.

* *param* `file` is of type `File` and is the file to compile.
* *param* `emmiter` is of type `events.EventEmmiter`.

#### getGlobalSettings(compileName)
Get Global Settings Of Compile.

* *param* `compileName` is of type `String` and is the compiler name.
* *returns* an `Object` that contains all the global settings for the specified compiler.

#### getAppConfig()
Get App Config.

* *returns* `AppConfig` object.

#### getProjectById(pid)
Get Project Data By Project ID.

* *param* `pid` is of type `String` and is the project id.
* *returns* an `Project` object.

#### throwError(message, filePath)
Throw error message.

* *param* `message` is of type `String` and is the error message.
* *param* `filePath` is of type `String` and is the file path.

#### watchImports(imports, sourceFile)
Adds the given `imports` to the watch list and links them to `sourceFile`.

* *param* `imports` is of type `Array.<String>` and is the absolute file paths of the files imported.
* *param* `sourceFile` is of type `String` and is the file path of importing file.

## FileType
### Properties

*All the properties in the `package.json` are available*

#### compiler
*Type* `String`

The name ofthe compiler that can compile it.

#### icon
*Type* `String`

The absolute path of the icon.

#### watch
*Type* `Boolean`

*Default* `true`

Whether on not to watch the files of this type.

## File
### Properties

#### id
*Type* `String`

File ID.

#### pid
*Type* `String`

ID of the project this file belongs to.

#### compiler
*Type* `String`

Name of the compiler that will compile this file.

#### name
*Type* `String`

File Name.

#### src
*Type* `String`

File Path.

#### output
*Type* `String`

Output Path.

#### compile
*Type* `Boolean`

Whether to auto compile,

#### watch
*Type* `Boolean`

Whether to watch this file.

#### settings
*Type* `Object`

File specific settings.

## Project
### Properties

#### name
*Type* `String`

Project Name.

#### src
*Type* `String`

Project Path.

#### config
*Type* `Object`

Project wide settings.

#### files
*Type* `Array.<File>`

List of files in the project.
