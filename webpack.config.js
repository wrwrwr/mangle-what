'use strict';

const child = require('child_process');
const escapeForRegExp = require('escape-string-regexp');
const path = require('path');
const process = require('process');
const sassJson = require('node-sass-json-importer');
const sideEffectsSafe = require('side-effects-safe');
const string = require('string-replace-webpack-plugin');
const webpack = require('webpack');
const OutputBabelPlugin = require('webpack-plugin-output-babel').default;

// This configuration may be symlinked from a project, thus __dirname may
// point to its physical location (consider hard-linking if using git).
let projectDir = process.cwd();

// Global location of node modules (mostly specific for an operating system).
let globalModules = String(child.execSync('npm root -g')).trim();

// Some often-module-specific configuration can be added to package.json.
let config;
try {
    config = require(path.join(projectDir, 'package.json'));
} catch (e) {
    config = {};
}

// Our custom configuration lives under a "webpack" key in package.json.
let configWebpack = config.webpack || {};

// Are we building a library / module or an app?
let library = Boolean(configWebpack.library);

// What editions of the standard are we building for?
let esEditions = configWebpack.esEditions || [5];

// Target environment (e.g. web, node, or electron).
let target = configWebpack.target || 'web';
let web = target === 'web';

// What file are we generating (relative paths)?
let outputs = esEditions.map(edition => {
    var relativePath = config['main:es' + edition];
    var output = {
        filename: path.basename(relativePath),
        path: path.join(projectDir, path.dirname(relativePath)),
        publicPath: path.dirname(relativePath)
    };
    if (library) {
        output.library = configWebpack.library;
        output.libraryTarget = 'umd';
    }
    return output;
});

// Modules not to be bundled ("required" or to be loaded by the user).
let externals = configWebpack.externals || {};

// Some additional optimization options.
let optimize = configWebpack.optimize || {};

// Names of properties to be mangled. In general, mangling properties can be
// risky. Use "mangle-what" to find properties that would give highest savings.
let mangleableProps = optimize.props && optimize.props.mangle || [];
let mangleablePropsRegex = mangleableProps.length === 0 ? null : RegExp(
                    `^(${mangleableProps.map(escapeForRegExp).join('|')})$`);

// Often, some properties can be altogether removed without breaking anything.
let removableProps = optimize.props && optimize.props.remove || [];
let removablePropsRegex = removableProps.length === 0 ? null : RegExp(
                    `^(${removableProps.map(escapeForRegExp).join('|')})$`);

// Can statements such as obj.prop be removed? Yes, if "prop" exists and its
// getter is "pure", no, if it causes any side-effects.
let pureMembers = optimize.pure && optimize.pure.members || [];
let pureMembersRegex = pureMembers.length === 0 ? null : RegExp(
                    `^(${pureMembers.map(escapeForRegExp).join('|')})$`);

// A list of functions that typically do not have side-effects and can be
// dropped if their return value is not used.
let pureCallees = optimize.funcs && optimize.pure.callees ||
                                sideEffectsSafe.pureFuncsWithUnusualException;
let pureCalleesRegex = pureCallees.length === 0 ? null : RegExp(
                    `^(${pureCallees.map(escapeForRegExp).join('|')})$`);

// What modules should Babel process?
let babelDirs = configWebpack.babel && configWebpack.babel.dirs || [];
babelDirs.push(projectDir);

// Babel plugins used in all builds.
let babelPlugins = [
    'transform-decorators-legacy'
];
// Transforms to run on output chunks in production (with --env=p).
let babelOutputPlugins = babelPlugins.concat([
    // Removals.
    web && !library ? 'transform-remove-console' : 'transform-nothing',
    'transform-remove-debugger',
    removablePropsRegex
            ? ['transform-remove-props', {regex: removablePropsRegex,
                                          pureMembers: pureMembersRegex,
                                          pureCallees: pureCalleesRegex}]
            : 'transform-nothing',
    ['transform-remove-pure-exps', {pureMembers: pureMembersRegex,
                                    pureCallees: pureCalleesRegex}],
    // Optimization.
    'transform-react-constant-elements',
    'transform-react-inline-elements',
    // Minification.
    'transform-member-expression-literals',
    'transform-property-literals',
    'transform-merge-sibling-variables',
    'transform-minify-booleans'
]);

// What should Babel transpile to? (Just ES5 is supported at the moment :-)
let babelPresets = esEditions.map(edition => {
    switch (edition) {
        // TODO: With 2.1.0 enabling tree-shaking gives ~1% larger builds.
        case 5: return ['es2015' /*-webpack2*/, 'stage-0', 'react'];
        case 6: return ['stage-0', 'react'];
        case 7: return ['react'];
    }
});

// A loader collapsing continuation lines.
let contLines = string.replace({replacements: [
    {pattern: /,\n/g, replacement: () => ', '}
]});

// A list of plugins used by default.
let plugins = [
    new string()
];

// Plugins used with --env=p (more aggressive than -p).
let compress = {collapse_vars: true, drop_console: web && !library,
                keep_fargs: false, pure_funcs: pureCallees, pure_getters: false,
                screw_ie8: !library, unsafe: true, unsafe_comps: true,
                warnings: false};
let mangle = true;
if (mangleablePropsRegex !== null) {
    mangle = {props: {regex: mangleablePropsRegex}};
}
let productionPlugins = plugins.concat([
    new webpack.DefinePlugin({'process.env.NODE_ENV': '"production"'}),
    new webpack.LoaderOptionsPlugin({minimize: true}),
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.OccurrenceOrderPlugin(),
    new OutputBabelPlugin({compact: true, plugins: babelOutputPlugins}),
    new webpack.optimize.UglifyJsPlugin({compress, mangle, sourceMap: false}),
]);

// The configuration can be a function that takes the env argument from the
// command-line and gives an array of options with one element for each target.
module.exports = env => esEditions.map((edition, index) => ({
    entry: './main.jsx',
    output: outputs[index],
    target,
    externals,
    module: {
        loaders: [
            {
                test: /\.jsx?$/,
                include: RegExp(babelDirs.join('|')),
                loaders: 'babel',
                query: {plugins: babelPlugins, presets: babelPresets[index]}
            },
            {
                test: /\.json5$/,
                loader: 'json5'
            },
            {
                test: /\.scss$/,
                loaders: ['style', 'raw', 'sass', 'sass-resources']
            },
            // WA: https://github.com/jtangelder/sass-loader/pull/196,
            //     and https://github.com/sass/sass/issues/216.
            {
                test: /\.sass$/,
                loaders: ['style', 'raw', 'sass?indentedSyntax',
                          'sass-resources', contLines]
            }
        ]
    },
    resolve: {
        extensions: ['', '.js', '.jsx', '.json5'],
        modules: ['node_modules', globalModules]
    },
    resolveLoader: {
        modules: ['node_modules', globalModules]
    },
    devServer: {
        historyApiFallback: true
    },
    plugins: env === 'p' ? productionPlugins : plugins,
    sassLoader: {
        importer: sassJson
    },
    sassResources: [
        path.join(projectDir, 'mixins.sass')
    ]
}));
