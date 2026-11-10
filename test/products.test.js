const request = require('supertest');
const { expect } = require('chai');
const { BASE_URL } = require('../helpers/config');
const { buildProduct, createUser, createProduct, createCart, getProduct } = require('../helpers/data');

const NON_EXISTENT_ID = 'AAAAAAAAAAAAAAAA';
const AUTH_ERROR = 'Token de acesso ausente, inválido, expirado ou usuário do token não existe mais';

describe('Products', () => {
  let admin;
  let customer;

  before(async () => {
    admin = await createUser({ admin: true });
    customer = await createUser({ admin: false });
  });

  describe('GET /produtos', () => {
    it('should return 200 and a count that matches the list size', async () => {
      const response = await request(BASE_URL).get('/produtos');

      expect(response.status).to.equal(200);
      expect(response.body.produtos).to.be.an('array').and.have.lengthOf(response.body.quantidade);
    });

    it('should return 400 when the product does not exist', async () => {
      const response = await request(BASE_URL).get(`/produtos/${NON_EXISTENT_ID}`);

      expect(response.status).to.equal(400);
      expect(response.body.message).to.equal('Produto não encontrado');
    });
  });

  describe('POST /produtos', () => {
    it('should return 201 and persist the product when an admin sends valid data', async () => {
      const product = buildProduct();

      const response = await request(BASE_URL)
        .post('/produtos')
        .set('Authorization', admin.token)
        .send(product);

      expect(response.status).to.equal(201);
      expect(response.body.message).to.equal('Cadastro realizado com sucesso');

      const saved = await getProduct(response.body._id);
      expect(saved).to.include(product);
      expect(saved.preco).to.be.a('number');
      expect(saved.quantidade).to.be.a('number');
    });

    it('should return 400 when a product with the same name already exists', async () => {
      const existing = await createProduct(admin.token);

      const response = await request(BASE_URL)
        .post('/produtos')
        .set('Authorization', admin.token)
        .send(buildProduct({ nome: existing.nome }));

      expect(response.status).to.equal(400);
      expect(response.body.message).to.equal('Já existe produto com esse nome');
    });

    it('should return 400 listing every missing required field', async () => {
      const response = await request(BASE_URL)
        .post('/produtos')
        .set('Authorization', admin.token)
        .send({});

      expect(response.status).to.equal(400);
      expect(response.body).to.have.all.keys('nome', 'preco', 'descricao', 'quantidade');
    });

    describe('Authentication and authorization', () => {
      it('should return 401 when no token is sent', async () => {
        const response = await request(BASE_URL).post('/produtos').send(buildProduct());

        expect(response.status).to.equal(401);
        expect(response.body.message).to.equal(AUTH_ERROR);
      });

      it('should return 401 when the token signature was tampered with', async () => {
        const response = await request(BASE_URL)
          .post('/produtos')
          .set('Authorization', `${admin.token}tampered`)
          .send(buildProduct());

        expect(response.status).to.equal(401);
        expect(response.body.message).to.equal(AUTH_ERROR);
      });

      it('should return 401 when the token belongs to a deleted user', async () => {
        const removedAdmin = await createUser({ admin: true });
        await request(BASE_URL).delete(`/usuarios/${removedAdmin._id}`);

        const response = await request(BASE_URL)
          .post('/produtos')
          .set('Authorization', removedAdmin.token)
          .send(buildProduct());

        expect(response.status).to.equal(401);
        expect(response.body.message).to.equal(AUTH_ERROR);
      });

      it('should return 403 when the user is not an admin', async () => {
        const response = await request(BASE_URL)
          .post('/produtos')
          .set('Authorization', customer.token)
          .send(buildProduct());

        expect(response.status).to.equal(403);
        expect(response.body.message).to.equal('Rota exclusiva para administradores');
      });
    });

    describe('Boundary values', () => {
      // Rule: price must be a positive integer (boundary at 1)
      const priceCases = [
        { preco: 0, status: 400, message: 'preco deve ser um número positivo' },
        { preco: 1, status: 201 },
        { preco: 2, status: 201 },
      ];

      priceCases.forEach(({ preco, status, message }) => {
        it(`should return ${status} when price is ${preco}`, async () => {
          const response = await request(BASE_URL)
            .post('/produtos')
            .set('Authorization', admin.token)
            .send(buildProduct({ preco }));

          expect(response.status).to.equal(status);
          if (message) expect(response.body.preco).to.equal(message);
        });
      });

      // Rule: stock quantity must be greater than or equal to 0 (boundary at 0)
      const quantityCases = [
        { quantidade: -1, status: 400, message: 'quantidade deve ser maior ou igual a 0' },
        { quantidade: 0, status: 201 },
        { quantidade: 1, status: 201 },
      ];

      quantityCases.forEach(({ quantidade, status, message }) => {
        it(`should return ${status} when stock quantity is ${quantidade}`, async () => {
          const response = await request(BASE_URL)
            .post('/produtos')
            .set('Authorization', admin.token)
            .send(buildProduct({ quantidade }));

          expect(response.status).to.equal(status);
          if (message) expect(response.body.quantidade).to.equal(message);
        });
      });

      it('should return 400 when price is a decimal number', async () => {
        const response = await request(BASE_URL)
          .post('/produtos')
          .set('Authorization', admin.token)
          .send(buildProduct({ preco: 10.5 }));

        expect(response.status).to.equal(400);
        expect(response.body.preco).to.equal('preco deve ser um inteiro');
      });
    });
  });

  describe('PUT /produtos/{_id}', () => {
    it('should return 200 and update the product when the user is an admin', async () => {
      const product = await createProduct(admin.token);
      const changes = buildProduct({ preco: 999, quantidade: 3 });

      const response = await request(BASE_URL)
        .put(`/produtos/${product._id}`)
        .set('Authorization', admin.token)
        .send(changes);

      expect(response.status).to.equal(200);
      expect(response.body.message).to.equal('Registro alterado com sucesso');
      expect(await getProduct(product._id)).to.include(changes);
    });

    it('should return 403 and keep the product unchanged when the user is not an admin', async () => {
      const product = await createProduct(admin.token);

      const response = await request(BASE_URL)
        .put(`/produtos/${product._id}`)
        .set('Authorization', customer.token)
        .send(buildProduct({ preco: 1 }));

      expect(response.status).to.equal(403);
      expect((await getProduct(product._id)).preco).to.equal(product.preco);
    });
  });

  describe('DELETE /produtos/{_id}', () => {
    it('should return 200 and remove the product when the user is an admin', async () => {
      const product = await createProduct(admin.token);

      const response = await request(BASE_URL)
        .delete(`/produtos/${product._id}`)
        .set('Authorization', admin.token);

      expect(response.status).to.equal(200);
      expect(response.body.message).to.equal('Registro excluído com sucesso');

      const deleted = await request(BASE_URL).get(`/produtos/${product._id}`);
      expect(deleted.status).to.equal(400);
    });

    it('should return 400 when the product is part of a cart', async () => {
      const product = await createProduct(admin.token);
      const buyer = await createUser();
      const cart = await createCart(buyer.token, [{ idProduto: product._id, quantidade: 1 }]);

      const response = await request(BASE_URL)
        .delete(`/produtos/${product._id}`)
        .set('Authorization', admin.token);

      expect(response.status).to.equal(400);
      expect(response.body.message).to.equal('Não é permitido excluir produto que faz parte de carrinho');
      expect(response.body.idCarrinhos).to.include(cart.body._id);
    });
  });
});
