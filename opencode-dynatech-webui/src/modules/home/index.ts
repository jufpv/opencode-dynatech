import type { WebuiModule } from "../../module.ts"

export function createHomeModule(): WebuiModule {
  return {
    id: "home",
    mountPath: "/",
    renderPage: () => `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta http-equiv="refresh" content="0;url=/chat"><title>Dynatech WebUI</title></head>
<body><p><a href="/chat">Chat</a></p></body></html>`,
  }
}
