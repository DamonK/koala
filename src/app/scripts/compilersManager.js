/**
 * compilers manager module
 */

'use strict';

var fs               = require('fs-extra'),
    path             = require('path'),
    util             = require('./util'),
    FileManager      = require('./FileManager.js'),
    fileTypesManager = require('./fileTypesManager.js'),

    il8n             = require('./il8n.js'),
    configManager    = require('./appConfigManager.js'),
    Compiler         = require('./Compiler.js'),
    $                = jQuery;

exports.builtInCompilers = [];
exports.compilers = {};

/**
 * check compiler's package data
 * @param  {object} data pack data
 * @return {array}      the missing fields
 */
var getSettings = function (compiler, key) {
	var settings = {};
	compiler[key].forEach(function (item) {
		settings[item.name] = item.default;
	});
	return settings;
}

function checkPackageData(data) {
    data = data || {};

    var fields = [];
    ['name', 'main', 'file_types', 'version', 'koalaVersion'].forEach(function (k) {
        if (!data[k]) {
            fields.push(k);
        }
    });

    return fields;
}

/**
 * install compiler
 * @param  {string} pack compiler zip pack path
 */
exports.install = function (pack) {
    var loading = $.koalaui.loading(il8n.__('Installing the compiler...')),
        AdmZip = require('adm-zip'), // reading archives
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
        message = il8n.__('The compiler install failed:' + '<br>' + message);
        $.koalaui.alert(message);
    }

    if (!packageJson) {
        showError(il8n.__('Not found the package.json file.'));
        return false;
    }

    // parse package content
    packageData = util.parseJSON(packageContent);

    var missingFields = checkPackageData(packageData);
    if (missingFields.length) {
        showError(il8n.__('Package is not complete', missingFields.join()));
        return false;
    }

    // install the compiler pack
    var name = packageData.name,
        defaultOption = {},
        compilerDir = path.join(FileManager.userCompilersDir, name),
        compiler;

    zip.extractAllTo(compilerDir, true);

    // load new compiler
    compiler = exports.addCompilerWithConfig(packageData, compilerDir);
    
    // init compiler options
    defaultOption[name] = exports.getDefaultOptionByCompilerName(name);
    configManager.initCompilerOptions(defaultOption);

    loading.hide();
    $.koalaui.tooltip('success', il8n.__('Compiler pack is installed successfully.', compiler.display));
};

/**
 * uninstall compiler
 * @param  {string} compilerName
 * @param  {Function} callback
 */
exports.uninstall = function (compilerName, callback) {
    // remove compiler dir
    fs.remove(path.join(FileManager.userCompilersDir, compilerName), function(err) {
        if (err) {
            return callback && callback(err);
        }

        // delete associated file type
        for (var k in  fileTypesManager.fileTypes) {
            if (fileTypesManager.fileTypes[k].compiler === compilerName) {
                delete fileTypesManager.fileTypes[k];
            }
        }

        // delete self
        delete exports.compilers[compilerName];

        if (callback) callback();
    });
}

/**
 * detect compiler update
 */
exports.detectUpdate = function () {
    var appPackage = configManager.getAppPackage(),
        compilersRepo = appPackage.maintainers.compilers_repositories,
        url = compilersRepo + '?' + util.createRdStr();

    $.getJSON(url, function (data) {
        if (typeof(data) !== 'object') return false;
        showUpgrade(data);
    });

    // show upgrade
    function showUpgrade (data) {
        var newVersions = [];

        // get new versions
        Object.keys(exports.compilers).forEach(function (compilerName) {
            // Not delect for built-in compilers packs
            if (exports.builtInCompilers.indexOf(compilerName) > -1) return false;

            if (data[compilerName]) {
                var oldCompiler = exports.compilers[compilerName],
                    newCompiler = data[compilerName],
                    curVersion = util.parseVersion(oldCompiler.version),
                    curKoalaVersion = util.parseVersion(appPackage.version.replace(/-.*/, '')),
                    newVersion = util.parseVersion(newCompiler.version),
                    targetKoalaVersion = util.parseVersion(newCompiler.koalaVersion.replace(/>=|-.*/, ''));

                if (newVersion > curVersion && curKoalaVersion >= targetKoalaVersion) {
                    newCompiler.name = compilerName;
                    newVersions.push(newCompiler);
                }
            }
        }); 

        if (newVersions.length === 0) return false;

        // version list
        var list = [],
            tmpl = '<a class="externalLink" href="{project}">{name} ({version})</a>';
        newVersions.forEach(function (item) {
            var str = tmpl
            .replace('{project}', item.project)
            .replace('{name}', item.name)
            .replace('{version}', item.version);

            list.push(str);
        });

        $.koalaui.alert(il8n.__('compiler pack update notification', list.join(', ')));
    }
};

