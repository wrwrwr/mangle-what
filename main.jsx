/* eslint-disable camelcase, no-console, quotes */
import Table from 'easy-table';
import {readFileSync} from 'fs';
import {TreeWalker, AST_Conditional, AST_Dot, AST_ObjectKeyVal,
        AST_ObjectProperty, AST_Seq, AST_String, AST_Sub,
        parse, readDefaultReservedFile} from 'uglify-js';
import yargs from 'yargs';


/**
 * Command-line entry point.
 */
export default function main() {
    let argv = yargs
                .usage("Usage: $0 <options> <bundle-js>")
                .demand(1, "No files to scan specified.")
                .option('count', {
                    describe: "how many candidates to print out",
                    type: 'number',
                    default: 10
                })
                .option('ignore', {
                    describe: "additional properties to ignore",
                    type: 'array',
                    default: []
                })
                .option('no-ignore-default', {
                    describe: "do not use the default ignore list",
                    type: 'boolean',
                    default: false
                })
                .argv;
    console.log(mangleWhat(argv, argv._));
}


/**
 * Finds properties in files and returns stats as a stringified table.
 */
export function mangleWhat(options, files) {
    // We'll collect all props info here.
    let props = new Map();
    let ignore;
    if (options.ignoreDefault === false) {  // WA: yargs, documenting --no-opt.
        ignore = new Set(options.ignore);
    } else {
        ignore = new Set([...options.ignore,
                          ...readDefaultReservedFile().props]);
    }
    let prop = addProp.bind(null, props, ignore);

    // AST walkers, collecting props data in the above store.
    let walkers = {};
    walkers.props = new TreeWalker(visitProps.bind(null, prop, walkers));
    walkers.strings = new TreeWalker(visitStrings.bind(null, prop, walkers));

    // Find possibly mangleable properties.
    for (let file of files) {
        let code = readFileSync(file, 'utf8');
        parse(code).walk(walkers.props);
    }

    // Sort them by possible savings.
    let names = new Array(...props.keys());
    names = names.sort((a, b) => props.get(b).overhead - props.get(a).overhead);

    // Approximate the total overhead (as for an infinite alphabet).
    let totalOverhead = names.reduce((t, n) => t + props.get(n).overhead, 0);

    // Include stats for a couple best candidates.
    let data = names.slice(0, options.count).map(name => ({
        name,
        ...props.get(name),
        overheadRelative: props.get(name).overhead / totalOverhead
    }));
    return Table.print(data, {
        name: {name: "property"},
        occurrences: {name: "occurrences"},
        overhead: {name: "overhead (bytes)"},
        overheadRelative: {name: "overhead (% total)",
                           printer: v => (v * 100).toFixed(2)}
    });
}


/**
 * Stores or increases count of a property, totals its overhead.
 * Bind it to a props store and bind a visitor to it.
 */
function addProp(props, ignore, name) {
    name = String(name);
    if (ignore.has(name)) {
        return;
    }
    if (props.has(name)) {
        let data = props.get(name);
        data.occurrences += 1;
        data.overhead += name.length - 1;
    } else {
        props.set(name, {occurrences: 1, overhead: name.length - 1});
    }
}


/**
 * Visits properties in a node.
 */
function visitProps(prop, walkers, node) {
    if (node instanceof AST_ObjectKeyVal) {
        // prop: value
        prop(node.key);
    } else if (node instanceof AST_ObjectProperty) {
        // setter or getter
        prop(node.key.name);
    } else if (node instanceof AST_Dot) {
        // obj.prop
        prop(node.property);
    } else if (node instanceof AST_Sub) {
        // obj['prop'] and similar
        node.property.walk(walkers.strings);
    }
}


/**
 * Visits property names in a "computed" member expression's argument.
 */
function visitStrings(prop, walkers, node) {
    if (node instanceof AST_String) {
        // obj['prop']
        prop(node.value);
    } else if (node instanceof AST_Conditional) {
        // obj[f ? 'prop1' : 'prop2']
        node.consequent.walk(walkers.strings);
        node.alternative.walk(walkers.strings);
    } else if (node instanceof AST_Seq) {
        // expression with a comma
        node.cdr.walk(walkers.strings);
    }
}
