# ICT Statusmonitor - Google Sheets beheer

Deze GitHub Pages-versie gebruikt Google Sheets als beheeromgeving.

Publieke pagina's:

- Medewerkers: `https://wbooij-web.github.io/statuspagina/`
- Beheeruitleg: `https://wbooij-web.github.io/statuspagina/admin.html`

## Bestanden voor GitHub

Upload/vervang de inhoud van deze map in de repository `wbooij-web/statuspagina`.

Belangrijkste bestanden:

- `index.html`: medewerkerspagina
- `admin.html`: beheeruitleg
- `app.js`: leest de Google Sheet CSV
- `sheet-config.json`: bevat de gepubliceerde Google Sheet CSV-link
- `data.json`: fallbackdata zolang er nog geen Sheet gekoppeld is
- `styles.css`, `status-hero.png`, `vo-campus-logo.png`: styling en afbeeldingen

## Google Sheet koppelen

1. Maak een Google Sheet met het template `ICT-statusmonitor-Google-Sheet-template.xlsx`.
2. Deel de sheet met je ICT-collega's.
3. Kies in Google Sheets: `Bestand > Delen > Publiceren op internet`.
4. Kies tabblad `Statussen`.
5. Kies formaat `CSV`.
6. Kopieer de gepubliceerde CSV-link.
7. Zet die link in `sheet-config.json`:

```json
{
  "csvUrl": "https://docs.google.com/spreadsheets/d/e/.../pub?gid=0&single=true&output=csv"
}
```

Daarna leest de medewerkerspagina de statussen uit Google Sheets. Geen GitHub-token meer nodig.

Let op: Google Sheets en GitHub Pages kunnen kort cachen. Ververs de medewerkerspagina na een paar minuten als wijzigingen niet direct zichtbaar zijn.
