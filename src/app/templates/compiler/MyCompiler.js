/**
 * My compiler
 */

'use strict';

var fs          = require('fs'),
    path        = require('path'),
    FileManager = global.getFileManager(),
    Compiler    = require(FileManager.appScriptsDir + '/Compiler.js');

/**
 * My Compiler
 * @param {object} config The Current Compiler config
 */
function MyCompiler(config) {
   Compiler.call(this, config);
}
require('util').inherits(MyCompiler, Compiler);

module.exports = MyCompiler;

/**
 * compile file
 * @param  {Object} file     compile file object
 * @param  {Object} emitter  compile event emitter
 */
MyCompiler.prototype.compile = function (file, emitter) {
    //compile file by use system command
    var globalSettings = this.getGlobalSettings();
    if (globalSettings.advanced.useCommand) {
        this.compileWithCommand(file, emitter);
    } else {
        this.compileWithLib(file, emitter);
    }
}

/**
 * compile file with node lib
 * @param  {Object} file      compile file object
 * @param  {Object} handlers  compile event handlers
 */
MyCompiler.prototype.compileWithLib = function (file, emitter) {
    var compiler = require(/* node.js module of compiler */),
        self = this,
        filePath = file.src,
        output = file.output,
        settings = file.settings || {};

    var triggerError = function (message) {
        emitter.emit('fail');
        emitter.emit('always');

        self.throwError(message, filePath);
    }

    //read code content
    fs.readFile(filePath, 'utf8', function (rErr, code) {
        if (rErr) {
           triggerError(rErr.message);
           return false;
        }

        var compiledOutput;
        try {
            compiledOutput = /* compile `code` use `compiler` */
        } catch (e) {
            triggerError(e.message);
            return false;
        }

        //write compiledOutput code into output
        fs.writeFile(output, compiledOutput, 'utf8', function (wErr) {
            if (wErr) {
                triggerError(wErr.message);
            } else {
                emitter.emit('done');
                emitter.emit('always');
            }
        });
    });
};

/**
 * compile file with system command
 * @param  {Object}   file    compile file object
 * @param  {Object}   emitter  compile event emitter
 */
MyCompiler.prototype.compileWithCommand = function (file, emitter) {
    var exec         = require('child_process').exec,
        self         = this,
        filePath     = file.src,
        output       = file.output,
        compressOpts = {},

        argv = [
        /* prepare the arguments of the command for compiling the file */
        // example
        '"' + filePath + '"',
        '"' + output + '"'
        ];

    var globalSettings  = this.getGlobalSettings(),
        commandPath = globalSettings.advanced.commandPath || /* command name. e.g. 'lessc' */;

    if (commandPath.match(/ /)) {
        commandPath = '"'+ commandPath +'"';
    }

    exec([commandPath].concat(argv).join(' '), {cwd: path.dirname(filePath), timeout: 5000}, function (error, stdout, stderr) {
        if (error !== null) {
            emitter.emit('fail');
            self.throwError(stderr, filePath);
        } else {
            emitter.emit('done');
        }

        // do always handler
        emitter.emit('always');
    });
};
