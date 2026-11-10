const request = require('supertest');
const { expect } = require('chai');
const { BASE_URL } = require('../helpers/config');
const { createUser } = require('../helpers/data');

describe('Login', () => {
  let user;

  before(async () => {
    user = await createUser();
  });

  describe('POST /login', () => {
    it('should return 200 and a Bearer token when credentials are valid', async () => {
      const response = await request(BASE_URL)
        .post('/login')
        .set('Content-Type', 'application/json')
        .send({ email: user.email, password: user.password });

      expect(response.status).to.equal(200);
      expect(response.body.message).to.equal('Login realizado com sucesso');
      expect(response.body.authorization).to.be.a('string').and.match(/^Bearer \S+\.\S+\.\S+$/);
    });

    it('should return 401 when the password is wrong', async () => {
      const response = await request(BASE_URL)
        .post('/login')
        .send({ email: user.email, password: 'wrong-password' });

      expect(response.status).to.equal(401);
      expect(response.body.message).to.equal('Email e/ou senha inválidos');
      expect(response.body).to.not.have.property('authorization');
    });

    it('should return 401 when the email is not registered', async () => {
      const response = await request(BASE_URL)
        .post('/login')
        .send({ email: 'not.registered.user@qa.com', password: user.password });

      expect(response.status).to.equal(401);
      expect(response.body.message).to.equal('Email e/ou senha inválidos');
    });

    it('should return 400 when email and password are missing', async () => {
      const response = await request(BASE_URL).post('/login').send({});

      expect(response.status).to.equal(400);
      expect(response.body.email).to.equal('email é obrigatório');
      expect(response.body.password).to.equal('password é obrigatório');
    });

    it('should return 400 when the email format is invalid', async () => {
      const response = await request(BASE_URL)
        .post('/login')
        .send({ email: 'invalid-email', password: user.password });

      expect(response.status).to.equal(400);
      expect(response.body.email).to.equal('email deve ser um email válido');
    });
  });

  describe('Unsupported verbs', () => {
    it('should return 405 when GET is used on /login', async () => {
      const response = await request(BASE_URL).get('/login');

      expect(response.status).to.equal(405);
    });
  });
});
