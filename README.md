# Mais 5 Landing Pages

04 — Imobiliária Vértice  
05 — Clínica de estética Lumi  
06 — Cursos online Impulso  
07 — Fotografia Luz & Foco  
08 — SaaS Nexflow  

Cada pasta contém HTML, CSS, JavaScript e instruções. Personalize informações demonstrativas e o número do WhatsApp antes de publicar ou entregar ao cliente.

## Template: Barbearia Estilo & Precisão

- Página: `/site-pages/barbearia-estilo-precisao/`
- A galeria usa Cloudflare R2; as imagens enviadas ficam disponíveis para todos os visitantes.
- O envio e a remoção de imagens exigem senha administrativa. A senha nunca fica no HTML.

### Configuração obrigatória no Cloudflare

1. Crie um bucket R2 chamado `kenydev-barbearia-galeria`.
2. Confirme o binding R2 `GALLERY_BUCKET` no Worker `templates-landing-pages`.
3. Cadastre os secrets `GALLERY_ADMIN_PASSWORD` (senha forte da equipe) e `GALLERY_SESSION_SECRET` (segredo aleatório longo, mínimo 32 caracteres).
4. Faça o deploy do Worker. Sem o bucket e os dois secrets, a galeria não aceitará uploads.

Cada imagem aceita JPG, PNG, WEBP ou AVIF, até 6 MB. A listagem pública é somente leitura; upload e exclusão exigem sessão administrativa.
