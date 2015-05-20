sql-assassin — An unfancy node.js SQL builder for ES6
=====================================================

[![Build Status](https://travis-ci.org/bdowning/sql-assassin.svg?branch=master)](https://travis-ci.org/bdowning/sql-assassin)

Introduction
------------

`sql-assassin` is an unfancy SQL statement builder
for node.js and ES6 template strings.
It does not attempt to be an ORM or even understand SQL in any way.
It only helps you construct SQL strings with bound parameters.

(Examples need to go here;
see [test/basic.js](test/basic.js) for usage information.)

API Reference
-------------

This API reference assumes you've imported `sql-assassin`
into the `sqlA` variable:

```javascript
import sqlA from 'sql-assassin';
// or
let sqlA = require('sql-assassin');
```

### Template string tag

#### sqlA\`...\`: SqlA

The `sqlA` template string tag is the main interface
for constructing SQL statements in `sql-assassin`.
Interpolated values will be treated as follows:

* A SqlA value will be inserted in-line at that point,
  including its values.

* A function will be replaced with a placeholder.
  The value passed to the placeholder will be
  the result of calling the function with the `args`
  passed to the `.value(...args)` method.

* Any other value be replaced with a placeholder
  and sent as-is.

A value can be checked to see if it is a SqlA
by `val instanceof sqlA.types.SqlA`.

### SqlA class methods

#### this.query(): String

Computes and returns the SQL query for the SqlA instance `this`,
with placeholders for bound values.

#### this.values(...args): Array&lt;T&gt;

Computes and returns the bound values for the SqlA instance `this`.
Any function values will be called with `args`
and the result will be used as the value.

#### this.flatten(): SqlA

Returns a new SqlA that is the flattened representation of `this`.
All adjacent strings will be combined together.
The new SqlA is functionally identical to the old,
but may perform better when rendered many times.

#### this.concat(sqla: SqlA): SqlA

Returns a new SqlA that is the concatenation of `this` with `sqla`
with a space in between.

#### this.parenthesize(): SqlA

Returns a new SqlA that is `this` wrapped in parentheses.

#### this.not(): SqlA

Returns a new SqlA that is `this` prefixed with `'NOT '`.

### Static methods

#### sqlA.format(fmt: String, ...args): SqlA

Creates a new SqlA by evaluating the format string `fmt`
with the arguments `args`.
Possible format directives are:

* `%v`: Consumes an argument and treats it
  as a value to be inserted as if it were an interpolated value
  in a `sqlA` tagged template string.

* `%%`: Inserts the literal `%` character.
  Does not consume an argument.

#### sqlA.unsafe(string: String): SqlA

Creates a new SqlA that contains the literal,
unescaped string `string`.
Be careful to avoid SQL injection attacks when using this.

#### sqlA.ident(ident: String): SqlA

Creates a new SqlA that contains the escaped representation
of the identifier contained in `ident`.

#### sqlA.literal(obj: String): SqlA

Creates a new SqlA that contains the escaped representation
of the literal contained in `obj`.
Currently only strings and `null` work.

#### sqlA.join(parts: Array<SqlA>, sep: String = ' '): SqlA

Creates a new SqlA that consists of all of `parts`
joined together by `sep`.

#### sqlA.and(parts: Array<SqlA>): SqlA

A convenience method for joining by `' AND '`.

#### sqlA.or(parts: Array<SqlA>): SqlA

A convenience method for joining by `' OR '`.

#### sqlA.comma(parts: Array<SqlA>): SqlA

A convenience method for joining by `', '`.
