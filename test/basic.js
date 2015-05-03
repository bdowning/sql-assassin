import { expect } from 'chai';
import sql from '..';

describe('with no arguments', () => {
    it('should be creatable', () => {
        let s = sql`SELECT * FROM foo`;
    });

    it('should return the input string for query', () => {
        let s = sql`SELECT * FROM foo`;
        expect(s.query()).to.equal('SELECT * FROM foo');
        expect(s.values()).to.have.length(0);
    });

    it('should work if empty', () => {
        let s = sql``;
        expect(s.query()).to.equal('');
        expect(s.values()).to.have.length(0);
    });

    it('should work if completely empty (raw initialized)', () => {
        let s = new sql.types.SqlA([], []);
        expect(s.query()).to.equal('');
        expect(s.values()).to.have.length(0);
    });
});

describe('with arguments', () => {
    it('should be creatable', () => {
        let s = sql`SELECT * FROM foo WHERE id = ${5}`;
    });

    it('should return the correct placeholders and values', () => {
        let s = sql`SELECT * FROM foo WHERE id = ${5}`;
        expect(s.vals).to.deep.equal([5]);
        expect(s.query()).to.equal('SELECT * FROM foo WHERE id = $1');
        expect(s.values()).to.deep.equal([5]);
        expect(s.q.anyFunctionValues).to.equal(false);
    });

    it('should call function values with args from .values(...args)', () => {
        let s = sql`SELECT * FROM foo WHERE id = ${(x, y) => (5 + x) * y}`;
        expect(s.query()).to.equal('SELECT * FROM foo WHERE id = $1');
        expect(s.values(3, 8)).to.deep.equal([64]);
        expect(s.q.anyFunctionValues).to.equal(true);
    });

    it('should support unsafe inlines', () => {
        let inline = sql.unsafe('*');
        expect(inline.parts).to.have.length(1);
        expect(inline.vals).to.deep.equal([]);
        expect(inline.parts[0]).to.equal('*');
        expect(inline.query()).to.equal('*');
        expect(inline.values()).to.deep.equal([]);

        let cols = sql`${sql.unsafe('*')}`;
        expect(cols.parts).to.have.length(3);
        expect(cols.vals).to.deep.equal([]);
        expect(cols.parts[1]).to.be.an.instanceof(sql.types.SqlA);
        expect(cols.query()).to.equal('*');
        expect(cols.values()).to.deep.equal([]);
    });

    it('should be nestable', () => {
        let cols = sql`*`;
        let test1 = sql`id = ${5}`;
        let test2 = sql`name = ${'hi'}`;
        let tests = sql`${test1} AND ${test2}`;
        let s = sql`SELECT ${cols} FROM foo WHERE ${tests}`;
        expect(s.parts).to.deep.equal([
            'SELECT ', cols, ' FROM foo WHERE ', tests, ''
        ]);
        expect(s.vals).to.deep.equal([]);

        expect(s.query()).to.equal('SELECT * FROM foo WHERE id = $1 AND name = $2');
        expect(s.values()).to.deep.equal([5, 'hi']);
    });

    it('should support unsafe inlines nested', () => {
        let cols = sql`${sql.unsafe('*')}`;
        let tests = sql`id = ${5}`;
        let s = sql`SELECT ${cols} FROM foo WHERE ${tests}`;
        expect(s.parts).to.deep.equal([
            'SELECT ', cols, ' FROM foo WHERE ', tests, ''
        ]);
        expect(s.vals).to.deep.equal([]);

        expect(s.query()).to.equal('SELECT * FROM foo WHERE id = $1');
        expect(s.values()).to.deep.equal([5]);
    });

    it('should be flattenable', () => {
        let cols = sql`${sql.unsafe('*')}`;
        let test1 = sql`id = ${5}`;
        let test2 = sql`name = ${'hi'}`;
        let tests = sql`${test1} AND ${test2}`;
        let s = sql`SELECT ${cols} FROM foo WHERE ${tests}`.flatten();
        expect(s.parts).to.deep.equal([
            'SELECT * FROM foo WHERE id = ',
            sql.types.valuePlaceholder,
            ' AND name = ',
            sql.types.valuePlaceholder,
            ''
        ]);
        expect(s.vals).to.deep.equal([5, 'hi']);

        expect(s.query()).to.equal('SELECT * FROM foo WHERE id = $1 AND name = $2');
        expect(s.values()).to.deep.equal([5, 'hi']);
    });
});

describe('utilities', () => {
    describe('escaping', () => {
        it('should support escaping literals', () => {
            let s = sql.literal('foobar');
            expect(s.query()).to.equal("'foobar'");
        });

        it('should support escaping identifiers', () => {
            let s = sql.ident('table');
            expect(s.query()).to.equal('"table"');
        });
    });

    describe('join', () => {
        it('should support joining nothing', () => {
            let s = sql.join([]);
            expect(s.query()).to.equal('');
            expect(s.values()).to.have.length(0);
        });

        it('should join sql', () => {
            let columns = ['foo', 'bar', 'baz'];
            let s = sql.join(columns.map(sql.ident), ', ');
            expect(s.query()).to.equal('foo, bar, baz');
            expect(s.values()).to.have.length(0);
        });

        it('should support and convenience function', () => {
            let columns = ['foo', 'bar', 'baz'];
            let s = sql.and(columns.map(sql.ident));
            expect(s.query()).to.equal('foo AND bar AND baz');
            expect(s.values()).to.have.length(0);
        });

        it('should support or convenience function', () => {
            let columns = ['foo', 'bar', 'baz'];
            let s = sql.or(columns.map(sql.ident));
            expect(s.query()).to.equal('foo OR bar OR baz');
            expect(s.values()).to.have.length(0);
        });

        it('should support comma convenience function', () => {
            let columns = ['foo', 'bar', 'baz'];
            let s = sql.comma(columns.map(sql.ident));
            expect(s.query()).to.equal('foo, bar, baz');
            expect(s.values()).to.have.length(0);
        });
    });

    describe('parenthesize', () => {
        it('should parenthesize a single val', () => {
            let s = sql`foo = 'bar'`;
            expect(s.parenthesize().query()).to.equal("(foo = 'bar')");
        });

        it('should parenthesize an array', () => {
            let s = [
                sql`foo = 'bar'`,
                sql`bar = baz`,
                sql`TRUE`
            ];
            expect(sql.and(sql.parenthesize(s)).query()).to.equal(
                "(foo = 'bar') AND (bar = baz) AND (TRUE)"
            );
        });
    });

    describe('concat', () => {
        it('should chain concats', () => {
            let s = sql`SELECT *`
                .concat(sql`FROM foobar`)
                .concat(sql`WHERE TRUE`);
            expect(s.query()).to.equal('SELECT * FROM foobar WHERE TRUE');
        });
    });

    describe('not', () => {
        it('should support negation', () => {
            let s = sql`foo = bar`;
            expect(s.not().query()).to.equal('NOT foo = bar');
        });
    });
});
