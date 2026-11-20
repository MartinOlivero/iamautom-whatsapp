// Los .md del negocio se importan como texto (regla "Text" en wrangler.jsonc).
declare module "*.md" {
  const texto: string;
  export default texto;
}
