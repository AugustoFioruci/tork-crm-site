# Tork CRM — site institucional

Este repositório guarda o export estático publicado em `torksolucoes.com` e a
landing `/clinica/`. O projeto React/Next original não está disponível; por
isso, o export versionado é hoje a fonte operacional das duas páginas.

## Melhorias mantidas fora dos chunks compilados

As landings atuais mantêm a copy, a demonstração interativa, a prova e os
cofundadores diretamente no HTML estático. `conversion-enhancements.js` e
`conversion-enhancements.css` continuam fornecendo inicialização do modal,
fallback dos CTAs e compatibilidade com exports antigos, mas páginas marcadas
com `data-tork-campaign` nunca têm sua copy reescrita depois do carregamento.

Depois de substituir qualquer HTML por um novo export, rode:

```bash
node scripts/update-static-site.mjs
```

O script é idempotente. Ele também:

- recoloca os assets de conversão nas duas páginas;
- mantém um contato via WhatsApp para navegação sem JavaScript;
- impede que `/clinica/` dispare `PageView` do Meta antes do consentimento;
- normaliza o Google Tag Manager nas duas páginas, sem iframe que contorne a
  escolha de cookies;
- associa a imagem institucional `og-tork-brand.png` à página e aos dados
  estruturados da organização.

## Contratos de mensuração que não podem mudar

- `Lead` do Meta Pixel e a conversão do Google Ads só disparam depois de
  `/api/public/lead-site` responder com sucesso;
- `ORIGEM` permanece `site` ou `clinica`;
- UTMs e `fbclid` continuam no payload;
- recusar cookies mantém Meta e Google Ads sem eventos de marketing.

## Validação mínima

```bash
node --check conversion-enhancements.js
node --check lead-modal.js
node --check clinica/lead-modal.js
node scripts/update-static-site.mjs
node --test tests/*.test.mjs
```

O teste renderizado usa Chromium e simula o aceite de cookies e o envio do
formulário sem criar lead real:

```bash
npm install
npx playwright install chromium
npm run test:browser
```

Depois do deploy, a mesma bateria roda contra a URL pública sem enviar lead
real:

```bash
QA_BASE_URL=https://torksolucoes.com npm run test:browser:live
```

Ele cobre home e `/clinica/` em desktop e mobile, reposicionamento do FAQ,
modal, `prefers-reduced-motion`, UTMs, origem e um único evento `Lead`/conversão
depois de uma resposta de API simulada com sucesso.
