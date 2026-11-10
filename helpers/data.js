const request = require('supertest');
const { BASE_URL } = require('./config');
const { getToken } = require('./auth');
const userFixture = require('../fixtures/user.json');
const productFixture = require('../fixtures/product.json');

function uniqueSuffix() {
  return `${Date.now()}${Math.floor(Math.random() * 100000)}`;
}

function buildUser(overrides = {}) {
  return { ...userFixture, email: `qa.${uniqueSuffix()}@qa.com`, ...overrides };
}

function buildProduct(overrides = {}) {
  return { ...productFixture, nome: `QA Product ${uniqueSuffix()}`, ...overrides };
}

async function createUser({ admin = false } = {}) {
  const user = buildUser({ administrador: String(admin) });
  const response = await request(BASE_URL).post('/usuarios').send(user);
  const token = await getToken(user.email, user.password);

  return { ...user, _id: response.body._id, token };
}

async function createProduct(adminToken, overrides = {}) {
  const product = buildProduct(overrides);
  const response = await request(BASE_URL)
    .post('/produtos')
    .set('Authorization', adminToken)
    .send(product);

  return { ...product, _id: response.body._id };
}

async function createCart(token, items) {
  return request(BASE_URL)
    .post('/carrinhos')
    .set('Authorization', token)
    .send({ produtos: items });
}

async function getProduct(id) {
  const response = await request(BASE_URL).get(`/produtos/${id}`);
  return response.body;
}

module.exports = { buildUser, buildProduct, createUser, createProduct, createCart, getProduct };