var loadCompiler = function (configPath) {
    var packageData = util.readJsonSync(configPath);
    
    // check package if complete
    var missingFields = checkPackageData(packageData);
    if (missingFields.length) {
        global.debug(configPath + ' is not complete, the missing fields: \n' + missingFields.join());
        return false;
    }

    return exports.addCompilerWithConfig(packageData, path.dirname(configPath));
};

/**
 * load built-in compilers
 */
var loadBuiltInCompilers = function () {
    require(path.join(FileManager.appCompilersDir, "package.json")).forEach(function (compilerConfig) {
        exports.addCompilerWithConfig(compilerConfig);
    });
};

exports.loadCompilers = function () {
    loadBuiltInCompilers();
    FileManager.getAllPackageJSONFiles(FileManager.userCompilersDir).forEach(loadCompiler);
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
    compiler = new CompilerClass(compilerConfig, dir);
    exports.compilers[compiler.name] = compiler;
    if (isBuiltIn) {
        exports.builtInCompilersNames.push(compiler.name);
    }
    compiler.isBuiltIn = isBuiltIn;

    return compiler;
};


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
 * Get Compilers Name
 * @return {array} compilers name
 */
exports.getCompilersName = function () {
	var compilersName = [];
	for (var k in exports.compilers) {
		compilersName.push(k);
	}
	return compilersName;
}

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
 * Get Default Settings
 * @param  {object} compiler
 * @return {object} Settings
 */
var getSettings = function (compiler, key) {
	var settings = {};
	compiler[key].forEach(function (item) {
		settings[item.name] = item.default;
	})
	return settings;
}

/**
 * Get Default Options Of All Compilers
 * @return {object} the default settings for all compilers
 */
exports.getDefaultOptions = function () {
    var settings = {},
        compilers = exports.compilers;
    for (var k in compilers) {
		settings[k] = {
			options: {},
			advanced: {}
		};
		if (compilers[k].options && compilers[k].options.length) {
			settings[k].options = getSettings(compilers[k], "options");	
		}
		if (compilers[k].advanced && compilers[k].advanced.length) {
			settings[k].advanced = getSettings(compilers[k], "advanced");	
		}
    }
    return settings;
};

/**
 * Get Default Option By Compiler Name
 * @param  {string} name compiler name
 * @return {object}      compiler default option
 */
exports.getDefaultOptionByCompilerName = function (name) {
	var settings = {
		options: {},
		advanced: {}
	},
	compiler = exports.compilers[name];

	if (compiler.options && compiler.options.length) {
		settings.options = getSettings(compiler, "options");	
	}
	if (compiler.advanced && compiler.advanced.length) {
		settings.advanced = getSettings(compiler, "advanced");	
	}

	return settings;
};

/**
 * Merge Global Settings
 * @param  {string} compilerName   
 * @return {object} compilerSettings
 */
exports.getGlobalSettings = function (compilerName) {
	var configManager = require('./appConfigManager.js'),
		globalSettings = configManager.getGlobalSettingsOfCompiler(compilerName),
		// Clone Object
        compilerSettings =  JSON.parse(JSON.stringify(exports.getCompilerByName(compilerName)));

    var options = {};
    compilerSettings.options.forEach(function (item) {
        options[item.name] = globalSettings.options[item.name];
    });
    compilerSettings.options = options;

    var advanced = {};
    compilerSettings.advanced.forEach(function (item) {
        advanced[item.name] = globalSettings.advanced[item.name];
    });
    compilerSettings.advanced = advanced;

    return compilerSettings;
};

/**
 * Compile File
 * @param {object}   file File object
 * @param {function} done Done callback
 */
exports.compileFile = function (file, done) {
    if (!fs.existsSync(path.dirname(file.output))) {
        fs.mkdirpSync(path.dirname(file.output));
    }

    exports.getCompilerForFileType(file.type).compile(file, done);
};

// init
// load all compilers
loadBuiltInCompilers();
loadUserCompilers();

// init compiler default options
appConfigManager.initCompilerOptions(exports.getDefaultOptions());
