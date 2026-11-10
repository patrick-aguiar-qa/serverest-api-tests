const request = require('supertest');
const { BASE_URL } = require('./config');

async function getToken(email, password) {
  const response = await request(BASE_URL)
    .post('/login')
    .set('Content-Type', 'application/json')
    .send({ email, password });

  return response.body.authorization;
}

module.exports = { getToken };
