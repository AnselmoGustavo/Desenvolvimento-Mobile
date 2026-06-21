# 🌿 Flora Yamaguti — App de Gestão de Pedidos

Aplicativo multiplataforma para controle de pedidos, orçamentos e catálogo de fornecedores e produtos de um micro-empreendimento familiar de flores e ornamentais.

Desenvolvido como Trabalho Prático da disciplina de Desenvolvimento Mobile — PUC Minas 2026.

---

## Funcionalidades

- **Pedidos** — criar, editar, excluir e acompanhar status (Pendente → Em preparo → Entregue)
- **Orçamento automático** — valor estimado calculado a partir dos preços cadastrados nos fornecedores
- **Fornecedores** — cadastro completo com lista de produtos, preços e unidades de medida
- **Produtos** — visão consolidada de todos os produtos por fornecedor com preços
- **Histórico** — pedidos entregues agrupados por cliente
- **Backup / Restauração** — exporta e importa todos os dados como arquivo `.json`
- **Persistência em nuvem** — Firebase Firestore com cache offline automático (IndexedDB)

---

## Stack

| Camada | Tecnologia |
|---|---|
| Front-end | React 19 + Vite 8 + JavaScript |
| Banco de dados | Firebase Firestore (cloud + offline cache) |
| Desktop | Electron 31 |
| Android | Capacitor 8 |
| Build | Node.js + npm |

---

## Pré-requisitos

- Node.js 18+
- npm 9+
- Para Android: Android Studio + SDK configurado

---

## Instalação

```bash
git clone https://github.com/AnselmoGustavo/Desenvolvimento-Mobile.git
cd Desenvolvimento-Mobile
npm install
```

---

## Comandos

```bash
# Desenvolvimento web (Vite dev server)
npm run dev

# Preview do build de produção
npm run preview

# Build da aplicação React
npm run build

# Electron (requer build prévio)
npm start

# Build + abrir no Electron
npm run electron:build

# Gerar instalador Windows (.exe)
npm run package
```

### Android (Capacitor)

```bash
# Build e sync para Android
npm run build
cp -r dist/* www/
npx cap sync android

# Abrir no Android Studio
npx cap open android
```

> O `capacitor.config.json` aponta o web dir para `www/` — copie o output do build antes de rodar o `cap sync`.

---

## Estrutura do projeto

```
src/
├── App.jsx                  # Raiz: AppProvider + navegação por abas
├── firebase.js              # Config do Firebase + Firestore offline
├── constants.js             # Chaves de storage, status, unidades
├── utils.js                 # formatCurrency, genId, getInitials...
├── normalize.js             # Normalização e sincronização de dados
├── tokens.js                # Paleta de cores (T) e estilos (S)
├── context/
│   └── AppContext.jsx       # React Context + hook useApp()
├── hooks/
│   ├── useAppData.js        # Toda a lógica de negócio e CRUD
│   └── useLocalStorage.js   # Camada Firestore (onSnapshot + setDoc)
├── screens/
│   ├── PedidosScreen.jsx
│   ├── HistoricoScreen.jsx
│   ├── FornecedoresScreen.jsx
│   └── ProdutosScreen.jsx
└── components/
    ├── index.js             # Barrel export
    ├── Btn.jsx
    ├── Modal.jsx
    ├── ConfirmModal.jsx
    ├── FormError.jsx
    └── ...
```

---

## Arquitetura de dados

Os dados ficam no Firebase Firestore na coleção `flora-data`, com um documento por entidade:

```
flora-data/
├── plt_pedidos       → { value: Pedido[] }
├── plt_fornecedores  → { value: Fornecedor[] }
├── plt_produtos      → { value: Produto[] }
└── plt_historico     → { value: Pedido[] }
```

O hook `useLocalStorage` abstrai o Firestore com a interface `[state, set, ready]`. O flag `ready` agrega o estado de carregamento dos 4 documentos — a tela de loading é exibida até todos estarem prontos.

---

## Segurança

As regras do Firestore estão em **modo de teste** (expiram 30 dias após a criação). Para produção, configure Firebase Authentication e atualize as regras para restringir acesso por usuário autenticado.

---

## Equipe

| Nome | Contato |
|---|---|
| Ana Beatriz Costa Viana | abcviana@sga.pucminas.br |
| Grazielle Sorrentino Santos Souza | 1441988@sga.pucminas.br |
| Gustavo Anselmo Santos Silva | gustavosilvasocial@gmail.com |
| Karina Oliveira Bicalho de Almeida | 1440058@sga.pucminas.br |
| Nicole Marie Agnelo Marques | 1478059@sga.pucminas.br |
| Flora Yamaguti (cliente) | — |

---

PUC Minas · Instituto de Informática e Ciências Exatas · 2026
