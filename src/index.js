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
        for (let part of this.parts) {
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

    append(sql) {
        return new SqlA([this, ' ', sql], []);
    }

    parenthesize(sql) {
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
        if (i % 2 == 0) {
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

sqlA.unsafe = function unsafe(value) {
    return new SqlA([null == value ? '' : String(value)], []);
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
