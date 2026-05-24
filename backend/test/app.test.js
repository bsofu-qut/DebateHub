const assert = require('assert');
const app = require('../server');

describe('Express app', () => {
    it('exports an app instance for tests and deployment', () => {
        assert.strictEqual(typeof app.listen, 'function');
    });
});
