// Enable obj.should.be.nice() style assertions.
const chai = require('chai');
chai.should();

// Dirty chai, or obj.should.exist().
const dirtyChai = require('dirty-chai');
chai.use(dirtyChai);

// Transpile test sources using Babel.
require('babel-register')({
    presets: ['es2015', 'stage-0']
});
