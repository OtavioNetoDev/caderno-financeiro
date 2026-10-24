const strip = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const INVESTMENT_RE =
  /\b(?:investi|investimentos?|poupanca|cofrinho(?! (?:de|do) lanche)|cofre(?! (?:de|do) lanche)|cdb|mxrf\d*|cotas?|aporte|tesouro|fif)\b/;
const INCOME_RE =
  /\b(?:recebi|ganhei|salario|me pagou|me deu|devolveu|reembolso|rendeu|proventos?|venda|vendi|vendendo)\b/;
const DEBT_RE = /\b(?:divida|deve|devo|devendo|emprestei|emprestou|emprestimo|me pegou)\b/;

// Nomes iguais às categorias padrão do sistema.
const EXPENSE_RULES = [
  [
    'Lanche',
    /\b(?:lanche|acai|pastel|panqueca|sorvete|picole|geladinhos?|paes?|pao|hamburger|hamburguer|pipoca|biscoito|refri|salgado|brigadeiro|sonho)\b/,
  ],
  ['Mercado', /\bmercado\b/],
  [
    'Alimentação',
    /\b(?:almoco|jantar|pizza|restaurante|acaraje|carne|frango|feijao|aipim|leite|queijo|milho|torradas?|mel)\b/,
  ],
  ['Educação', /\b(?:faculdade|curso|matricula|mensalidade|ingles|formacao|colacao|unifatecie)\b/],
  ['Saúde', /\b(?:remedio|dipirona|cimegripe|exames?|farmacia|medico|consulta)\b/],
  ['Jogos', /\b(?:brawl|skin|free fire|ff)\b/],
  [
    'Equipamentos de trabalho',
    /\b(?:ssd|multimetro|retrabalho|estanho|solda|microscopio|headset|mouse|pasta termica|limpa contato|cabo|soprador|filtro de linha|hdmi|notebook|pelicula)\b/,
  ],
  ['Transporte', /\b(?:gasolina|combustivel|lavagem|ventosa|onibus|uber)\b/],
  ['Assinaturas', /\b(?:netflix|meli mais|hostinger|assinatura|spotify)\b|meli\+/],
  ['Presentes', /\b(?:presente|gloss|bombom)\b/],
  ['Casa', /\b(?:agua|luz|energia|aluguel|fosforo)\b/],
];

const INCOME_RULES = [
  ['Salário', /\bsalario\b/],
  ['Vendas', /\b(?:venda|vendi|vendendo)\b/],
  ['Rendimentos', /\b(?:rendeu|proventos?)\b/],
  ['Serviços', /\b(?:servicos?|limpeza|antivirus|fiscal|arbitragem)\b/],
];

function categoryFor(text, type) {
  if (type === 'investment') {
    return 'Investimentos';
  }
  const plain = strip(text);
  const found = (type === 'income' ? INCOME_RULES : EXPENSE_RULES).find(([, regex]) =>
    regex.test(plain),
  );
  if (found) {
    return found[0];
  }
  return type === 'income' ? 'Outras receitas' : null;
}

// Tipo (investimento > receita > despesa), categoria sugerida e alertas ("dívida").
function classify(text) {
  const plain = strip(text);
  let type = 'expense';
  if (INVESTMENT_RE.test(plain)) {
    type = 'investment';
  } else if (INCOME_RE.test(plain)) {
    type = 'income';
  }
  return { type, category: categoryFor(text, type), flags: DEBT_RE.test(plain) ? ['dívida'] : [] };
}

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// "com Maria" / "eu e Maria" = ambos consumiram; "de Maria" / "pra Maria" = só a pessoa.
function detectPerson(text, people = []) {
  const plain = strip(text);
  for (const name of people) {
    const key = escapeRegex(strip(name).trim());
    if (!key) {
      continue;
    }
    if (new RegExp(`\\b(?:com|eu e|e eu)\\s+${key}\\b`).test(plain)) {
      return { personName: name, shareMode: 'with' };
    }
    if (new RegExp(`\\b(?:de|da|do|pra|para)\\s+${key}\\b`).test(plain)) {
      return { personName: name, shareMode: 'for' };
    }
  }
  return { personName: '', shareMode: '' };
}

module.exports = { strip, classify, categoryFor, detectPerson };
