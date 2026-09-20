import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const home = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const clinic = fs.readFileSync(path.join(ROOT, "clinica", "index.html"), "utf8");
const leadHome = fs.readFileSync(path.join(ROOT, "lead-modal.js"), "utf8");
const leadClinic = fs.readFileSync(path.join(ROOT, "clinica", "lead-modal.js"), "utf8");
const pixelHome = fs.readFileSync(path.join(ROOT, "meta-pixel.js"), "utf8");
const pixelClinic = fs.readFileSync(path.join(ROOT, "clinica", "meta-pixel.js"), "utf8");

test("assets de conversão entram uma única vez nas duas páginas", () => {
  for (const html of [home, clinic]) {
    assert.equal((html.match(/conversion-enhancements\.css/g) || []).length, 1);
    assert.equal((html.match(/conversion-enhancements\.js/g) || []).length, 1);
    assert.equal((html.match(/conversion-fallback:start/g) || []).length, 1);
  }
});

test("imagem institucional fica elegível para busca e compartilhamento", () => {
  assert.match(home, /og-tork-brand\.png/);
  assert.match(home, /Tork CRM — identidade visual da plataforma/);
  assert.match(home, /max-image-preview:large/);
  assert.match(clinic, /"image":"https:\/\/torksolucoes\.com\/og-tork-brand\.png"/);
  assert.ok(fs.existsSync(path.join(ROOT, "og-tork-brand.png")));
});

test("Meta Pixel começa sem consentimento e PageView é emitido pelo gerenciador", () => {
  assert.match(home, /fbq\('consent', 'revoke'\)/);
  assert.match(clinic, /fbq\('consent', 'revoke'\)/);
  assert.doesNotMatch(clinic, /fbq\('track', 'PageView'\)/);
  for (const script of [pixelHome, pixelClinic]) {
    assert.match(script, /if \(!marketingAllowed\) return/);
    assert.match(script, /window\.fbq\("track", "PageView"\)/);
  }
});

test("Google Ads e GTM compartilham consentimento negado por padrão", () => {
  for (const html of [home, clinic]) {
    const consentIndex = html.indexOf("gtag('consent','default'");
    const adsConfigIndex = html.indexOf("gtag('config','AW-18453697785'");
    const gtmLoaderIndex = html.indexOf('/gtm-loader.js?v=1');
    assert.ok(consentIndex >= 0);
    assert.ok(adsConfigIndex > consentIndex);
    assert.ok(gtmLoaderIndex > consentIndex);
    assert.equal((html.match(/gtm-loader\.js/g) || []).length, 1);
    assert.doesNotMatch(html, /googletagmanager\.com\/ns\.html/);
  }
});

test("Google Ads e Meta Lead só são chamados depois do POST bem-sucedido", () => {
  for (const leadScript of [leadHome, leadClinic]) {
    const fetchIndex = leadScript.indexOf("await fetch(ENDPOINT");
    const successIndex = leadScript.indexOf("if (!response.ok)");
    const leadIndex = leadScript.indexOf('track("Lead"');
    assert.ok(fetchIndex >= 0 && successIndex > fetchIndex && leadIndex > successIndex);
  }
  for (const pixelScript of [pixelHome, pixelClinic]) {
    assert.match(pixelScript, /AW-18453697785\/dKQhCLXShvkcEPmptN9E/);
    assert.match(pixelScript, /eventName === "Lead"/);
  }
});

test("atribuição e origem permanecem preservadas", () => {
  assert.match(leadHome, /const ORIGEM = "site"/);
  assert.match(leadClinic, /const ORIGEM = "clinica"/);
  for (const script of [leadHome, leadClinic]) {
    assert.match(script, /utm_source/);
    assert.match(script, /fbclid/);
  }
});
