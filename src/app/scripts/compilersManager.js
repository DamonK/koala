/**
 * compilers manager module
 */

'use strict';

var fs               = require('fs-extra'),
    path             = require('path'),
    util             = require('./util'),
    FileManager      = require('./FileManager'),
    fileTypesManager = require('./fileTypesManager');

exports.builtInCompilersNames = [];
exports.compilers = {};

/**
 * install the new version compiler pack
 * @param  {String} fileUrl
 */
function installNewVersion (fileUrl) {
    var $       = jQuery,
        il8n    = require('./il8n'),
        loading = $.koalaui.loading(il8n.__('Downloading the new compiler pack...'));
    util.downloadFile(fileUrl, FileManager.tmpDir(), function (filePath) {
        loading.hide();
        exports.install(filePath);
    }, function (err) {
        loading.hide();

        err = il8n.__('Compiler pack auto download failed, try download it manually.') + '<br>Error: ' + err;
        $.koalaui.alert(err, function () {
            global.gui.Shell.openExternal(fileUrl);
        });
    });
}

exports.install = function (pack) {
    var il8n    = require('./il8n'),
        $       = jQuery,
        loading = $.koalaui.loading(il8n.__('Installing the compiler pack...')),

        // reading archives
        AdmZip = require('adm-zip'),
        zip = new AdmZip(pack),
        zipEntries = zip.getEntries(),
        packageJson,
        packageContent,
        packageData;

    for (var i = 0; i < zipEntries.length; i++) {
        var zipEntry = zipEntries[i],
            entryName = zipEntry.entryName;

        if (entryName === 'package.json') {
            packageJson = true;
            packageContent = zipEntry.getData().toString('utf8');
            continue;
        }
    }

    var showError = function (message) {
        loading.hide();
        message = il8n.__('Install the compiler pack failed:') + '<br>' + il8n.__(message);
        $.koalaui.alert(message);
    }

    if (!packageJson) {
        showError('Not found the package.json file.');
        return false;
    }

    // parse package content
    packageData = util.parseJSON(packageContent);

    if (!packageData || !packageData.name || !packageData.version) {
        showError('Package.json is not complete.');
        return false;
    }

    // install the compiler pack
    var compilerDir = path.join(FileManager.userCompilersDir, packageData.name);
    zip.extractAllTo(compilerDir, true);

    // load new compiler
    var compiler = exports.loadCompiler(path.join(compilerDir, "package.json"));

    loading.hide();
    $.koalaui.tooltip('success', il8n.__('Compiler pack is installed successfully.', compiler.display));
};

/**
 * detect compiler pack update
 */
exports.detectUpdate = function () {
    var $       = jQuery,
        il8n    = require('./il8n'),
        extensionsRepo = require('./appConfigManager.js').getAppPackage().maintainers.compilers_repositories;

    function getVersionNum(version) {
        var numList = version.split('.'),
            versionNum = 0,
            multiple = 100;

        for (var i = 0; i < 3; i++) {
            if (numList[i] !== undefined) {
                versionNum += numList[i] * multiple;
                multiple = multiple / 10;
            }
        }

        return versionNum;
    }

    Object.keys(exports.compilers).forEach(function (compilerName) {
        // Not delect for built-in compilers packs
        if (exports.builtInCompilersNames.indexOf(compilerName) > -1) return false;

        var compiler = exports.compilers[compilerName], url;

        if (compiler.detectUpdate) {
            compiler.detectUpdate(installNewVersion);
        } else {
            url = extensionsRepo + '?' + util.createRdStr();
            $.getJSON(url, function (data) {
                if (data[compilerName]) {
                    var curVersion = compiler.version,
                        newVersion = data[compilerName].version;

                    if (getVersionNum(newVersion) > getVersionNum(curVersion)) {
                        $.koalaui.confirm(il8n.__('compiler pack update notification', compiler.display), function () {
                            installNewVersion(data[compilerName].download);
                        });
                    }
                }
            });
        }
    });
};

exports.loadBuiltInCompilers = function () {
    require(path.join(FileManager.appCompilersDir, "package.json")).forEach(function (compilerConfig) {
        exports.addCompilerWithConfig(compilerConfig);
    });
};

