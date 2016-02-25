mangle-what
===========

A small command-line utility to find properties that are good candidates for
mangling or removal.

Mangling (compressing by shortening names) of properties can be tricky.
Properties of built-ins, properties that may be referenced from external code
and properties that are accessed using `obj[var]` and other dynamic constructs
cannot be mangled. However, usually shortening just a couple of properties can
give most of the possible size saving.

Usage
-----

To see what may be worth mangling run the script on your optimized bundle:

```bash
mangle-what bundle.js
```

This will give you a table such as:
```bash
property            occurrences  overhead (bytes)  overhead (% total)
------------------  -----------  ----------------  ------------------
relativeTime        1572         17292             12.20
displayName         1629         16290             11.49
other               3145         12580             8.87
future              1572         7860              5.54
relative            1048         7336              5.17
parentLocale        506          5566              3.93
past                1572         4716              3.33
pluralRuleFunction  249          4233              2.99
locale              761          3805              2.68
one                 1135         2270              1.60
```

In this particular case (of a small React-ish app), mangling the first 9
properties reduced the minified (non-gzipped) bundle size from 833 kB to
752 kB, that is by about 10% of its overall size. Mangling and removing a
couple more properties (in essence getting rid of unneeded pieces of locale
data) brought that down to 546 kB, for a total saving of 34%.

Options
-------

#### count

To print more or less properties:

```bash
mangle-what --count=5 bundle.js
```

#### ignore

To exclude some properties from the statistics:

```bash
mangle-what --ignore=past future other bundle.js
```

#### no-ignore-default

By default a number of built-in and DOM properties are ignored. [A list][]
maintained by Uglify is used for that. To allow all properties to be accounted
for:

```bash
mangle-what --no-ignore-default bundle.js
```

[a list]: https://github.com/mishoo/UglifyJS2/blob/master/tools/domprops.json

Mangling properties
-------------------

How to actually mangle the properties depends on the build setup, for instance
with bare [Uglify][]:

```bash
uglifyjs bundle.js \
            --mangle-props \
            --mangle-regex='/^(displayName|relativeTime)$/' \
            --output smaller-bundle.js
```

Or with [Webpack][]:

```javascript
plugins: [
    new webpack.optimize.UglifyJsPlugin({
        mangle: {props: {regex: /^(displayName|relativeTime)$/}}
    })
]
```

[uglify]: http://lisperator.net/uglifyjs/
[webpack]: https://webpack.github.io/

Removing properties
-------------------

You may want to try [babel-remove-props][]. In `.babelrc`:

```javascript
{
    plugins: [
        ['transform-remove-props', /^(displayName|relativeTime)$/]
    ]
}
```

Unlike usual Babel transforms this one is best run on the bundled code,
possibly using a second pass.  
One full setup example can be found in this projects's [webpack-config-js][].

[babel-remove-props]: https://github.com/wrwrwr/babel-remove-props
[webpack-config-js]: https://github.com/wrwrwr/mangle-what/webpack.config.js

Installation
------------

```bash
npm install --global mangle-what
```
