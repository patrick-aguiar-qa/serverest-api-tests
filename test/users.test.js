const request = require('supertest');
const { expect } = require('chai');
const { BASE_URL } = require('../helpers/config');
const { buildUser, createUser, createProduct, createCart } = require('../helpers/data');

const NON_EXISTENT_ID = 'AAAAAAAAAAAAAAAA';

describe('Users', () => {
  describe('GET /usuarios', () => {
    it('should return 200 and a count that matches the list size', async () => {
      const response = await request(BASE_URL).get('/usuarios');

      expect(response.status).to.equal(200);
      expect(response.body.quantidade).to.be.a('number');
      expect(response.body.usuarios).to.be.an('array').and.have.lengthOf(response.body.quantidade);
    });

    it('should return only the matching user when filtering by email', async () => {
      const user = await createUser();

      const response = await request(BASE_URL).get('/usuarios').query({ email: user.email });

      expect(response.status).to.equal(200);
      expect(response.body.quantidade).to.equal(1);
      expect(response.body.usuarios[0].email).to.equal(user.email);
      expect(response.body.usuarios[0]._id).to.equal(user._id);
    });
  });

  describe('POST /usuarios', () => {
    it('should return 201 and persist the user when all fields are valid', async () => {
      const newUser = buildUser();

      const response = await request(BASE_URL).post('/usuarios').send(newUser);

      expect(response.status).to.equal(201);
      expect(response.body.message).to.equal('Cadastro realizado com sucesso');
      expect(response.body._id).to.be.a('string').and.have.lengthOf(16);

      const saved = await request(BASE_URL).get(`/usuarios/${response.body._id}`);
      expect(saved.body.nome).to.equal(newUser.nome);
      expect(saved.body.email).to.equal(newUser.email);
      expect(saved.body.administrador).to.equal(newUser.administrador);
    });

    it('should return 400 when the email is already in use', async () => {
      const existing = await createUser();

      const response = await request(BASE_URL)
        .post('/usuarios')
        .send(buildUser({ email: existing.email }));

      expect(response.status).to.equal(400);
      expect(response.body.message).to.equal('Este email já está sendo usado');
    });

    it('should return 400 listing every missing required field', async () => {
      const response = await request(BASE_URL).post('/usuarios').send({});

      expect(response.status).to.equal(400);
      expect(response.body).to.deep.equal({
        nome: 'nome é obrigatório',
        email: 'email é obrigatório',
        password: 'password é obrigatório',
        administrador: 'administrador é obrigatório',
      });
    });

    it('should return 400 when fields have invalid types or unknown fields are sent', async () => {
      const response = await request(BASE_URL).post('/usuarios').send({
        nome: 123,
        email: 'not-an-email',
        password: '',
        administrador: 'yes',
        role: 'admin',
      });

      expect(response.status).to.equal(400);
      expect(response.body.nome).to.equal('nome deve ser uma string');
      expect(response.body.email).to.equal('email deve ser um email válido');
      expect(response.body.password).to.equal('password não pode ficar em branco');
      expect(response.body.administrador).to.equal("administrador deve ser 'true' ou 'false'");
      expect(response.body.role).to.equal('role não é permitido');
    });
  });

  describe('GET /usuarios/{_id}', () => {
    it('should return 400 when the user does not exist', async () => {
      const response = await request(BASE_URL).get(`/usuarios/${NON_EXISTENT_ID}`);

      expect(response.status).to.equal(400);
      expect(response.body.message).to.equal('Usuário não encontrado');
    });

    it('should return 400 when the id does not have 16 alphanumeric characters', async () => {
      const response = await request(BASE_URL).get('/usuarios/123');

      expect(response.status).to.equal(400);
      expect(response.body.id).to.equal('id deve ter exatamente 16 caracteres alfanuméricos');
    });
  });

  describe('PUT /usuarios/{_id}', () => {
    it('should return 200 and update every field of an existing user', async () => {
      const user = await createUser();
      const changes = buildUser({ nome: 'Updated Name', administrador: 'true' });

      const response = await request(BASE_URL).put(`/usuarios/${user._id}`).send(changes);

      expect(response.status).to.equal(200);
      expect(response.body.message).to.equal('Registro alterado com sucesso');

      const saved = await request(BASE_URL).get(`/usuarios/${user._id}`);
      expect(saved.body.nome).to.equal('Updated Name');
      expect(saved.body.email).to.equal(changes.email);
      expect(saved.body.administrador).to.equal('true');
    });

    it('should return 201 and create the user when the id does not exist', async () => {
      const response = await request(BASE_URL)
        .put(`/usuarios/${NON_EXISTENT_ID}`)
        .send(buildUser());

      expect(response.status).to.equal(201);
      expect(response.body.message).to.equal('Cadastro realizado com sucesso');
      expect(response.body._id).to.be.a('string');
    });

    it("should return 400 when the new email belongs to another user", async () => {
      const user = await createUser();
      const other = await createUser();

      const response = await request(BASE_URL)
        .put(`/usuarios/${user._id}`)
        .send(buildUser({ email: other.email }));

      expect(response.status).to.equal(400);
      expect(response.body.message).to.equal('Este email já está sendo usado');
    });
  });

  describe('DELETE /usuarios/{_id}', () => {
    it('should return 200 and remove the user', async () => {
      const user = await createUser();

      const response = await request(BASE_URL).delete(`/usuarios/${user._id}`);

      expect(response.status).to.equal(200);
      expect(response.body.message).to.equal('Registro excluído com sucesso');

      const deleted = await request(BASE_URL).get(`/usuarios/${user._id}`);
      expect(deleted.status).to.equal(400);
    });

    it('should return 200 with "no record deleted" when the user does not exist', async () => {
      const response = await request(BASE_URL).delete(`/usuarios/${NON_EXISTENT_ID}`);

      expect(response.status).to.equal(200);
      expect(response.body.message).to.equal('Nenhum registro excluído');
    });

    it('should return 400 when the user has an open cart', async () => {
      const admin = await createUser({ admin: true });
      const product = await createProduct(admin.token);
      const buyer = await createUser();
      await createCart(buyer.token, [{ idProduto: product._id, quantidade: 1 }]);

      const response = await request(BASE_URL).delete(`/usuarios/${buyer._id}`);

      expect(response.status).to.equal(400);
      expect(response.body.message).to.equal('Não é permitido excluir usuário com carrinho cadastrado');
      expect(response.body.idCarrinho).to.be.a('string');
    });
  });

  describe('Unsupported verbs', () => {
    it('should return 405 when PATCH is used on /usuarios', async () => {
      const response = await request(BASE_URL).patch('/usuarios').send({});

      expect(response.status).to.equal(405);
    });
  });
});
