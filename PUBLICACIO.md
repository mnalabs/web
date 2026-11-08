# Codi privat, web públic

`mnalabs/web` (aquest repositori) pot ser **privat**. El web que veu la gent es publica des d'un segon repositori **públic**, `mnalabs/web-publica`, que només conté els fitxers que el navegador ja descarrega. El codi font (`src/`), les instruccions i l'historial no hi arriben mai.

```
mnalabs/web (privat)  ──[acció «Publicar el web» a cada canvi a main]──▶  mnalabs/web-publica (públic)  ──GitHub Pages──▶  mnalabs.eu
```

- `src/preparar-publicacio.sh` tria els fitxers públics i atura la publicació si en detecta algun d'intern (`src/`, `CLAUDE.md`…).
- `.github/workflows/publicar-web.yml` genera les pàgines (`node src/build.js`) i les copia a `web-publica`.
- Es pot provar en local: `node src/build.js && bash src/preparar-publicacio.sh /tmp/prova`.

## Posada en marxa (una sola vegada)

L'ordre importa: el web actual no s'ha de tocar fins al pas 5.

1. **Crea el repositori públic** `mnalabs/web-publica` (buit, sense README), a GitHub.
2. **Crea una clau de publicació** a un ordinador teu (no la posis mai dins del codi):
   ```bash
   ssh-keygen -t ed25519 -N "" -C "publicacio-mnalabs" -f clau_publicacio
   ```
3. **Reparteix la clau**:
   - `clau_publicacio.pub` → a `web-publica` › Settings › Deploy keys › Add deploy key, amb **Allow write access**.
   - Contingut de `clau_publicacio` (la privada) → a `web` › Settings › Secrets and variables › Actions › New repository secret, amb el nom `CLAU_PUBLICACIO`.
   - Després **esborra** els dos fitxers del teu ordinador.
4. **Fes la primera publicació**: a `web` › Actions › «Publicar el web» › Run workflow. Quan acabi, a `web-publica` hi haurà el web. Activa-hi Pages (Settings › Pages › Deploy from a branch › `main` / `/ (root)`) i comprova'l a l'adreça temporal `mnalabs.github.io/web-publica`.
5. **Canvia el domini**: a `web` › Settings › Pages, treu `mnalabs.eu` (o desactiva Pages); a `web-publica` › Settings › Pages, afegeix `mnalabs.eu` i marca *Enforce HTTPS*. Els DNS no canvien. Passaran uns minuts fins que el certificat torni a estar actiu.
6. **Fes privat `mnalabs/web`** (Settings › Danger Zone › Change visibility).

## Dia a dia

Igual que sempre: canvi a `src/`, `node src/build.js`, commit i push a `main`. L'acció publica el web sola en un parell de minuts. Si falla, surt a la pestanya Actions.

## Què continua sent públic

El que el navegador descarrega (HTML, CSS, JavaScript, imatges) no es pot amagar. Ho serà sempre. Tampoc s'esborra el que algú hagi copiat del repositori mentre era públic. Per això les claus i contrasenyes no han d'estar mai al codi (vegeu `CLAUDE.md` i `CONFIGURAR-PANELL.md`).
