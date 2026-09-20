import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MARKER_START = "<!--conversion-enhancements:start-->";
const MARKER_END = "<!--conversion-enhancements:end-->";
const HEAD_BLOCK = `${MARKER_START}<link rel="stylesheet" href="/conversion-enhancements.css?v=3"/><script src="/gtm-loader.js?v=1" defer></script><script src="/conversion-enhancements.js?v=3" defer></script>${MARKER_END}`;
const NOSCRIPT_START = "<!--conversion-fallback:start-->";
const NOSCRIPT_END = "<!--conversion-fallback:end-->";

function replaceManagedBlock(html, start, end, block, anchor) {
  const pattern = new RegExp(`${start}[\\s\\S]*?${end}`, "g");
  const withoutOldBlock = html.replace(pattern, "");
  if (!withoutOldBlock.includes(anchor)) {
    throw new Error(`Âncora não encontrada: ${anchor}`);
  }
  return withoutOldBlock.replace(anchor, `${block}${anchor}`);
}

function fallbackBlock(kind) {
  const clinic = kind === "clinica";
  const message = clinic
    ? "Olá, Heitor! Quero conhecer o Tork CRM para clínicas em uma demonstração sem compromisso."
    : "Olá, Heitor! Quero conhecer o Tork CRM em uma demonstração sem compromisso.";
  const href = `https://wa.me/5543984129754?text=${encodeURIComponent(message)}`;
  return `${NOSCRIPT_START}<noscript><section class="tork-noscript-contact" aria-label="Contato"><p>Quer ver o Tork funcionando?</p><a href="${href}">Falar com a Tork pelo WhatsApp</a></section></noscript>${NOSCRIPT_END}`;
}

function updateHtml(relativePath, kind) {
  const file = path.join(ROOT, relativePath);
  let html = fs.readFileSync(file, "utf8");

  // O export antigo carregava o GTM de três jeitos diferentes. Além de
  // duplicar manutenção, o iframe <noscript> da clínica ignorava a escolha de
  // cookies. As duas páginas passam a usar um único loader, depois do default
  // denied já presente no topo do <head>.
  html = html
    .replace(/<!-- Google Tag Manager -->[\s\S]*?<!-- End Google Tag Manager -->/g, "")
    .replace(
      /<!-- Google Tag Manager \(noscript\) -->[\s\S]*?<!-- End Google Tag Manager \(noscript\) -->/g,
      ""
    )
    .replace(/<script src="\/gtm-loader\.js[^>]*><\/script>/g, "");

  html = replaceManagedBlock(html, MARKER_START, MARKER_END, HEAD_BLOCK, "</head>");
  html = replaceManagedBlock(
    html,
    NOSCRIPT_START,
    NOSCRIPT_END,
    fallbackBlock(kind),
    "</body>"
  );

  if (kind === "site") {
    html = html.replaceAll(
      "https://torksolucoes.com/og-tork.png",
      "https://torksolucoes.com/og-tork-brand.png"
    );
    html = html.replaceAll(
      "Tork CRM — CRM com inteligência artificial que atende no WhatsApp",
      "Tork CRM — identidade visual da plataforma de atendimento com inteligência artificial"
    );
    html = html.replaceAll(
      '<meta property="og:image:width" content="1200"/><meta property="og:image:height" content="630"/>',
      '<meta property="og:image:width" content="1734"/><meta property="og:image:height" content="907"/>'
    );
  } else {
    const prematurePixel = [
      "fbq('set', 'autoConfig', false, '1067818909038288');",
      "fbq('init', '1067818909038288');",
      "fbq('track', 'PageView');",
      "window.__torkMetaPageViewTracked = true;",
    ].join("\n");
    const consentFirst = [
      "fbq('set', 'autoConfig', false, '1067818909038288');",
      "fbq('init', '1067818909038288');",
      "fbq('consent', 'revoke');",
    ].join("\n");
    html = html.replace(prematurePixel, consentFirst);
    html = html.replaceAll(
      '"image":"https://torksolucoes.com/og-tork.png"',
      '"image":"https://torksolucoes.com/og-tork-brand.png"'
    );
  }

  if (!html.includes(HEAD_BLOCK) || !html.includes(fallbackBlock(kind))) {
    throw new Error(`Blocos gerenciados não foram aplicados em ${relativePath}`);
  }
  if (kind === "clinica" && html.includes("fbq('track', 'PageView');")) {
    throw new Error("A landing de clínica ainda dispara PageView antes do consentimento");
  }

  fs.writeFileSync(file, html, "utf8");
}

updateHtml("index.html", "site");
updateHtml(path.join("clinica", "index.html"), "clinica");
console.log("Landings atualizadas com melhorias de conversão e consentimento.");
