const DESTINATION = "kenedyygortomaz@gmail.com";
const SENDER = "KenyDev <onboarding@resend.dev>";
const MAX_PDF_BYTES = 8 * 1024 * 1024;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function toBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname !== "/api/briefing") {
      if (url.pathname.startsWith("/api/")) return json({ error: "Rota não encontrada." }, 404);
      return env.ASSETS.fetch(request);
    }

    if (request.method !== "POST") {
      return json({ error: "Método não permitido." }, 405);
    }

    if (!request.headers.get("content-type")?.includes("multipart/form-data")) {
      return json({ error: "Formato de envio inválido." }, 415);
    }

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_PDF_BYTES + 512 * 1024) {
      return json({ error: "O arquivo excede o limite de 8 MB." }, 413);
    }

    let form;
    try {
      form = await request.formData();
    } catch {
      return json({ error: "Não foi possível ler os dados enviados." }, 400);
    }

    // Campo invisível anti-spam: se preenchido, rejeita silenciosamente.
    if (String(form.get("_honey") || "").trim()) {
      return json({ error: "Não foi possível validar o envio." }, 400);
    }

    const email = String(form.get("E-mail do cliente") || "").trim();
    const name = String(form.get("Nome do cliente") || "").trim();
    const company = String(form.get("Empresa") || "").trim();
    const attachment = form.get("attachment");

    if (!name || !company || !validEmail(email)) {
      return json({ error: "Confira seu nome, empresa e e-mail." }, 400);
    }

    if (!attachment || typeof attachment.arrayBuffer !== "function") {
      return json({ error: "O PDF do briefing não foi anexado. Tente novamente." }, 400);
    }

    if (attachment.size <= 0 || attachment.size > MAX_PDF_BYTES) {
      return json({ error: "O PDF deve ter no máximo 8 MB." }, 413);
    }

    if (attachment.type !== "application/pdf" || !attachment.name.toLowerCase().endsWith(".pdf")) {
      return json({ error: "O anexo precisa ser um arquivo PDF válido." }, 415);
    }

    if (!env.RESEND_API_KEY) {
      return json({ error: "O serviço de envio ainda não está configurado. Avise a KenyDev." }, 503);
    }

    const bytes = new Uint8Array(await attachment.arrayBuffer());
    const payload = {
      from: SENDER,
      to: [DESTINATION],
      reply_to: email,
      subject: "Novo briefing de site — KenyDev",
      html: "<p>Um novo briefing foi recebido pelo formulário KenyDev.</p>" +
        "<p><strong>Cliente:</strong> " + escapeHtml(name) + "</p>" +
        "<p><strong>Empresa:</strong> " + escapeHtml(company) + "</p>" +
        "<p>As respostas completas estão no PDF anexado.</p>",
      attachments: [{
        filename: attachment.name.replace(/[^a-zA-Z0-9._-]/g, "_"),
        content: toBase64(bytes),
      }],
    };

    let resendResponse;
    try {
      resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + env.RESEND_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch {
      return json({ error: "Falha de conexão com o serviço de e-mail. Tente novamente." }, 502);
    }

    if (!resendResponse.ok) {
      // Não expõe a chave nem detalhes internos do provedor ao visitante.
      return json({
        error: "O Resend recusou o envio. Verifique o domínio remetente e a configuração da conta Resend.",
      }, 502);
    }

    return json({ ok: true });
  },
};

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}
