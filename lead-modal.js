/*
 * Captura de lead do site principal (torksolucoes.com).
 *
 * O CTA deixa de mandar direto para o WhatsApp e passa a abrir um formulário
 * de 4 etapas. O lead é registrado ANTES de oferecer WhatsApp/agendamento, e o
 * evento `Lead` do Pixel só dispara depois desse registro dar certo — antes
 * disso a conversão medida era só o clique, que não provava contato nenhum.
 *
 * Se este script falhar ao carregar, os CTAs continuam sendo links normais
 * para o WhatsApp: a página degrada para o comportamento antigo em vez de
 * quebrar.
 */
(() => {
  "use strict";

  /** Endpoint público do CRM que repassa o lead pro Discord. */
  const ENDPOINT = "/api/public/lead-site";
  const ORIGEM = "site";

  /**
   * Link de agendamento. Hoje o projeto não tem ferramenta de agenda própria
   * publicada, então o botão usa o mesmo WhatsApp com outra intenção. Ao
   * contratar uma agenda pública, troque só esta constante.
   */
  const WHATSAPP_URL =
    "https://wa.me/5543984129754?text=" +
    encodeURIComponent("Olá, Heitor! Acabei de preencher o formulário no site e quero saber mais sobre o Tork CRM.");
  const SCHEDULE_URL =
    "https://wa.me/5543984129754?text=" +
    encodeURIComponent("Olá, Heitor! Quero agendar um horário para conhecer o Tork CRM.");

  const STEPS = [
    {
      key: "atendentes",
      question: "Quantas pessoas atendem o WhatsApp da empresa hoje?",
      options: ["Só 1 pessoa", "2 a 3 pessoas", "4 ou mais pessoas"],
    },
    {
      key: "problema",
      question: "Qual é o maior problema hoje no atendimento pelo WhatsApp?",
      options: [
        "Demora para responder",
        "Leads ou clientes que param de responder",
        "Agendamentos e confirmações",
        "Falta de organização das conversas",
        "Follow-up dos clientes",
        "Outro",
      ],
    },
    {
      key: "sistema",
      question: "Hoje vocês já utilizam algum sistema ou automação no WhatsApp?",
      options: [
        "Não",
        "Apenas WhatsApp Business",
        "CRM ou sistema de atendimento",
        "Chatbot ou inteligência artificial",
        "Não sei",
      ],
    },
  ];

  const TOTAL_STEPS = STEPS.length + 1;
  const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  const TRACKING_STORAGE_KEY = "tork_lead_tracking_v1";

  /**
   * Parâmetros de campanha da PRIMEIRA visita.
   *
   * O visitante pode navegar pela página, voltar depois ou perder a query
   * string no caminho; sem guardar, o lead chegaria sem origem e o anúncio
   * ficaria sem atribuição. A query atual sempre tem precedência.
   */
  function resolveTracking() {
    let stored = {};
    try {
      stored = JSON.parse(window.sessionStorage.getItem(TRACKING_STORAGE_KEY) || "{}");
    } catch {
      stored = {};
    }

    const params = new URLSearchParams(window.location.search);
    const current = {};
    for (const key of UTM_KEYS.concat("fbclid")) {
      const value = params.get(key);
      if (value) current[key] = value.slice(0, 300);
    }

    const tracking = Object.keys(current).length ? { ...stored, ...current } : stored;
    try {
      window.sessionStorage.setItem(TRACKING_STORAGE_KEY, JSON.stringify(tracking));
    } catch {
      // Sessão sem storage ainda envia o lead; só perde a atribuição antiga.
    }
    return tracking;
  }

  /** Dispara no Pixel respeitando o consentimento já gerenciado pelo banner. */
  function track(eventName, params, isCustom) {
    const pixel = window.torkPixel;
    if (!pixel || typeof pixel.track !== "function") return;
    pixel.track(eventName, params, isCustom);
  }

  function digitsOf(value) {
    return (value || "").replace(/\D/g, "").slice(0, 11);
  }

  /** (XX) XXXXX-XXXX conforme a pessoa digita. */
  function maskPhone(value) {
    const digits = digitsOf(value);
    if (digits.length <= 2) return digits.length ? `(${digits}` : "";
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  function validPhone(value) {
    const digits = digitsOf(value);
    if (digits.length < 10 || digits.length > 11) return false;
    // DDD brasileiro começa em 11; celular de 11 dígitos tem 9 na terceira casa.
    if (Number(digits.slice(0, 2)) < 11) return false;
    return digits.length === 10 || digits[2] === "9";
  }

  function validName(value) {
    return (value || "").trim().length >= 2;
  }

  function build() {
    const overlay = document.createElement("div");
    overlay.className = "tork-lead-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "tork-lead-title");
    overlay.dataset.open = "false";
    overlay.hidden = true;

    const choiceSteps = STEPS.map(
      (step, index) => `
      <section class="tork-lead-step" data-step="${index}" hidden>
        <p class="tork-lead-question">${step.question}</p>
        <div class="tork-lead-options" role="group" aria-label="${step.question}">
          ${step.options
            .map(
              (option) =>
                `<button type="button" class="tork-lead-option" data-value="${option}" aria-pressed="false">${option}</button>`
            )
            .join("")}
        </div>
        ${index > 0 ? '<button type="button" class="tork-lead-back">Voltar</button>' : ""}
      </section>`
    ).join("");

    overlay.innerHTML = `
      <div class="tork-lead-modal">
        <button type="button" class="tork-lead-close" aria-label="Fechar">&times;</button>
        <input type="text" name="website" data-honeypot tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px;top:-9999px" />

        <div class="tork-lead-form-area">
          <p class="tork-lead-progress" data-progress>1 de ${TOTAL_STEPS}</p>
          <div class="tork-lead-bar"><span data-bar style="width:${100 / TOTAL_STEPS}%"></span></div>
          <h2 class="tork-lead-title" id="tork-lead-title">Vamos entender seu negócio em 30 segundos</h2>
          <p class="tork-lead-subtitle">Responda algumas perguntas para mostrarmos como o Tork CRM poderia funcionar no seu atendimento.</p>

          ${choiceSteps}

          <section class="tork-lead-step" data-step="${STEPS.length}" hidden>
            <p class="tork-lead-question">Para onde enviamos a demonstração?</p>
            <div class="tork-lead-field">
              <label for="tork-lead-nome">Nome</label>
              <input type="text" id="tork-lead-nome" name="nome" autocomplete="name" enterkeyhint="next" placeholder="Seu nome" />
              <span class="tork-lead-error" data-error="nome"></span>
            </div>
            <div class="tork-lead-field">
              <label for="tork-lead-whatsapp">WhatsApp</label>
              <input type="tel" id="tork-lead-whatsapp" name="whatsapp" autocomplete="tel-national" inputmode="numeric" enterkeyhint="done" placeholder="(00) 00000-0000" />
              <span class="tork-lead-error" data-error="whatsapp"></span>
            </div>
            <button type="button" class="tork-lead-submit" data-submit>Quero ver como funcionaria no meu negócio</button>
            <p class="tork-lead-legal">Seus dados serão usados apenas para entrarmos em contato sobre a demonstração.</p>
            <button type="button" class="tork-lead-back">Voltar</button>
          </section>
        </div>

        <section class="tork-lead-success" hidden>
          <div class="tork-lead-check" aria-hidden="true">&#10003;</div>
          <h2 class="tork-lead-title">Perfeito! Já temos uma ideia do seu cenário.</h2>
          <p class="tork-lead-subtitle">Agora você pode falar com nossa equipe ou escolher um horário para conhecer a solução.</p>
          <div class="tork-lead-actions">
            <a class="tork-lead-action-primary" data-whatsapp href="${WHATSAPP_URL}" target="_blank" rel="noreferrer">Falar pelo WhatsApp</a>
            <a class="tork-lead-action-secondary" data-schedule href="${SCHEDULE_URL}" target="_blank" rel="noreferrer">Agendar demonstração</a>
          </div>
        </section>
      </div>`;

    document.body.appendChild(overlay);
    return overlay;
  }

  function secureCtaLink(cta) {
    if (cta.getAttribute("href") !== "#demonstracao") {
      cta.setAttribute("href", "#demonstracao");
    }
    cta.removeAttribute("target");
    cta.removeAttribute("rel");
    cta.setAttribute("role", "button");
  }

  function secureCtaLinks() {
    document.querySelectorAll("[data-tork-cta]").forEach(secureCtaLink);
  }

  function init() {
    // O WhatsApp real só pode aparecer na tela de sucesso, depois que o lead
    // for registrado. Também reafirma os atributos se a hidratação do Next
    // tentar restaurar os links antigos do HTML original.
    secureCtaLinks();
    const ctaObserver = new MutationObserver(secureCtaLinks);
    ctaObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["href", "target", "rel"],
      childList: true,
      subtree: true,
    });

    const overlay = build();
    const modal = overlay.querySelector(".tork-lead-modal");
    const formArea = overlay.querySelector(".tork-lead-form-area");
    const success = overlay.querySelector(".tork-lead-success");
    const steps = Array.from(overlay.querySelectorAll(".tork-lead-step"));
    const progress = overlay.querySelector("[data-progress]");
    const bar = overlay.querySelector("[data-bar]");
    const submitButton = overlay.querySelector("[data-submit]");
    const nameInput = overlay.querySelector("#tork-lead-nome");
    const phoneInput = overlay.querySelector("#tork-lead-whatsapp");

    const answers = {};
    let current = 0;
    let lastFocused = null;
    // Travas de duplicidade: reabrir o modal não pode repetir FormStart, e
    // Lead nunca pode sair duas vezes para o mesmo envio.
    let formStartFired = false;
    let leadFired = false;
    let sending = false;

    function showStep(index) {
      current = index;
      steps.forEach((step, position) => {
        step.hidden = position !== index;
      });
      progress.textContent = `${index + 1} de ${TOTAL_STEPS}`;
      bar.style.width = `${((index + 1) / TOTAL_STEPS) * 100}%`;
      const focusable = steps[index].querySelector("button, input");
      // No mobile o autofocus abriria o teclado por cima das opções.
      if (focusable && window.matchMedia("(min-width: 561px)").matches) focusable.focus();
    }

    function markFormStart() {
      if (formStartFired) return;
      formStartFired = true;
      track("FormStart", { content_name: "Formulário site" }, true);
    }

    function open(source) {
      lastFocused = document.activeElement;
      overlay.hidden = false;
      // Força reflow para a transição rodar a partir do estado fechado.
      void overlay.offsetWidth;
      overlay.dataset.open = "true";
      document.body.style.overflow = "hidden";
      track("CTA_Click", { content_name: "CTA site principal", cta: source || "cta" }, true);
      if (!leadFired) showStep(0);
    }

    function close() {
      overlay.dataset.open = "false";
      document.body.style.overflow = "";
      window.setTimeout(() => {
        overlay.hidden = true;
      }, 200);
      if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
    }

    function setError(field, message) {
      const target = overlay.querySelector(`[data-error="${field}"]`);
      const input = field === "nome" ? nameInput : phoneInput;
      if (target) target.textContent = message || "";
      if (input) input.setAttribute("aria-invalid", message ? "true" : "false");
    }

    async function submit() {
      if (sending) return;

      const nome = nameInput.value.trim();
      const whatsapp = phoneInput.value.trim();
      let invalid = false;
      if (!validName(nome)) {
        setError("nome", "Informe seu nome.");
        invalid = true;
      } else setError("nome", "");
      if (!validPhone(whatsapp)) {
        setError("whatsapp", "Informe um WhatsApp válido com DDD.");
        invalid = true;
      } else setError("whatsapp", "");
      if (invalid) return;

      const missing = STEPS.find((step) => !answers[step.key]);
      if (missing) {
        showStep(STEPS.indexOf(missing));
        return;
      }

      sending = true;
      submitButton.disabled = true;
      const originalLabel = submitButton.textContent;
      submitButton.textContent = "Enviando...";

      const tracking = resolveTracking();
      const payload = {
        origem: ORIGEM,
        nome,
        whatsapp,
        atendentes: answers.atendentes,
        problema: answers.problema,
        sistema: answers.sistema,
        pagina: window.location.href,
        bot_field: overlay.querySelector("[data-honeypot]")?.value || "",
      };
      for (const key of UTM_KEYS.concat("fbclid")) payload[key] = tracking[key] || "";

      try {
        const response = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error(`Falha ${response.status}`);

        // Só aqui o lead existe de verdade — antes disso não há conversão.
        if (!leadFired) {
          leadFired = true;
          track("Lead", {
            content_name: "Lead site",
            content_category: answers.problema,
          });
        }
        formArea.hidden = true;
        success.hidden = false;
        modal.scrollTop = 0;
      } catch {
        setError("whatsapp", "Não conseguimos enviar agora. Tente novamente.");
        submitButton.textContent = originalLabel;
        submitButton.disabled = false;
        sending = false;
        return;
      }

      submitButton.textContent = originalLabel;
      submitButton.disabled = false;
      sending = false;
    }

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close();

      const closeButton = event.target.closest(".tork-lead-close");
      if (closeButton) close();

      const back = event.target.closest(".tork-lead-back");
      if (back) showStep(Math.max(0, current - 1));

      const option = event.target.closest(".tork-lead-option");
      if (option) {
        markFormStart();
        const step = STEPS[current];
        answers[step.key] = option.dataset.value;
        option
          .closest(".tork-lead-options")
          .querySelectorAll(".tork-lead-option")
          .forEach((button) => button.setAttribute("aria-pressed", String(button === option)));
        window.setTimeout(() => showStep(Math.min(current + 1, steps.length - 1)), 160);
      }

      if (event.target.closest("[data-submit]")) submit();
    });

    // Só conta como início real quando a pessoa digita, não ao abrir o modal.
    [nameInput, phoneInput].forEach((input) => input.addEventListener("input", markFormStart, { once: false }));

    phoneInput.addEventListener("input", () => {
      const position = phoneInput.selectionStart === phoneInput.value.length;
      phoneInput.value = maskPhone(phoneInput.value);
      if (position) phoneInput.setSelectionRange(phoneInput.value.length, phoneInput.value.length);
    });

    [nameInput, phoneInput].forEach((input) =>
      input.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        if (input === nameInput) phoneInput.focus();
        else submit();
      })
    );

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && overlay.dataset.open === "true") close();
    });

    // Prende o foco dentro do modal enquanto ele estiver aberto.
    overlay.addEventListener("keydown", (event) => {
      if (event.key !== "Tab") return;
      const focusables = Array.from(
        overlay.querySelectorAll('button:not([disabled]), input, a[href]')
      ).filter((element) => element.offsetParent !== null);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    // Os CTAs principais só abrem o formulário. Os links reais de WhatsApp
    // ficam dentro da tela de sucesso, criada após o envio confirmado.
    document.addEventListener("click", (event) => {
      const cta = event.target.closest("[data-tork-cta]");
      if (!cta) return;
      event.preventDefault();
      open(cta.dataset.torkCta);
    });

    // Guarda a origem já na chegada, antes de qualquer navegação interna.
    resolveTracking();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
