# Logictel — Controle de Medições e DCs

## Estrutura do projeto

```
logictel/
├── index.html              # HTML puro (estrutura das telas)
├── css/
│   └── styles.css          # Todos os estilos (extraídos do <style> original)
├── js/
│   ├── config.js           # Cliente do Supabase (URL + anon key)
│   ├── session.js          # Estado da sessão (usuário logado, permissões)
│   ├── utils.js             # Máscaras, formatação de valores, sidebar mobile, flyouts
│   ├── auth.js              # Login, logout, verificação de sessão, força de senha
│   ├── selects.js           # Carregamento de combos (empresas, projetos, status, etc.)
│   ├── dashboards.js        # 3 dashboards (Saldos, Apropriação, DON)
│   ├── dccards.js           # Cards de visão geral das DCs
│   ├── medicoes.js          # CRUD de Medições
│   ├── consumo.js           # CRUD de Consumo DC + exportação Excel
│   ├── cadastros.js         # CRUD de Empresa, Diretor, Contrato, Projeto, Gestor, Status
│   ├── historico.js         # Histórico de Apropriação e de Gestor
│   ├── usuarios.js          # CRUD de usuários e permissões
│   ├── logs.js              # Aba "Atualizações do sistema"
│   ├── navigation.js        # Menu dinâmico, troca de abas, cancelarEdicao
│   └── main.js               # Ponto de entrada: liga tudo e inicializa a página
└── assets/
    └── logo.png             # (coloque sua logo aqui, mesmo nome usado no HTML original)
```

## Como isso funciona

- `index.html` carrega `css/styles.css` e, no fim do `<body>`, `js/main.js` como
  `<script type="module">`.
- `main.js` importa as funções de todos os outros módulos e só expõe no `window`
  as poucas que o HTML ainda chama via `onclick="..."`/`onchange="..."`
  (ex.: `mudarAba('dashboard')`, `editarMedicao(12)`). Isso foi necessário para manter
  o HTML **idêntico** ao original, sem precisar reescrever todos os botões para
  `addEventListener`.
- Cada módulo tem uma responsabilidade única (uma "aba" ou funcionalidade), então
  para mexer em algo você sabe exatamente qual arquivo abrir — em vez de dar Ctrl+F
  num arquivo de milhares de linhas.

## Como publicar/testar

Como agora o HTML usa `<script type="module">` e `import`/`export`, **não dá para
simplesmente abrir o `index.html` direto do disco (`file://`)** — o navegador bloqueia
imports de módulos em `file://` por segurança. Duas opções simples:

1. **Subir num servidor estático** (Vercel, Netlify, GitHub Pages, S3, etc.) — é
   basicamente arrastar essa pasta inteira, igual você faria com o `index.html` único.
2. **Testar localmente** rodando um servidor simples na pasta, por exemplo:
   ```bash
   cd logictel
   python3 -m http.server 8080
   # depois abra http://localhost:8080
   ```

## O que NÃO mudou (de propósito)

- Nenhuma lógica de negócio foi alterada — é o mesmo comportamento de antes.
- A chave anônima do Supabase continua no `js/config.js`, visível no navegador.
  Isso é esperado (veja explicação abaixo) — **não é uma falha desta reorganização**.

## Lembrete sobre segurança (não resolvido nesta etapa)

Essa reorganização é só de **organização de código**. Ela não resolve os pontos
que conversamos:
- Login comparando senha em texto puro direto do client.
- Senhas visíveis em texto puro na tela de cadastro de usuário.
- Permissões checadas só no JavaScript (`temPermissao`), sem RLS no banco.

Quando quiser atacar isso, o caminho é: políticas de **Row Level Security** no
Supabase + migrar login para o **Supabase Auth**. Fico à disposição para ajudar
nessa etapa quando quiser seguir.
