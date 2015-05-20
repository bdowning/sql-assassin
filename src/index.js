let escape = require('pg-escape');

let valuePlaceholder = { valuePlaceholder: true };

class SqlA {
    constructor(parts, values) {
        this.parts = parts;
        this.vals = values;
        this.q = null;
    }

    flatten() {
        let parts = [ ];
        let values = [ ];
        this.flattenInto(parts, values);
        let first = 0;
        let flatParts = [ ];
        for (let i = 0; i < parts.length; ++i) {
            if (typeof parts[i] !== 'string') {
                if (first < i)
                    flatParts.push(parts.slice(first, i).join(''));
                flatParts.push(parts[i]);
                first = i + 1;
            }
        }
        if (first < parts.length)
            flatParts.push(parts.slice(first, parts.length).join(''));
        return new SqlA(flatParts, values);
    }

    flattenInto(parts, values) {
        let v = 0;
        for (let i = 0; i < this.parts.length; ++i) {
            let part = this.parts[i];
            if (part instanceof SqlA) {
                part.flattenInto(parts, values);
            } else if (part === valuePlaceholder) {
                let value = this.vals[v++];
                parts.push(part);
                values.push(value);
            } else {
                parts.push(part);
            }
        }
    }

    computeQuery() {
        if (this.q) return;
        let parts = [ ];
        let values = [ ];
        this.flattenInto(parts, values);
        let paramNumber = 0;
        for (let i = 0; i < parts.length; ++i) {
            if (parts[i] === valuePlaceholder)
                parts[i] = '$' + (++paramNumber);
        }
        this.q = {
            query: parts.join(''),
            values: values,
            anyFunctionValues: values.some(x => x instanceof Function)
        };
    }

    query() {
        this.computeQuery();
        return this.q.query;
    }

    values() {
        this.computeQuery();
        if (this.q.anyFunctionValues) {
            return this.q.values.map(v => {
                if (v instanceof Function)
                    return v.apply(null, arguments);
                return v;
            });
        } else {
            return this.q.values.slice();
        }
    }

    concat(sql) {
        return new SqlA([this, ' ', sql], []);
    }

    parenthesize() {
        return new SqlA(['(', this, ')'], []);
    }

    not() {
        return new SqlA(['NOT ', this], []);
    }
}

function sqlA(parts, ...values) {
    let outParts = new Array(parts.length + values.length);
    let outValues = [ ];

    let p = 0, v = 0;
    for (let i = 0; i < outParts.length; ++i) {
        if (i % 2 === 0) {
            outParts[i] = parts[p++];
        } else {
            let value = values[v++];
            if (value instanceof SqlA) {
                outParts[i] = value;
            } else {
                outParts[i] = valuePlaceholder;
                outValues.push(value);
            }
        }
    }

    return new SqlA(outParts, outValues);
}

sqlA.format = function format(fmt, ...args) {
    let splits = fmt.split('%');
    let parts = [ splits[0] ];
    let values = [ ];

    let v = 0;
    for (let i = 1; i < splits.length; ++i) {
        let c = splits[i].slice(0, 1);
        if (c === '') { // % due to split behavior
            if (splits.length === i + 1) {
                throw new Error('Format string ends with %');
            }
            parts[parts.length - 1] += '%' + splits[i + 1];
            ++i;
        } else {
            if (c === 'v') {
                let value = args[v++];
                if (value instanceof SqlA) {
                    parts.push(value);
                } else {
                    parts.push(valuePlaceholder);
                    values.push(value);
                }
            } else {
                throw new Error(`Unknown format directive %${c}`);
            }
            parts.push(splits[i].slice(1));
        }
    }

    return new SqlA(parts, values);
};

sqlA.unsafe = function unsafe(value) {
    return new SqlA([value == null ? '' : String(value)], []);
};

sqlA.ident = function ident(value) {
    return new SqlA([escape.ident(value)], []);
};

sqlA.literal = function literal(value) {
    return new SqlA([escape.literal(value)], []);
};

sqlA.join = function join(values, sep = ' ') {
    let len = values.length;
    if (values.length > 1)
        len += values.length - 1;
    let parts = new Array(len);
    let vals = [];
    for (let i = 0; i < values.length; ++i) {
        if (i > 0)
            parts[i * 2 - 1] = sep;
        if (values[i] instanceof SqlA) {
            parts[i * 2] = values[i];
        } else {
            vals.push(values[i]);
            parts[i * 2] = valuePlaceholder;
        }
    }
    return new SqlA(parts, vals);
};

sqlA.parenthesize = function parenthesize(values) {
    return values.map(x => x.parenthesize());
};

sqlA.and = function and(values) {
    return sqlA.join(values, ' AND ');
};

sqlA.or = function or(values) {
    return sqlA.join(values, ' OR ');
};

sqlA.comma = function or(values) {
    return sqlA.join(values, ', ');
};

sqlA.types = {
    SqlA,
    valuePlaceholder
};

export default sqlA;
