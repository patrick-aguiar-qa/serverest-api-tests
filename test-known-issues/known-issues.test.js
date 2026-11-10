// These tests assert the CORRECT behavior and are expected to FAIL until the bugs are fixed.
// They are kept out of the regression suite (npm test) and documented in BUG_REPORTS.md.
const request = require('supertest');
const { expect } = require('chai');
const { BASE_URL } = require('../helpers/config');
const { buildProduct, createUser } = require('../helpers/data');

function decodeJwtPayload(bearerToken) {
  const payload = bearerToken.replace('Bearer ', '').split('.')[1];
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
}

describe('Known issues', () => {
  it('BUG-01: login token should not carry the user password in its payload', async () => {
    const user = await createUser();

    const payload = decodeJwtPayload(user.token);

    expect(payload).to.not.have.property('password');
  });

  it('BUG-02: GET /usuarios should not expose user passwords', async () => {
    const user = await createUser();

    const response = await request(BASE_URL).get('/usuarios').query({ email: user.email });

    expect(response.body.usuarios[0]).to.not.have.property('password');
  });

  it('BUG-03: POST /produtos should return 400 when price is sent as a string', async () => {
    const admin = await createUser({ admin: true });

    const response = await request(BASE_URL)
      .post('/produtos')
      .set('Authorization', admin.token)
      .send(buildProduct({ preco: '100' }));

    expect(response.status).to.equal(400);
  });
});
