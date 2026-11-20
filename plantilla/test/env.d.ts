// Le dice a TypeScript que el "env" de los tests tiene las mismas variables que el bot.
type EnvDelBot = import("../src/index").Env;
declare namespace Cloudflare {
  interface Env extends EnvDelBot {
    MIGRACIONES: import("cloudflare:test").D1Migration[];
  }
}
