let expect = require('chai').expect;
let sql = require('..');

describe('using require() instead of import', () => {
    it('should work', () => {
        let s = sql`SELECT * FROM foo`;
        expect(s.query()).to.equal('SELECT * FROM foo');
        expect(s.values()).to.have.length(0);
        expect(sql.and([s, s]).query()).to.equal(
            'SELECT * FROM foo AND SELECT * FROM foo'
        );
        expect(s instanceof sql.types.SqlA).to.be.true;
    });
});
