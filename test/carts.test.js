const request = require('supertest');
const { expect } = require('chai');
const { BASE_URL } = require('../helpers/config');
const { createUser, createProduct, createCart, getProduct } = require('../helpers/data');

describe('Carts', () => {
  let admin;
  let buyer;
  let product;

  before(async () => {
    admin = await createUser({ admin: true });
  });

  beforeEach(async () => {
    buyer = await createUser();
    product = await createProduct(admin.token, { preco: 120, quantidade: 5 });
  });

  describe('POST /carrinhos', () => {
    it('should return 201 and reserve the items from stock', async () => {
      const response = await createCart(buyer.token, [{ idProduto: product._id, quantidade: 2 }]);

      expect(response.status).to.equal(201);
      expect(response.body.message).to.equal('Cadastro realizado com sucesso');
      expect((await getProduct(product._id)).quantidade).to.equal(3);
    });

    it('should calculate total price and total quantity across products', async () => {
      const second = await createProduct(admin.token, { preco: 30, quantidade: 10 });

      const created = await createCart(buyer.token, [
        { idProduto: product._id, quantidade: 2 },
        { idProduto: second._id, quantidade: 3 },
      ]);
      const response = await request(BASE_URL).get(`/carrinhos/${created.body._id}`);

      expect(response.status).to.equal(200);
      expect(response.body.precoTotal).to.equal(2 * 120 + 3 * 30);
      expect(response.body.quantidadeTotal).to.equal(5);
      expect(response.body.idUsuario).to.equal(buyer._id);
      expect(response.body.produtos).to.have.lengthOf(2);
    });

    it('should return 400 when the user already has a cart', async () => {
      await createCart(buyer.token, [{ idProduto: product._id, quantidade: 1 }]);

      const response = await createCart(buyer.token, [{ idProduto: product._id, quantidade: 1 }]);

      expect(response.status).to.equal(400);
      expect(response.body.message).to.equal('Não é permitido ter mais de 1 carrinho');
    });

    describe('Stock boundary (stock = 5)', () => {
      it('should return 201 when the requested quantity equals the stock', async () => {
        const response = await createCart(buyer.token, [{ idProduto: product._id, quantidade: 5 }]);

        expect(response.status).to.equal(201);
        expect((await getProduct(product._id)).quantidade).to.equal(0);
      });

      it('should return 400 and keep the stock when the requested quantity exceeds it by 1', async () => {
        const response = await createCart(buyer.token, [{ idProduto: product._id, quantidade: 6 }]);

        expect(response.status).to.equal(400);
        expect(response.body.message).to.equal('Produto não possui quantidade suficiente');
        expect(response.body.item.quantidadeEstoque).to.equal(5);
        expect((await getProduct(product._id)).quantidade).to.equal(5);
      });

      it('should return 400 when the requested quantity is 0', async () => {
        const response = await createCart(buyer.token, [{ idProduto: product._id, quantidade: 0 }]);

        expect(response.status).to.equal(400);
        expect(response.body['produtos[0].quantidade']).to.equal(
          'produtos[0].quantidade deve ser um número positivo',
        );
      });
    });

    it('should return 400 when the same product appears twice', async () => {
      const response = await createCart(buyer.token, [
        { idProduto: product._id, quantidade: 1 },
        { idProduto: product._id, quantidade: 1 },
      ]);

      expect(response.status).to.equal(400);
      expect(response.body.message).to.equal('Não é permitido possuir produto duplicado');
      expect(response.body.idProdutosDuplicados).to.deep.equal([product._id]);
    });

    it('should return 400 when the product does not exist', async () => {
      const response = await createCart(buyer.token, [{ idProduto: 'AAAAAAAAAAAAAAAA', quantidade: 1 }]);

      expect(response.status).to.equal(400);
      expect(response.body.message).to.equal('Produto não encontrado');
    });

    it('should return 401 when no token is sent', async () => {
      const response = await request(BASE_URL)
        .post('/carrinhos')
        .send({ produtos: [{ idProduto: product._id, quantidade: 1 }] });

      expect(response.status).to.equal(401);
    });
  });

  describe('DELETE /carrinhos/cancelar-compra', () => {
    it('should return 200, delete the cart and restore the stock', async () => {
      const created = await createCart(buyer.token, [{ idProduto: product._id, quantidade: 4 }]);

      const response = await request(BASE_URL)
        .delete('/carrinhos/cancelar-compra')
        .set('Authorization', buyer.token);

      expect(response.status).to.equal(200);
      expect(response.body.message).to.equal('Registro excluído com sucesso. Estoque dos produtos reabastecido');
      expect((await getProduct(product._id)).quantidade).to.equal(5);
      expect((await request(BASE_URL).get(`/carrinhos/${created.body._id}`)).status).to.equal(400);
    });
  });

  describe('DELETE /carrinhos/concluir-compra', () => {
    it('should return 200, delete the cart and keep the stock reduced', async () => {
      await createCart(buyer.token, [{ idProduto: product._id, quantidade: 4 }]);

      const response = await request(BASE_URL)
        .delete('/carrinhos/concluir-compra')
        .set('Authorization', buyer.token);

      expect(response.status).to.equal(200);
      expect(response.body.message).to.equal('Registro excluído com sucesso');
      expect((await getProduct(product._id)).quantidade).to.equal(1);
    });

    it('should return 200 with "no cart found" when the user has no cart', async () => {
      const response = await request(BASE_URL)
        .delete('/carrinhos/concluir-compra')
        .set('Authorization', buyer.token);

      expect(response.status).to.equal(200);
      expect(response.body.message).to.equal('Não foi encontrado carrinho para esse usuário');
    });
  });
});
