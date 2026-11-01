# Aparência do sistema

## Imagem de fundo

A imagem fica em `public/img/fundo.png` (1600 x 900) e é aplicada ao `body` em `public/css/tema.css`,
ancorada à direita e embaixo. O lado esquerdo da imagem é deliberadamente vazio: é onde fica o menu
lateral. Para trocar o fundo, basta substituir o arquivo mantendo esse espaço livre à esquerda.

## Temas

- **Escuro** (padrão): azul escuro com cartões e menu em vidro (`backdrop-filter`) sobre a imagem.
- **Claro**: cartões brancos e a imagem apenas como textura discreta.

A escolha é feita pelo botão da barra superior e fica salva no navegador (`cf_tema`). O arquivo
`public/js/theme.js` roda no `<head>`, antes de a página ser desenhada, para não piscar o tema errado.

Todas as cores vêm de variáveis CSS declaradas no início de `tema.css` (`--surface`, `--text`,
`--border`, `--accent`, `--series-1` a `--series-8` etc.), então um tema novo é só um novo bloco
`:root[data-theme='nome']`.

## Menu lateral

Cada tela registrada em `CF.views` aparece no menu. O ícone é escolhido pelo nome da tela em
`public/js/icons.js`; telas sem ícone cadastrado usam um ponto. Os ícones são montados com
`createElementNS`, sem `innerHTML`.

## Movimento

Os blocos da tela entram com uma animação curta, e botões e campos têm transições leves. Quem
configura o sistema operacional para reduzir movimento (`prefers-reduced-motion`) não vê animações.

## Gráficos

Cada gráfico tem o botão **Baixar PNG**, que gera uma imagem 2x com as cores do tema atual
(`public/js/chart-export.js`). Na visão em tabela o botão não faz nada, porque não há gráfico.
