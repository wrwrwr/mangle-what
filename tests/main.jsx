import {mangleWhat} from '../main';


suite("mangle-what", () => {
    test("object literal properties", () => {
        let table = mangleWhat({count: 3, ignore: []},
                               ['tests/fixtures/literals.js']);
        table.should.match(/longestProperty\s+1\s+14\s+3[67]/);
        table.should.match(/longerProperty\s+1\s+13\s+34/);
        table.should.match(/longProperty\s+1\s+11\s+2[89]/);
    });

    test("member expression assignments", () => {
        let table = mangleWhat({count: 3, ignore: []},
                               ['tests/fixtures/assignments.js']);
        table.should.match(/longestProperty\s+1\s+14\s+3[67]/);
        table.should.match(/longerProperty\s+1\s+13\s+34/);
        table.should.match(/longProperty\s+1\s+11\s+2[89]/);
    });

    test("count option", () => {
        let table = mangleWhat({count: 2, ignore: []},
                               ['tests/fixtures/assignments.js']);
        table.should.match(/longestProperty/);
        table.should.match(/longerProperty/);
        table.should.not.match(/longProperty/);
    });

    test("ignore option", () => {
        let table = mangleWhat({count: 5, ignore: ['longCustomProperty']},
                               ['tests/fixtures/builtins.js']);
        table.should.not.match(/longCustomProperty/);
        table.should.match(/customProperty/);
        table.should.not.match(/setAttribute/);
        table.should.not.match(/length/);
    });

    test("no-ignore-default option", () => {
        let table = mangleWhat({count: 5, ignore: [], ignoreDefault: false},
                               ['tests/fixtures/builtins.js']);
        table.should.match(/longCustomProperty/);
        table.should.match(/customProperty/);
        table.should.match(/setAttribute/);
        table.should.match(/length/);
    });
});
