(() => {
  const PIXEL_ID = "1067818909038288";
  const CONSENT_KEY = "tork_marketing_consent_v1";
  let marketingAllowed = true;

  function readConsent() {
    try {
      return window.localStorage.getItem(CONSENT_KEY);
    } catch {
      return null;
    }
  }

  function saveConsent(value) {
    try {
      window.localStorage.setItem(CONSENT_KEY, value);
    } catch {
      // The preference remains valid for the current page when storage is blocked.
    }
  }

  function enableTracking() {
    if (typeof window.fbq !== "function") return;
    window.fbq("consent", "grant");
    if (!window.__torkMetaPageViewTracked) {
      window.fbq("track", "PageView");
      // Marca a visita ao site como conteúdo visto. O funil real de anúncio
      // é ViewContent -> CTA_Click -> FormStart -> Lead; o clique sozinho
      // deixou de ser tratado como conversão.
      window.fbq("track", "ViewContent", {
        content_name: "Site Tork CRM",
        content_category: "Site",
      });
      window.__torkMetaPageViewTracked = true;
    }
  }

  /**
   * Canal único de eventos para o resto da página (modal de lead, por exemplo).
   *
   * Existe para que nenhum outro script precise falar com `fbq` direto e acabe
   * disparando evento de quem recusou cookies — a checagem de consentimento
   * fica em um lugar só.
   */
  window.torkPixel = {
    track(eventName, params, isCustom) {
      if (!marketingAllowed || typeof window.fbq !== "function") return;
      window.fbq(isCustom ? "trackCustom" : "track", eventName, params || {});
    },
  };

  function setConsent(value) {
    marketingAllowed = value === "granted";
    saveConsent(value);

    const banner = document.getElementById("tork-cookie-banner");
    const preferences = document.getElementById("tork-cookie-preferences");
    if (banner) banner.hidden = true;
    if (preferences) preferences.hidden = false;

    if (marketingAllowed) {
      enableTracking();
    } else if (typeof window.fbq === "function") {
      window.fbq("consent", "revoke");
    }
  }

  function showConsentBanner() {
    const banner = document.getElementById("tork-cookie-banner");
    const preferences = document.getElementById("tork-cookie-preferences");
    if (banner) banner.hidden = false;
    if (preferences) preferences.hidden = true;
  }

  function createConsentUi() {
    const banner = document.createElement("section");
    banner.id = "tork-cookie-banner";
    banner.className = "tork-cookie-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-modal", "false");
    banner.setAttribute("aria-labelledby", "tork-cookie-title");
    banner.innerHTML = `
      <div class="tork-cookie-copy">
        <strong id="tork-cookie-title">Cookies de marketing</strong>
        <p>Usamos o Meta Pixel para medir visitas e contatos pelo WhatsApp. Você pode aceitar ou recusar.</p>
      </div>
      <div class="tork-cookie-actions">
        <button type="button" data-cookie-choice="denied">Recusar</button>
        <button type="button" class="tork-cookie-accept" data-cookie-choice="granted">Aceitar</button>
      </div>`;

    const preferences = document.createElement("button");
    preferences.id = "tork-cookie-preferences";
    preferences.className = "tork-cookie-preferences";
    preferences.type = "button";
    preferences.textContent = "Cookies";
    preferences.setAttribute("aria-label", "Alterar preferência de cookies");

    banner.addEventListener("click", (event) => {
      const button = event.target.closest("[data-cookie-choice]");
      if (!button) return;
      setConsent(button.dataset.cookieChoice);
    });
    preferences.addEventListener("click", showConsentBanner);

    document.body.append(banner, preferences);

    const savedConsent = readConsent();
    if (savedConsent === "granted" || savedConsent === "denied") {
      banner.hidden = true;
      preferences.hidden = false;
      marketingAllowed = savedConsent === "granted";
      if (marketingAllowed) {
        enableTracking();
      } else if (typeof window.fbq === "function") {
        window.fbq("consent", "revoke");
      }
    } else {
      preferences.hidden = true;
    }
  }

  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href*="wa.me/"]');
    if (!link || !marketingAllowed || typeof window.fbq !== "function") return;
    // Os CTAs principais mantêm o href do WhatsApp só como plano B caso o JS
    // não carregue; o clique neles abre o formulário e não leva ninguém ao
    // WhatsApp. Contar Contact aqui inflaria a métrica com contato que não
    // aconteceu — quem realmente vai para o WhatsApp é o botão do sucesso.
    if (link.hasAttribute("data-tork-cta")) return;

    window.fbq("track", "Contact", {
      content_name: "WhatsApp - Site Tork CRM",
      content_category: "Contato",
      cta_text: (link.textContent || "WhatsApp").trim().replace(/\s+/g, " ").slice(0, 80),
    });
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createConsentUi, { once: true });
  } else {
    createConsentUi();
  }
})();
