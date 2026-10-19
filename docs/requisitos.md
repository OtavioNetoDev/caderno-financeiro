# Caderno Financeiro — Requisitos

Sistema financeiro individual, utilizável também por outras pessoas, para uso em vários dispositivos, substituindo anotações em arquivo de texto.

## Requisitos funcionais (RF)

### Lançamentos

- **RF01:** Cadastrar receita, despesa, transferência e investimento (data, valor, descrição, categoria, forma de pagamento).
- **RF02:** Entrada rápida em texto livre, como "lanche com raisa 17" ou "açaí 12", com sugestão de categoria.
- **RF03:** Importar o .txt atual (`DIA: dd/mm/aaaa: ... ||| ...`) com tela de revisão antes de salvar.
- **RF04:** Editar, excluir e duplicar lançamentos.
- **RF05:** Marcar o lançamento como "pendente" (gasto que ainda será cobrado) ou "confirmado".

### Categorias e tags

- **RF06:** Categorias padrão (Alimentação/Lanche, Mercado, Educação, Equipamentos de trabalho, Saúde, Jogos, Transporte, Casa, Lazer, Assinaturas, Presentes, Outros), com criação de novas.
- **RF07:** Tag "pessoa" (ex.: Raisa) e tipo de gasto **"com"** (dividido) ou **"de"** (só para a pessoa), para filtrar quanto foi gasto com ela.
- **RF08:** Regras automáticas, por exemplo: a palavra "açaí" vira Alimentação.

### Contas e cartão

- **RF09:** Várias contas/carteiras (dinheiro físico, Pix, Mercado Pago, poupança, cofrinhos).
- **RF10:** Cartão de crédito com fatura por mês, parcelas (ex.: óculos 1/2, 2/2), gastos pendentes e gastos por categoria no cartão.
- **RF11:** Fechamento da fatura e conciliação (valor calculado x valor da fatura).

### Investimentos

- **RF12:** Cadastrar investimento (nome, tipo: CDB, FII, fundo, cofrinho, ações; valor aplicado, data, taxa ou rendimento).
- **RF13:** Registrar aportes, resgates e proventos (ex.: MXRF11, com cotas e dividendos).
- **RF14:** Rendimento **diário, semanal e mensal** estimado.
- **RF15:** Simulador de projeção de **1 a 100 anos**, com aporte mensal, juros compostos e gráfico.
- **RF16:** Carteira consolidada: total investido, rendimento recebido e % do patrimônio por ativo.

### Dívidas e empréstimos

- **RF17:** Cadastrar "quem me deve" e "eu devo", com valor original, juros opcionais e saldo.
- **RF18:** Registrar pagamentos parciais e histórico.
- **RF19:** Painel de devedores e credores, com alerta de vencimento e de dívida parada.

### Análise e visualização

- **RF20:** Dashboard mensal com receita, despesa, **lucro (sobra)**, % investido e % gasto por categoria.
- **RF21:** Gráficos de pizza, barras e linha, com comparação mês a mês.
- **RF22:** Análise automática em texto (ex.: "este mês você gastou 18% a mais em lanche que no anterior").
- **RF23:** Metas e orçamentos por categoria (ex.: cota de R$ 100 de lanche), com alerta quando acabar.
- **RF24:** Cofrinhos/reservas (lanche, emergência) com saldo próprio.

### Organização e uso

- **RF25:** Bloco de notas e campo de observações por mês e por lançamento.
- **RF26:** Filtros e busca (período, categoria, pessoa, conta).
- **RF27:** Exportar para CSV/PDF e backup em JSON.
- **RF28:** Multiusuário: cada pessoa tem login e seus dados separados.

## Requisitos não funcionais (RNF)

- **RNF01 Sincronização:** mesmos dados em todos os dispositivos, com atualização imediata.
- **RNF02 Segurança:** senha com hash (bcrypt), JWT, HTTPS, dados isolados por usuário, segredos em variáveis de ambiente.
- **RNF03 Privacidade:** dados financeiros fora do repositório; opção de criptografar backups.
- **RNF04 Usabilidade:** lançar um gasto em até 3 toques/cliques; interface limpa, clara e responsiva (celular e PC).
- **RNF05 Desempenho:** dashboard carrega em menos de 2 s com 10 mil lançamentos.
- **RNF06 Precisão:** valores em centavos (inteiros), sem erro de ponto flutuante; datas no fuso America/Bahia.
- **RNF07 Confiabilidade:** backup automático e exportação; nada é apagado de vez sem confirmação (lixeira).
- **RNF08 Manutenibilidade:** código modular, testes automatizados nas regras de cálculo (juros, fatura, dívida), ESLint/Prettier.
- **RNF09 Portabilidade:** roda em Windows e Linux; instalável como PWA, funcionando offline com sincronização depois.
- **RNF10 Internacionalização:** português (BR) primeiro, moeda configurável.
- **RNF11 Documentação:** README, guia de instalação e documentação das regras de negócio.
