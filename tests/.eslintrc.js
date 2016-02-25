module.exports = {
    'env': {
        'mocha': true,
    },
    'globals': {
        // False means a variable is "read-only".
        // Console sometimes needs to be replaced by a stub.
        'console': false,
        // Chai's expect() for cases when undefinedness needs to be checked.
        'expect': false,
        // Spies and stubs.
        'sinon': false
    },
    'rules': {
        // Mocha's it(..., f) with `this` bound in f.
        'func-names': 0,
        // Console output sometimes needs to be tested.
        'no-console': 0,
        // Magic numbers are fine in tests.
        'no-magic-numbers': 0,
        'rapid7/static-magic-numbers': 0,
        // Mocha's undocumented this.skip().
        'no-invalid-this': 1,
        // Double quotes for human-readable strings.
        'quotes': [0, 'single'],
        // Usually there is just a single component created in a case.
        'react/display-name': 0
    }
};
