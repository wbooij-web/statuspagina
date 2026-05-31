# ICT Statusmonitor - GitHub Pages export

Upload de inhoud van deze map naar de repository `wbooij-web/statuspagina`.

Publieke pagina's:

- Medewerkers: `https://wbooij-web.github.io/statuspagina/`
- Beheer: `https://wbooij-web.github.io/statuspagina/admin.html`

Bestanden:

- `index.html`: medewerkerspagina
- `admin.html`: beheerpagina
- `data.json`: gedeelde statusdata
- `styles.css`, `app.js`: gedeelde styling en logica
- `status-hero.png`, `vo-campus-logo.png`: lokale afbeeldingen

## Beheer gebruiken

Huidig beheerwachtwoord:

```text
ICT2026!
```

Daarnaast heeft iedere beheerder een GitHub fine-grained personal access token nodig voor repository `wbooij-web/statuspagina`.

Benodigde rechten:

- Repository access: alleen `wbooij-web/statuspagina`
- Permissions: `Contents` op `Read and write`

De beheerpagina schrijft wijzigingen naar `data.json` via de GitHub API. De medewerkerspagina leest `data.json` uit GitHub Pages. Na opslaan kan GitHub Pages heel kort nodig hebben om de nieuwe data uit te serveren.

Let op: dit is geschikt voor een kleine interne statuspagina. Voor echte beveiliging en auditlogging is een server-side beheeromgeving beter.
