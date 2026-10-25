# Segurança

## O que o sistema faz

- Senhas guardadas com bcrypt (custo configurável por `BCRYPT_ROUNDS`), nunca em texto.
- Tokens JWT (HS256) com validade de 12 horas, guardados só na aba do navegador e encerrados após 15 minutos sem uso.
- Recuperação de senha com código aleatório de 32 bytes, guardado como hash SHA-256, válido por 30 minutos e de uso único. Trocar a senha encerra as sessões anteriores.
- Todas as consultas filtram pelo usuário logado, e os campos aceitos em cada requisição são uma lista fixa.
- Cadastro, login e recuperação têm limite de tentativas por IP.
- Cabeçalhos de segurança com `helmet`, CORS fechado por padrão e tamanho do corpo das requisições limitado.
- A exportação em CSV neutraliza células que começam com `=`, `+`, `-` ou `@` (injeção de fórmulas).
- Dados financeiros ficam no banco, nunca no repositório (`.env`, `data/`, `backups/` e `*.txt` estão no `.gitignore`).

## Limitações conhecidas

- Não há verificação de e-mail no cadastro nem autenticação em dois fatores.
- O limite de tentativas fica na memória do servidor e reinicia junto com ele.
- O token fica no `sessionStorage`, acessível a scripts da própria página. Por isso a política de segurança de conteúdo bloqueia scripts externos.
- Sem SMTP configurado, o link de recuperação de senha aparece no console do servidor. Isso serve para uso pessoal e testes, não para produção.
- O backup em JSON contém todos os dados financeiros em texto. Guarde-o em local seguro.

## Para uso em produção

- Use HTTPS, um `JWT_SECRET` longo e aleatório e restrinja os IPs no MongoDB Atlas (evite `0.0.0.0/0`).
- Configure `APP_URL` e o SMTP para a recuperação de senha.
- Mantenha as dependências atualizadas (`npm audit`) e revise os avisos antes de aplicar correções automáticas.