exports.loadCompiler = function (configPath) {
    global.debug(configPath);
    return exports.addCompilerWithConfig(util.readJsonSync(configPath), path.dirname(configPath));
};

exports.loadCompilers = function () {
    exports.loadBuiltInCompilers();
    FileManager.getAllPackageJSONFiles(FileManager.userCompilersDir).forEach(exports.loadCompiler);
    global.debug(exports.compilers);
};

/**
 * Get Default Settings
 * @param  {object} compiler
 * @return {object} Settings
 */
var getSettings = function (compiler) {
    var settings = {};
    compiler.options.forEach(function (item) {
        settings[item.name] = item.default;
    });
    return settings;
};

exports.addCompilerWithConfig = function (compilerConfig, dir) {
    var CompilerClass, compiler, isBuiltIn = false;
    if (!compilerConfig) {
        return null;
    }
    if (!dir) {
        dir = FileManager.appCompilersDir;
        isBuiltIn = true;
    }
    compilerConfig.configPath = dir;

    CompilerClass = require(path.resolve(dir, compilerConfig.main));
    console.log(CompilerClass);
    compiler = new CompilerClass(compilerConfig, dir);
    exports.compilers[compiler.name] = compiler;
    if (isBuiltIn) {
        exports.builtInCompilersNames.push(compiler.name);
    }

    return compiler;
};

/**
 * Load Built-in Compilers
 */
// var loadBuiltInCompilers = function () {
// 	var packagePath = path.join(FileManager.appExtensionsDir, 'package.json'),
// 		packageData = util.readJsonSync(packagePath),
// 		compilers = {},
// 		fileTypes = {};

// 	packageData.forEach(function (item) {
// 		// get file type of compiler
// 		item.file_types.forEach(function (type) {
// 			type.compiler = item.name;
// 			type.icon = path.resolve(FileManager.appExtensionsDir, type.icon);

// 			var exts = type.extension || type.extensions;
// 			exts = Array.isArray(exts) ? exts : [exts];
// 			delete type.extensions;
// 			delete type.extension;
// 			exts.forEach(function (item) {
// 				fileTypes[item] = type;
// 			})
// 		});

// 		// cache compiler
// 		delete item.file_types;
// 		item.configPath = FileManager.appExtensionsDir;
// 		compilers[item.name] = item;
// 	});

// 	exports.compilers = compilers;
// 	exports.fileTypes = fileTypes;
// };

/**
 * Get Compilers
 * @return {object} compilers
 */
exports.getCompilers = function () {
    return exports.compilers;
};

/**
 * Get Compilers As A Array
 * @return {array} compilers
 */
exports.getCompilersAsArray = function () {
    return Object.keys(exports.compilers).map(function (compilerName) {
        return this[compilerName];
    }, exports.compilers);
};

/**
 * Get Compiler By Name
 * @param  {string} name compiler name
 * @return {Object}      compiler object
 */
exports.getCompilerWithName = function (name) {
    return exports.compilers[name];
};

/**
 * Get the compiler for the file type named `fileTypeName`
 * @param  {string}   fileTypeName the file type name
 * @return {Compiler}              the compiler for the file type named `fileTypeName`
 */
exports.getCompilerForFileType = function (fileTypeName) {
    return exports.compilers[fileTypesManager.fileTypes[fileTypeName].compiler];
};

/**
 * Get Default Options Of All Compilers
 * @return {object} the default settings for all compilers
 */
exports.getDefaultOptions = function () {
    var settings = {},
        compilers = exports.compilers;
    for (var k in compilers) {
        if (compilers[k].options.length) {
            settings[k] = getSettings(compilers[k]);    
        }
    }
    return settings;
};

/**
 * Compile File
 * @param {object}   file    file object
 * @param {function} success success callback
 * @param {function} fail fail callback
 */
exports.compileFile = function (file, success, fail) {
    if (!fs.existsSync(path.dirname(file.output))) {
        fs.mkdirpSync(path.dirname(file.output));
    }

    exports.getCompilerForFileType(file.type).compile(file, success, fail);
};

// init
// loadBuiltInCompilers();
