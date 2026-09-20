(() => {
  "use strict";

  const WHATSAPP_NUMBER = "5543984129754";
  const CONFIG = {
    site: {
      page: "site",
      description:
        "O Tork responde seus leads no WhatsApp, qualifica cada oportunidade, organiza o funil e conduz a próxima conversa — mesmo quando sua equipe não está disponível.",
      headerCta: "Ver o Tork funcionando",
      headerCtaShort: "Ver demo",
      heroCta: "Ver o Tork funcionando",
      finalCta: "Agendar demonstração sem compromisso",
      benefits: [
        "Respostas no WhatsApp, inclusive fora do horário",
        "Leads qualificados e organizados no funil",
        "Próxima conversa registrada na agenda",
      ],
      proofEyebrow: "Atendimento conectado à operação",
      proofTitle: "Do primeiro contato à próxima conversa, sem perder contexto.",
      proofDescription:
        "Para empresas que vendem e atendem pelo WhatsApp: conversa, oportunidade e agenda ficam no mesmo fluxo para a equipe acompanhar.",
      proofItems: [
        ["WhatsApp", "A IA responde no canal onde seus leads já conversam."],
        ["Funil do CRM", "O histórico e a próxima etapa ficam visíveis para a equipe."],
        [
          "Google Agenda",
          "Quando a integração está conectada, reuniões confirmadas seguem para a agenda.",
        ],
      ],
      proofNote:
        "As integrações e automações são configuradas de acordo com a operação apresentada na demonstração.",
      modalSubtitle:
        "Em 30 segundos, entendemos seu cenário para mostrar uma demonstração mais útil.",
      submitCta: "Quero ver o Tork funcionando",
      whatsappText:
        "Olá, Heitor! Quero conhecer o Tork CRM em uma demonstração sem compromisso.",
    },
    clinica: {
      page: "clinica",
      headline:
        "Atendimento no WhatsApp, mesmo fora do horário.",
      description:
        "O Tork organiza cada conversa, consulta os dados da clínica e conduz o paciente até o próximo passo sem sobrecarregar a recepção.",
      headerCta: "Ver o Tork na minha clínica",
      headerCtaShort: "Ver demo",
      heroCta: "Ver o Tork na minha clínica",
      finalCta: "Agendar demonstração sem compromisso",
      benefits: [
        "Dúvidas e valores respondidos com dados cadastrados",
        "Agendamentos, confirmações e retornos organizados",
        "Atendimento humano acionado quando necessário",
      ],
      proofEyebrow: "Da conversa à agenda",
      proofTitle: "Sua recepção cuida de quem chegou. O Tork organiza quem chamou.",
      proofDescription:
        "Para clínicas que atendem pelo WhatsApp e precisam reduzir espera, organizar dados e conduzir cada paciente ao próximo passo.",
      proofItems: [
        [
          "WhatsApp",
          "Responde dúvidas administrativas e coleta os dados necessários sem perder contexto.",
        ],
        [
          "Agenda",
          "Consulta disponibilidade e registra agendamentos conforme as regras da clínica.",
        ],
        [
          "Histórico centralizado",
          "A equipe retoma a conversa sabendo o que já foi informado e combinado.",
        ],
      ],
      proofNote:
        "A automação segue os serviços, horários e regras configurados para cada clínica.",
      modalSubtitle:
        "Em 30 segundos, entendemos sua clínica para mostrar uma demonstração mais útil.",
      submitCta: "Quero ver o Tork na minha clínica",
      whatsappText:
        "Olá, Heitor! Quero conhecer o Tork CRM para clínicas em uma demonstração sem compromisso.",
    },
  };

  const isClinic = window.location.pathname.startsWith("/clinica");
  const config = isClinic ? CONFIG.clinica : CONFIG.site;

  function setLinkLabel(link, label) {
    if (!link) return;
    const icon = link.querySelector("svg");
    link.replaceChildren(document.createTextNode(`${label} `));
    if (icon) link.append(icon);
  }

  function checkIcon() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "13");
    svg.setAttribute("height", "13");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M20 6 9 17l-5-5");
    svg.append(path);
    return svg;
  }

  function enhanceHeader() {
    const headerCta = document.querySelector('[data-tork-cta="header"]');
    if (headerCta) {
      const spans = headerCta.querySelectorAll("span");
      if (spans[0]) spans[0].textContent = config.headerCta;
      if (spans[1]) spans[1].textContent = config.headerCtaShort;
    }
  }

  function enhanceHero() {
    const heroCta = document.querySelector('[data-tork-cta="hero"]');
    const heroSection = heroCta?.closest("section");
    if (!heroCta || !heroSection) return;

    const headline = heroSection.querySelector("h1");
    const description = headline?.nextElementSibling;
    const actions = heroCta.parentElement;
    const trustLine = actions?.nextElementSibling;

    if (headline) headline.classList.add("tork-hero-heading");
    if (config.headline && headline) headline.textContent = config.headline;
    if (description?.tagName === "P") description.textContent = config.description;
    setLinkLabel(heroCta, config.heroCta);

    if (actions && !heroSection.querySelector(".tork-demo-note")) {
      const note = document.createElement("p");
      note.className = "tork-demo-note";
      note.textContent =
        "Demonstração de 15–20 minutos · sem compromisso · você decide depois de ver funcionando";
      actions.after(note);
    }

    if (trustLine) {
      trustLine.replaceChildren(
        ...config.benefits.map((benefit) => {
          const item = document.createElement("span");
          item.append(checkIcon(), document.createTextNode(` ${benefit}`));
          return item;
        })
      );
    }
  }

  function proofIcon(index) {
    const icons = [
      "M7.9 20A9 9 0 1 0 4 16.1L2 22Z",
      "M4 4h16v16H4z M8 9h8 M8 13h5",
      "M3 5h18v16H3z M16 3v4 M8 3v4 M3 10h18",
    ];
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.8");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    for (const command of icons[index].split(" M")) {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", command.startsWith("M") ? command : `M${command}`);
      svg.append(path);
    }
    return svg;
  }

  function createProofSection() {
    const hero = document.querySelector('[data-tork-cta="hero"]')?.closest("section");
    if (!hero || document.getElementById("confianca-operacional")) return;

    const section = document.createElement("section");
    section.id = "confianca-operacional";
    section.className = "tork-proof";
    section.setAttribute("aria-labelledby", "tork-proof-title");

    const inner = document.createElement("div");
    inner.className = "tork-proof__inner";
    const eyebrow = document.createElement("p");
    eyebrow.className = "tork-proof__eyebrow";
    eyebrow.textContent = config.proofEyebrow;
    const title = document.createElement("h2");
    title.id = "tork-proof-title";
    title.textContent = config.proofTitle;
    const description = document.createElement("p");
    description.className = "tork-proof__description";
    description.textContent = config.proofDescription;
    const grid = document.createElement("div");
    grid.className = "tork-proof__grid";

    config.proofItems.forEach(([itemTitle, itemDescription], index) => {
      const article = document.createElement("article");
      article.className = "tork-proof__item";
      const icon = document.createElement("span");
      icon.className = "tork-proof__icon";
      icon.append(proofIcon(index));
      const heading = document.createElement("h3");
      heading.textContent = itemTitle;
      const copy = document.createElement("p");
      copy.textContent = itemDescription;
      article.append(icon, heading, copy);
      grid.append(article);
    });

    const note = document.createElement("p");
    note.className = "tork-proof__note";
    note.textContent = config.proofNote;
    inner.append(eyebrow, title, description, grid, note);
    section.append(inner);
    hero.after(section);
  }

  function enhanceFinalCta() {
    const finalCta = document.querySelector('[data-tork-cta="final"]');
    if (!finalCta) return;
    setLinkLabel(finalCta, config.finalCta);
    if (!finalCta.parentElement?.querySelector(".tork-final-note")) {
      const note = document.createElement("p");
      note.className = "tork-final-note";
      note.textContent =
        "Demonstração de 15–20 minutos · sem compromisso · seus dados ficam só com a Tork";
      finalCta.after(note);
    }
  }

  function moveFaqBeforeFinalCta() {
    const faq = document.getElementById("perguntas-frequentes");
    const finalSection = document.querySelector('[data-tork-cta="final"]')?.closest("section");
    if (!faq || !finalSection || faq.nextElementSibling === finalSection) return;
    finalSection.before(faq);
  }

  function enhanceModal() {
    const modal = document.querySelector(".tork-lead-modal");
    if (!modal) return false;

    const formArea = modal.querySelector(".tork-lead-form-area");
    const subtitle = formArea?.querySelector(".tork-lead-subtitle");
    const finalQuestion = formArea?.querySelector(
      '.tork-lead-step:last-of-type .tork-lead-question'
    );
    const submit = formArea?.querySelector(".tork-lead-submit");
    const legal = formArea?.querySelector(".tork-lead-legal");
    const successSubtitle = modal.querySelector(".tork-lead-success .tork-lead-subtitle");

    if (subtitle) subtitle.textContent = config.modalSubtitle;
    if (finalQuestion) finalQuestion.textContent = "Como falamos com você?";
    if (submit) submit.textContent = config.submitCta;
    if (legal) {
      legal.textContent =
        "Usaremos seus dados apenas para falar sobre a demonstração. Sem compromisso.";
    }
    if (successSubtitle) {
      successSubtitle.textContent =
        "Agora você pode falar com nossa equipe ou combinar um horário para conhecer a solução.";
    }
    return true;
  }

  function enableCtaFallback() {
    if (document.querySelector(".tork-lead-overlay")) return;
    const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(config.whatsappText)}`;
    document.querySelectorAll("[data-tork-cta]").forEach((cta) => {
      cta.href = href;
      cta.target = "_blank";
      cta.rel = "noreferrer";
    });
  }

  function enhance() {
    if (document.documentElement.dataset.torkConversionEnhancements === "ready") return;
    document.documentElement.dataset.torkPage = config.page;
    enhanceHeader();
    enhanceHero();
    createProofSection();
    enhanceFinalCta();
    moveFaqBeforeFinalCta();
    enhanceModal();
    enableCtaFallback();
    document.documentElement.dataset.torkConversionEnhancements = "ready";
  }

  if (document.readyState === "complete") {
    enhance();
  } else {
    window.addEventListener("load", enhance, { once: true });
  }
})();
