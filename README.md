# KenyDev — Templates de Landing Pages

## Template: Barbearia Estilo & Precisão

- Página: `/site-pages/barbearia-estilo-precisao/`
- A galeria está preparada para armazenar imagens no disco da VPS, sem Cloudflare R2.
- A listagem de fotos é pública; login, upload e remoção exigem senha administrativa.
- Formatos aceitos: JPG, PNG, WEBP e AVIF; até 6 MB por imagem.

### Preparar na VPS

1. Instale Node.js LTS e Nginx.
2. Envie/clonе este repositório para a VPS.
3. Na raiz do projeto, execute `bash ./build.sh`.
4. Entre em `vps-gallery/` e execute `npm install`.
5. Copie `.env.example` para `.env` e configure a senha e o segredo.
6. Inicie com `npm start`; em produção, mantenha o processo ativo com systemd ou PM2.
7. Configure o Nginx com o exemplo `nginx-site.example` e habilite HTTPS.

O backend Node serve os arquivos estáticos da pasta `public` e a API `/api/gallery`. As imagens são gravadas em `storage/gallery/barbearia/` (ou no caminho definido por `GALLERY_STORAGE_DIR`).

### Variáveis de ambiente

- `PORT`: porta HTTP local (padrão 3000).
- `GALLERY_ADMIN_PASSWORD`: senha forte com pelo menos 12 caracteres.
- `GALLERY_SESSION_SECRET`: segredo aleatório com pelo menos 32 caracteres.
- `GALLERY_STORAGE_DIR`: diretório opcional e persistente para as imagens.

**Estado atual:** arquivos preparados no GitHub, mas ainda não publicados nem testados em uma VPS. O site que continua no Cloudflare não terá a galeria ativa até a migração do site e da API para a VPS, com domínio e proxy configurados. Faça backup periódico do diretório de imagens.
