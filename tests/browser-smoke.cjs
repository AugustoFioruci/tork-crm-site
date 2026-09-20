const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("playwright");

(async () => {
  const output = path.join(process.cwd(), ".qa-artifacts");
  fs.mkdirSync(output, { recursive: true });
  const contentTypes = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".ico": "image/x-icon",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".xml": "application/xml; charset=utf-8",
  };
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
    const relative = pathname.endsWith("/") ? `${pathname}index.html` : pathname;
    const file = path.resolve(process.cwd(), `.${relative}`);
    if (!file.startsWith(process.cwd())) {
      response.writeHead(403).end();
      return;
    }
    fs.readFile(file, (error, body) => {
      if (error) {
        response.writeHead(404).end("Not found");
        return;
      }
      response.writeHead(200, {
        "Content-Type": contentTypes[path.extname(file)] || "application/octet-stream",
      });
      response.end(body);
    });
  });
  await new Promise((resolve) => server.listen(4173, "127.0.0.1", resolve));
  const browser = await chromium.launch({ headless: true });

  for (const scenario of [
    {
      name: "home",
      path: "/",
      headline: "Seu próximo cliente não vai esperar.",
      viewport: { width: 1440, height: 1000 },
    },
    {
      name: "clinica",
      path: "/clinica/",
      headline:
        "Sua clínica responde, orienta e agenda pacientes no WhatsApp — mesmo fora do horário.",
      viewport: { width: 1440, height: 1000 },
    },
    {
      name: "clinica-mobile",
      path: "/clinica/",
      headline:
        "Sua clínica responde, orienta e agenda pacientes no WhatsApp — mesmo fora do horário.",
      viewport: { width: 390, height: 844 },
    },
  ]) {
    const context = await browser.newContext({ viewport: scenario.viewport });
    await context.route(/^https?:\/\/(?!127\.0\.0\.1:4173).*/, (route) => route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(`console: ${message.text()}`);
    });
    page.on("pageerror", (error) => errors.push(`page: ${error.message}`));

    await page.goto(`http://127.0.0.1:4173${scenario.path}`, {
      waitUntil: "load",
      timeout: 15000,
    });
    await page.waitForFunction(
      () => document.documentElement.dataset.torkConversionEnhancements === "ready"
    );

    assert.equal(await page.locator("h1").first().textContent(), scenario.headline);
    assert.equal(await page.locator("#confianca-operacional article").count(), 3);
    assert.equal(await page.locator(".tork-demo-note").count(), 1);
    assert.equal(await page.locator(".tork-final-note").count(), 1);
    assert.equal(
      await page.evaluate(() => {
        const faq = document.getElementById("perguntas-frequentes");
        const final = document.querySelector('[data-tork-cta="final"]')?.closest("section");
        return Boolean(
          faq &&
            final &&
            faq.parentElement === final.parentElement &&
            faq.compareDocumentPosition(final) & Node.DOCUMENT_POSITION_FOLLOWING
        );
      }),
      true
    );

    if (scenario.name.startsWith("clinica")) {
      assert.equal(
        await page.locator("header nav").evaluate((node) => getComputedStyle(node).display),
        "none"
      );
    }

    const beforeConsent = await page.evaluate(() => ({
      fbq: (window.fbq?.queue || []).map((entry) => Array.from(entry)),
      dataLayer: (window.dataLayer || []).map((entry) =>
        typeof entry === "object" && entry !== null ? Array.from(entry) : entry
      ),
    }));
    assert.equal(
      beforeConsent.fbq.some((entry) => entry[0] === "track" && entry[1] === "PageView"),
      false
    );
    assert.equal(
      beforeConsent.dataLayer.some(
        (entry) => entry?.[0] === "event" && entry?.[1] === "conversion"
      ),
      false
    );

    await page.locator('[data-cookie-choice="granted"]').click();
    const afterConsent = await page.evaluate(() => ({
      fbq: (window.fbq?.queue || []).map((entry) => Array.from(entry)),
      dataLayer: (window.dataLayer || []).map((entry) =>
        typeof entry === "object" && entry !== null ? Array.from(entry) : entry
      ),
    }));
    assert.equal(
      afterConsent.fbq.filter((entry) => entry[0] === "track" && entry[1] === "PageView")
        .length,
      1
    );
    assert.equal(
      afterConsent.dataLayer.some(
        (entry) =>
          entry?.[0] === "consent" &&
          entry?.[1] === "update" &&
          entry?.[2]?.ad_storage === "granted"
      ),
      true
    );

    await page.locator('[data-tork-cta="hero"]').click();
    assert.equal(await page.locator(".tork-lead-overlay").getAttribute("data-open"), "true");
    await page.locator(".tork-lead-step:not([hidden]) .tork-lead-option").first().click();
    await page.waitForTimeout(220);
    await page.locator(".tork-lead-step:not([hidden]) .tork-lead-option").first().click();
    await page.waitForTimeout(220);
    await page.locator(".tork-lead-step:not([hidden]) .tork-lead-option").first().click();
    await page.waitForTimeout(220);
    assert.equal(
      await page.locator(".tork-lead-step:not([hidden]) .tork-lead-question").textContent(),
      "Como falamos com você?"
    );
    assert.match(await page.locator(".tork-lead-legal").textContent(), /Sem compromisso/);

    await page.keyboard.press("Escape");
    await page.screenshot({
      path: path.join(output, `${scenario.name}.png`),
      fullPage: true,
    });

    const relevantErrors = errors.filter(
      (error) =>
        !error.includes("ERR_FAILED") &&
        !error.includes("Failed to load resource") &&
        !error.includes("net::ERR_BLOCKED_BY_CLIENT")
    );
    assert.deepEqual(relevantErrors, []);
    await context.close();
  }

  for (const leadScenario of [
    { path: "/", origem: "site" },
    { path: "/clinica/", origem: "clinica" },
  ]) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await context.route(/^https?:\/\/(?!127\.0\.0\.1:4173).*/, (route) => route.abort());
    let payload = null;
    await context.route("**/api/public/lead-site", async (route) => {
      payload = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
    });
    const page = await context.newPage();
    await page.goto(
      `http://127.0.0.1:4173${leadScenario.path}?utm_source=qa&utm_campaign=landing`,
      { waitUntil: "load", timeout: 15000 }
    );
    await page.waitForFunction(
      () => document.documentElement.dataset.torkConversionEnhancements === "ready"
    );
    await page.locator('[data-cookie-choice="granted"]').click();
    await page.locator('[data-tork-cta="hero"]').click();
    for (let index = 0; index < 3; index += 1) {
      await page
        .locator(".tork-lead-step:not([hidden]) .tork-lead-option")
        .first()
        .click();
      await page.waitForTimeout(220);
    }
    await page.locator("#tork-lead-nome").fill("Teste QA");
    await page.locator("#tork-lead-whatsapp").fill("43999999999");
    await page.locator("[data-submit]").click();
    await page.locator(".tork-lead-success").waitFor({ state: "visible" });

    assert.equal(payload?.origem, leadScenario.origem);
    assert.equal(payload?.utm_source, "qa");
    assert.equal(payload?.utm_campaign, "landing");
    const tracking = await page.evaluate(() => ({
      fbq: (window.fbq?.queue || []).map((entry) => Array.from(entry)),
      dataLayer: (window.dataLayer || []).map((entry) =>
        typeof entry === "object" && entry !== null ? Array.from(entry) : entry
      ),
    }));
    assert.equal(
      tracking.fbq.filter((entry) => entry[0] === "track" && entry[1] === "Lead").length,
      1
    );
    assert.equal(
      tracking.dataLayer.filter(
        (entry) =>
          entry?.[0] === "event" &&
          entry?.[1] === "conversion" &&
          entry?.[2]?.send_to === "AW-18453697785/dKQhCLXShvkcEPmptN9E"
      ).length,
      1
    );
    await context.close();
  }

  const reducedContext = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: "reduce",
  });
  await reducedContext.route(/^https?:\/\/(?!127\.0\.0\.1:4173).*/, (route) => route.abort());
  const reducedPage = await reducedContext.newPage();
  await reducedPage.goto("http://127.0.0.1:4173/", { waitUntil: "load", timeout: 15000 });
  await reducedPage.waitForFunction(
    () => document.documentElement.dataset.torkConversionEnhancements === "ready"
  );
  const duration = await reducedPage
    .locator(".tork-proof__item")
    .first()
    .evaluate((node) => getComputedStyle(node).transitionDuration);
  assert.match(duration, /1e-05s|0\.00001s|0\.01ms/);
  await reducedContext.close();

  await browser.close();
  await new Promise((resolve) => server.close(resolve));
  console.log(
    "Browser smoke: 3 layouts + consentimento + modal + 2 conversões simuladas + reduced motion OK"
  );
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
