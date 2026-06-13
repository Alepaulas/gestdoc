# GestDoc — Sistema de Gestão Documental Hospitalar

Sistema completo de gestão documental com conformidade ONA, desenvolvido em Next.js 14.

## Stack

- **Frontend/Backend**: Next.js 14 + TypeScript + Tailwind CSS
- **Banco**: SQLite (dev) → MySQL (produção) via sql.js
- **Auth**: NextAuth.js + Google OAuth
- **Storage**: Google Drive API
- **E-mail**: Gmail API (alertas + aprovação + leitura obrigatória)
- **Docs**: docxtemplater (geração de .docx)
- **Deploy**: Vercel + Vercel Cron

## Funcionalidades

### Core
- ✅ Login com Google OAuth
- ✅ Estrutura: Unidade → Setor → Área
- ✅ CRUD de documentos com numeração automática (POP-001, PR-002…)
- ✅ Status automático (Vigente / Vencendo / Vencido) calculado pela data de revisão

### ONA
- ✅ **Mapa de Conformidade ONA** (níveis 1, 2 e 3) calculado em tempo real
- ✅ Cruzamento automático: documento vigente → item ONA = "Atendido"
- ✅ Lacunas documentais detectadas automaticamente
- ✅ Vínculo N:N entre documentos e itens ONA

### Automações
- ✅ **Geração de .docx** preenchido automaticamente (código, versão, área, responsável, itens ONA)
- ✅ **Fluxo de aprovação**: Elaborador → Revisor → Aprovador com e-mail em cada etapa
- ✅ **Leitura obrigatória**: publicação dispara e-mail com link de confirmação para a equipe
- ✅ **Alertas automáticos**: cron diário (90/30/0 dias) via Gmail
- ✅ Audit log completo de todas as ações

### Controle
- ✅ Perfis: Admin / Editor / Visualizador
- ✅ Upload no Google Drive integrado ao cadastro
- ✅ Histórico de revisões
- ✅ Indicadores em tempo real no dashboard

## Configuração local

```bash
npm install
cp .env.example .env
# Edite .env com suas credenciais Google
npm run dev
```

O banco SQLite já vem pré-populado com categorias, unidades, setores, áreas e documentos de exemplo.

## Deploy no Vercel

1. Suba no GitHub
2. Importe no vercel.com
3. Adicione as variáveis de ambiente (veja `.env.example`)
4. **Para MySQL em produção**: troque `DATABASE_URL` para a string MySQL e adicione `@planetscale/database` ou outro driver

### Google Cloud Console
- Ative: **Google Drive API** + **Gmail API** + **Google OAuth 2.0**
- Redirect URI: `https://seu-app.vercel.app/api/auth/callback/google`
- Scopes: `drive`, `gmail.send`, `openid`, `email`, `profile`

## Migração para MySQL (produção)

O sistema usa `sql.js` no dev. Para produção com MySQL:
1. Troque `DATABASE_URL` para MySQL
2. Instale `mysql2`: `npm install mysql2`
3. Troque as queries em `src/lib/db.ts` por `mysql2/promise`
4. As queries SQL são padrão e compatíveis com MySQL

## Estrutura

```
src/
├── app/
│   ├── (app)/              # Rotas protegidas
│   │   ├── dashboard/
│   │   ├── documentos/     # + geração .docx + modal com ONA
│   │   ├── ona/            # Mapa de conformidade ONA
│   │   ├── aprovacao/      # Fluxo elaborador→revisor→aprovador
│   │   └── configuracoes/  # Usuários, alertas, integrações
│   ├── api/
│   │   ├── dashboard/      # KPIs em tempo real
│   │   ├── documentos/     # CRUD + paginação + filtros
│   │   ├── ona/            # Conformidade calculada automaticamente
│   │   ├── aprovacao/      # Fluxo + notificações Gmail
│   │   ├── leitura/        # Confirmação via token único
│   │   ├── docx/           # Geração de Word preenchido
│   │   ├── alertas/        # Cron + Gmail
│   │   └── ...
│   └── leitura/confirmar/  # Página pública de confirmação
├── lib/
│   ├── db.ts               # sql.js wrapper
│   ├── auth.ts             # NextAuth + adapter customizado
│   ├── gmail.ts            # Templates e envio
│   ├── drive.ts            # Upload e listagem
│   └── docx.ts             # Geração de Word
└── prisma/
    ├── schema.prisma        # Schema (para referência e migração)
    └── dev.db               # Banco SQLite pré-populado
```
# GestDoc
