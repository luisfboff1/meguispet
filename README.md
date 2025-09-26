# MeguisPet 2.0

Versão atualizada do sistema MeguisPet utilizando Next.js com SSG (Static Site Generation) para deploy no Hostinger.

## Estrutura do Projeto

- `src/` - Código fonte da aplicação
  - `components/` - Componentes React reutilizáveis
  - `pages/` - Páginas da aplicação
  - `contexts/` - Contextos React
  - `services/` - Serviços e integrações
  - `styles/` - Estilos globais e configurações Tailwind

## Deploy

O deploy é feito automaticamente via GitHub Actions quando há um push para a branch main. O processo:

1. Instala dependências
2. Faz o build da aplicação (SSG)
3. Envia os arquivos estáticos para o Hostinger via FTP

## Desenvolvimento Local

Para desenvolvimento local (quando necessário):

```bash
npm install
npm run dev
```

## Arquitetura

- Frontend: Next.js + Shadcn/ui (SSG Only)
- Backend: PHP API (existente)
- Database: MySQL (existente)

## Observações

- O projeto é configurado para SSG (Static Site Generation)
- Todos os arquivos dinâmicos são gerados no build
- APIs são consumidas do backend PHP existente