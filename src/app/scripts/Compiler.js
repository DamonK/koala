/**
 * Compiler class
 */

'use strict';

var path             = require('path'),
    fs               = require('fs'),
    assert           = require('assert'),
    fileTypesManager = require('./fileTypesManager'),
    util             = require('./util'),
    configManager    = require('./appConfigManager'),
    fileWatcher      = require('./fileWatcher.js'),
    notifier         = require('./notifier'),
    storage          = require('./storage.js'),
    FileManager      = require('./FileManager.js');

/**
 * Create a compiler from the config.
 * @param {Object} config the configuration to use to create the compiler.
 */
function Compiler(config, dir) {
    assert(config, "'config' argument is required");
    assert(config.name, "'config' must contain 'name'");

    this.name = config.name;
    this.description = config.description;
    this.version = config.version;
    this.koalaVersion = config.koalaVersion || "*";
    this.display = config.display || this.name;

    this.maintainers = util.asArray(config.maintainers);


    this.fileTypes = [];
    util.asArray(config.file_types).forEach(function (fileTypeConfig) {
        fileTypeConfig.configPath = config.configPath;
        var fileType = fileTypesManager.addFileTypeWithConfig(fileTypeConfig, dir);
        fileType.compiler = this.name;
        this.fileTypes.push(fileType);
    }.bind(this));

    ["options", "advanced"].forEach(function (optionsName) {
        this[optionsName] = [];
        util.asArray(config[optionsName]).forEach(function (option) {
            var items;
            switch (option.type) {
                case "checkbox":
                    this[optionsName].push({
                        name: option.name,
                        display: option.display || option.name,
                        type: option.type,
                        "default": option.default || false
                    });
                    break;
                case "droplist":
                    items = [];
                    util.asArray(option.items).forEach(function (item) {
                        if (util.isObject(item)) {
                            items.push({
                                value: item.value,
                                text: item.text || item.value
                            });
                        } else if (typeof item === "string") {
                            items.push({
                                value: item,
                                text: item
                            });
                        }
                    }, this);
                    this[optionsName].push({
                        name: option.name,
                        display: option.display || option.name,
                        type: option.type,
                        items: items,
                        "default": option.default || items[0].value
                    });
                    break;
                case "text":
                    this[optionsName].push({
                        name: option.name,
                        display: option.display || option.name,
                        type: option.type,
                        "default": option.default || "",
                        placeholder: option.placeholder || "",
                        depend: util.asArray(option.depend) || []
                    });
                    break;
                case "description":
                    this[optionsName].push({
                        display: option.display,
                        type: option.type
                    });
                    break;
                default:
                    // Ignore what you don't understand in order to be forward compatible (like css)
                    // throw new Error("Unexpected option type '" + option.type + "' for compiler '" + this.name + "'.");
           }
        }, this);
    }, this);

    if (config.project_settings) {
        this.projectSettings = path.resolve(dir, config.project_settings);
    }
    
    this.libraries = util.asArray(config.libs);
}
module.exports = Compiler;

Compiler.newCompiler = function (config, dir) {
    var CompilerClass = Compiler;
    if (config.main) {
        CompilerClass = require(path.resolve(dir, config.main));
    }
    return new CompilerClass(config, dir);
}

Compiler.prototype.accepts = function (fileExt) {
    return this.fileTypes.some(function (fileType) {
        return fileType.extensions.indexOf(fileExt) !== -1;
    });
};


Compiler.prototype.getImports = function (filePath) {
    return [];
};

Compiler.prototype.compile = function (file, done) {
    this.compileFile(file, function (err) {
        if (err) {
            notifier.throwError(err.message, file.src);
        }
        if (done) {
            done(err);
        }
    });
};

Compiler.prototype.compileFile = function (file, done) {
    this.compileFileWithLib(file, done);
};

/**
 * compile file with node lib
 * @param  {Object} file file object to compiler
 * @param  {Object} done done callback
 */
Compiler.prototype.compileFileWithLib = function (file, done) {
    var options = file.settings;

    // read code
    fs.readFile(file.src, "utf8", function (rErr, code) {
        if (rErr) {
            return done(rErr);
        }

        try {
            this.compileSource(code, path.basename(file.src, path.extname(file.src)), options, function (cErr, compiledSource) {
                if (cErr) {
                    return done(cErr);
                }

                // write output
                fs.writeFile(file.output, compiledSource, "utf8", function (wErr) {
                    if (wErr) {
                        return done(wErr);
                    }

                    done();
                });
            }.bind(this));
        } catch (err) {
            done(err);
        }
    }.bind(this));
};

Compiler.prototype.compileSource = function (sourceCode, options, done) {
    done(null, sourceCode);
};

Compiler.prototype.getCommandPath = function(defaultPath) {
    var commandPath = this.getGlobalSettings().advanced.commandPath || defaultPath;

    if (commandPath.match(/ /)) {
        commandPath = '"'+ commandPath +'"';
    }

    return commandPath;
};

/**
 * Get Global Settings Of Compile
 * @param  {string} compileName compiler name
 * @return {object}             settings
 */
Compiler.prototype.getGlobalSettings = function(compileName) {
	return util.clone(configManager.getGlobalSettingsOfCompiler(compileName || this.name));
};

/**
 * Get App Config
 * @return {object} app config
 */
Compiler.prototype.getAppConfig = function () {
	return util.clone(configManager.getAppConfig());
};

/**
 * Get Project Data By Project ID
 * @param  {string} pid project id
 * @return {object}     project data
 */
Compiler.prototype.getProjectById= function (pid) {
	return util.clone(storage.getProjects()[pid]);
};

/**
 * throw error message
 * @param  {string} message  error message
 * @param  {string} filePath file path
 */
Compiler.prototype.throwError = function(message, filePath) {
	notifier.throwError(message, filePath);
};

/**
 * watch import files
 * @param  {array} imports    import array
 * @param  {string} sourceFile sourcr file
 */
Compiler.prototype.watchImports = function (imports, sourceFile) {
	fileWatcher.addImports(imports, sourceFile);
}
