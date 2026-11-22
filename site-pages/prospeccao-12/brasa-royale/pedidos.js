(() => {
  const basket = new Map();
  const products = [
    "X-Burguer", "X-Salada", "X-Bacon", "X-Tudo", "Brasa Royale",
    "Brasa & Sabor", "Brasa Burgue", "Royale Brasa", "Brasa Premium",
    "Porções da casa", "Porção para dividir", "Porção na brasa",
    "Espetinhos na brasa", "Espetinho especial", "Seleção de espetos"
  ];

  const style = document.createElement("style");
  style.textContent = [
    ".nav .order-trigger{border:0;cursor:pointer;font:inherit;font-weight:900}",
    ".nav .nav-staff{color:#d2c8c0;font-size:9px;font-weight:800;letter-spacing:.5px;white-space:nowrap}",
    ".nav .nav-staff:hover{color:#efc653}",
    ".item-foot .order-add{color:#171108;background:#efc653;padding:9px 12px;border-radius:2px;font-size:8px;white-space:nowrap}",
    ".item-foot .order-add:hover{background:#ffdc70}",
    ".order-dialog{width:min(560px,calc(100% - 28px));max-height:calc(100vh - 28px);padding:0;border:1px solid #f2c94c88;background:#171111;color:#fffaf2;box-shadow:0 30px 90px #000b}",
    ".order-dialog::backdrop{background:#050303df;backdrop-filter:blur(5px)}",
    ".order-shell{padding:24px}",
    ".order-head{display:flex;justify-content:space-between;align-items:start;gap:15px;border-bottom:1px solid #ffffff20;padding-bottom:15px}",
    ".order-eyebrow{color:#f2c94c;font-size:8px;font-weight:900;letter-spacing:1.7px;text-transform:uppercase}",
    ".order-head h2{font:700 30px/1.1 'Playfair Display',Georgia,serif;margin:7px 0 0}",
    ".order-close{width:36px;height:36px;border:1px solid #ffffff35;background:transparent;color:white;font-size:20px}",
    ".order-lines{display:grid;gap:9px;max-height:230px;overflow:auto;padding:16px 0}",
    ".order-empty{color:#b9aaa0;font-size:12px;line-height:1.7;padding:8px 0}",
    ".order-line{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;padding-bottom:9px;border-bottom:1px solid #ffffff15}",
    ".order-name{font:700 14px 'Playfair Display',Georgia,serif}",
    ".order-qty{display:flex;align-items:center;gap:11px}",
    ".order-qty button{width:29px;height:29px;border:1px solid #f2c94c66;background:#201818;color:#f2c94c;font-weight:900}",
    ".order-qty span{min-width:14px;text-align:center;font-size:11px;font-weight:900}",
    ".order-form{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:4px}",
    ".order-field{display:grid;gap:6px}",
    ".order-field.full{grid-column:1/-1}",
    ".order-field label{font-size:8px;color:#e8ddd1;font-weight:900;letter-spacing:.8px;text-transform:uppercase}",
    ".order-field input,.order-field select,.order-field textarea{width:100%;min-height:43px;padding:10px 11px;border:1px solid #ffffff32;background:#100c0c;color:#fffaf2;font:500 11px 'DM Sans',Arial,sans-serif;border-radius:2px}",
    ".order-field textarea{min-height:68px;resize:vertical}",
    ".order-field option{background:#100c0c}",
    ".order-foot{display:grid;gap:10px;margin-top:14px}",
    ".order-submit{min-height:47px;border:0;background:#efc653;color:#171108;font-size:10px;font-weight:900;letter-spacing:.7px;text-transform:uppercase}",
    ".order-submit:disabled{opacity:.45;cursor:not-allowed}",
    ".order-disclaimer{margin:0;color:#a99c92;font-size:9px;line-height:1.6}",
    ".order-feedback{min-height:15px;color:#ffb6a9;font-size:10px;line-height:1.5}",
    ".order-success{width:min(460px,calc(100% - 28px));padding:0;border:1px solid #f2c94c88;background:#171111;color:#fffaf2}",
    ".order-success .success-inner{padding:30px;text-align:center}",
    ".order-success .success-mark{width:48px;height:48px;margin:0 auto 16px;border:1px solid #f2c94c;color:#f2c94c;display:grid;place-items:center;font-size:22px}",
    ".order-success h2{font:700 30px 'Playfair Display',Georgia,serif;margin:8px 0}",
    ".order-success p{color:#c6b8ad;font-size:11px;line-height:1.8}",
    ".order-success strong{color:#f2c94c;letter-spacing:1px;font-size:17px}",
    "@media(max-width:620px){.nav .nav-staff{padding:14px 0;border-bottom:1px solid #ffffff18}.order-shell{padding:18px}.order-form{grid-template-columns:1fr}.order-field.full{grid-column:auto}.item-foot .order-add{padding:8px 9px;font-size:7px}}"
  ].join("\n");
  document.head.appendChild(style);

  const nav = document.querySelector(".nav");
  if (nav) {
    const oldCta = nav.querySelector(".nav-cta");
    if (oldCta) {
      const open = document.createElement("button");
      open.type = "button";
      open.className = "nav-cta order-trigger";
      open.id = "brasaOpenOrder";
      open.innerHTML = "Meu pedido <span id='brasaBasketCount'>0</span> <span aria-hidden='true'>↗</span>";
      oldCta.replaceWith(open);
    }
    const staff = document.createElement("a");
    staff.href = "painel.html";
    staff.className = "nav-staff";
    staff.textContent = "Área da equipe";
    nav.appendChild(staff);
    staff.addEventListener("click", () => nav.classList.remove("open"));
  }

  document.querySelectorAll(".item").forEach((card) => {
    const oldButton = card.querySelector(".item-foot button");
    const title = card.querySelector("h3");
    if (!oldButton || !title) return;
    const button = oldButton.cloneNode(true);
    const name = title.textContent.trim();
    button.type = "button";
    button.classList.add("order-add");
    button.dataset.product = name;
    button.removeAttribute("data-name");
    button.removeAttribute("data-copy");
    button.textContent = "Adicionar +";
    button.setAttribute("aria-label", "Adicionar " + name + " ao pedido");
    oldButton.replaceWith(button);
    button.addEventListener("click", () => {
      basket.set(name, Math.min(30, (basket.get(name) || 0) + 1));
      renderBasket();
    });
  });

  const dialog = document.createElement("dialog");
  dialog.className = "order-dialog";
  dialog.setAttribute("aria-labelledby", "brasaOrderTitle");
  dialog.innerHTML =
    '<div class="order-shell">' +
      '<header class="order-head"><div><div class="order-eyebrow">Brasa Royale · Montezuma</div><h2 id="brasaOrderTitle">Seu pedido</h2></div><button class="order-close" id="brasaOrderClose" type="button" aria-label="Fechar">×</button></header>' +
      '<div class="order-lines" id="brasaOrderLines" aria-live="polite"></div>' +
      '<div class="order-form">' +
        '<div class="order-field"><label for="brasaOrderType">Como vai pedir?</label><select id="brasaOrderType"><option value="table">Na mesa</option><option value="pickup">Retirada</option></select></div>' +
        '<div class="order-field" id="brasaTableField"><label for="brasaOrderTable">Mesa</label><select id="brasaOrderTable"></select></div>' +
        '<div class="order-field full"><label for="brasaOrderName">Seu nome · opcional</label><input id="brasaOrderName" maxlength="70" autocomplete="name" placeholder="Como podemos chamar você?"></div>' +
        '<div class="order-field full"><label for="brasaOrderNotes">Observações · opcional</label><textarea id="brasaOrderNotes" maxlength="500" placeholder="Algum detalhe para a equipe?"></textarea></div>' +
      '</div>' +
      '<div class="order-foot"><div class="order-feedback" id="brasaOrderFeedback" role="status" aria-live="polite"></div><button class="order-submit" id="brasaOrderSubmit" type="button">Enviar pedido à equipe</button><p class="order-disclaimer">A equipe confirmará valores e disponibilidade antes do preparo. O pagamento é feito diretamente na casa.</p></div>' +
    '</div>';
  document.body.appendChild(dialog);

  const success = document.createElement("dialog");
  success.className = "order-success";
  success.innerHTML = '<div class="success-inner"><div class="success-mark" aria-hidden="true">✓</div><div class="order-eyebrow">Pedido recebido pela equipe</div><h2>Pedido enviado</h2><p id="brasaSuccessCopy"></p><button class="order-submit" id="brasaSuccessClose" type="button">Voltar ao cardápio</button></div>';
  document.body.appendChild(success);

  const table = document.getElementById("brasaOrderTable");
  for (let number = 1; number <= 12; number++) {
    const option = document.createElement("option");
    option.value = String(number);
    option.textContent = "Mesa " + number;
    table.appendChild(option);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  }

  function renderBasket() {
    const list = document.getElementById("brasaOrderLines");
    const count = Array.from(basket.values()).reduce((total, quantity) => total + quantity, 0);
    const counter = document.getElementById("brasaBasketCount");
    if (counter) counter.textContent = String(count);
    document.getElementById("brasaOrderSubmit").disabled = count === 0;
    if (!basket.size) {
      list.innerHTML = '<div class="order-empty">Sua sacola está vazia. Adicione seus favoritos no cardápio para começar.</div>';
      return;
    }
    list.innerHTML = Array.from(basket.entries()).map(([name, quantity]) =>
      '<div class="order-line"><div class="order-name">' + escapeHtml(name) + '</div><div class="order-qty"><button type="button" data-step="-1" data-product="' + escapeHtml(name) + '" aria-label="Remover um ' + escapeHtml(name) + '">−</button><span>' + quantity + '</span><button type="button" data-step="1" data-product="' + escapeHtml(name) + '" aria-label="Adicionar um ' + escapeHtml(name) + '">+</button></div></div>'
    ).join("");
  }

  document.getElementById("brasaOpenOrder")?.addEventListener("click", () => {
    renderBasket();
    dialog.showModal();
    nav?.classList.remove("open");
  });
  document.getElementById("brasaOrderClose").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
  document.getElementById("brasaOrderLines").addEventListener("click", (event) => {
    const control = event.target.closest("button[data-step]");
    if (!control) return;
    const name = control.dataset.product;
    const next = (basket.get(name) || 0) + Number(control.dataset.step);
    if (next <= 0) basket.delete(name); else basket.set(name, Math.min(30, next));
    renderBasket();
  });
  document.getElementById("brasaOrderType").addEventListener("change", (event) => {
    document.getElementById("brasaTableField").hidden = event.target.value !== "table";
  });
  document.getElementById("brasaSuccessClose").addEventListener("click", () => success.close());
  success.addEventListener("click", (event) => { if (event.target === success) success.close(); });

  document.getElementById("brasaOrderSubmit").addEventListener("click", async () => {
    const feedback = document.getElementById("brasaOrderFeedback");
    const submit = document.getElementById("brasaOrderSubmit");
    const orderType = document.getElementById("brasaOrderType").value;
    const payload = {
      order_type: orderType,
      table_no: orderType === "table" ? Number(table.value) : null,
      customer_name: document.getElementById("brasaOrderName").value.trim(),
      notes: document.getElementById("brasaOrderNotes").value.trim(),
      items: Array.from(basket, ([name, quantity]) => ({ name, quantity }))
    };
    feedback.textContent = "";
    submit.disabled = true;
    submit.textContent = "Enviando pedido…";
    try {
      const response = await fetch("/api/brasa/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível enviar o pedido.");
      basket.clear();
      renderBasket();
      dialog.close();
      const place = result.order.order_type === "table" ? "Mesa " + result.order.table_no : "Retirada";
      document.getElementById("brasaSuccessCopy").innerHTML = "Anote o número <strong>" + escapeHtml(result.order.code) + "</strong><br>" + place + " · A equipe já recebeu os itens.";
      success.showModal();
    } catch (error) {
      feedback.textContent = error.message || "Falha de conexão. Tente novamente.";
    } finally {
      submit.disabled = basket.size === 0;
      submit.textContent = "Enviar pedido à equipe";
    }
  });

  renderBasket();
})();
