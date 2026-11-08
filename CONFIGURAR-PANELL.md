# Com activar el panell d'administració

El panell (`admin.html`) permet editar els paquets de la web: noms, textos en tres idiomes, preus, opcions, què inclou cada paquet i les maquetes d'exemple. Els canvis es guarden a Supabase i la web els mostra al moment. Mentre no estigui connectat, la web mostra els paquets de `assets/paquets-dades.js`.

## 1. Crea un projecte nou a Supabase

Entra a https://supabase.com/dashboard i crea un projecte nou, per exemple `mna-labs`, a la regió de la Unió Europea. No facis servir el projecte de lliga.cat.

## 2. Crea la taula i les regles de seguretat

Ves a **SQL Editor**, enganxa aquest codi i executa'l:

```sql
create table if not exists public.contingut (
  id text primary key,
  dades jsonb not null,
  actualitzat timestamptz not null default now()
);

alter table public.contingut enable row level security;

-- Tothom pot llegir els paquets (la web els ha de mostrar)
create policy "lectura publica" on public.contingut
  for select using (true);

-- Només el compte de l'equip pot crear-los i modificar-los
create policy "escriptura equip" on public.contingut
  for insert with check ((auth.jwt() ->> 'email') = 'labs.mna@gmail.com');
create policy "actualitzacio equip" on public.contingut
  for update using ((auth.jwt() ->> 'email') = 'labs.mna@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'labs.mna@gmail.com');
```

## 3. Crea l'usuari del panell

Ves a **Authentication › Users › Add user › Create new user**:

- Email: `labs.mna@gmail.com`
- Password: la contrasenya que vulgueu. Escriviu-la vosaltres aquí, no la poseu mai dins del codi de la web.
- Marqueu **Auto Confirm User**.

Després, a **Authentication › Sign In / Providers**, desactiveu **Allow new users to sign up**, perquè ningú més es pugui crear un compte.

## 4. Connecta la web

Ves a **Project Settings › API** i copia:

- **Project URL**
- La clau **anon public** (mai la `service_role`)

Enganxa-les a `assets/config.js`:

```js
window.MNA_CONFIG = {
  supabaseUrl: 'https://xxxxxxxx.supabase.co',
  supabaseAnonKey: 'eyJ...',
};
```

No hi poseu el correu del compte d'administració: el fitxer és públic i seria regalar la meitat de l'accés. El navegador ja el recorda quan hi entreu.

Torna a publicar la web. Ja podeu entrar a `https://lligacat.github.io/mna-labs/admin.html` amb el correu i la contrasenya.

## Seguretat

- La clau anon és pública per disseny: el que protegeix les dades són les regles del pas 2. Només el compte de l'equip pot escriure.
- Si la contrasenya que vau escriure al xat és la del Gmail `labs.mna@gmail.com`, canvieu-la. Per al panell, millor una contrasenya diferent de la del correu.
- Per provar el panell sense Supabase, obriu `admin.html?prova`. Els canvis es guarden només al vostre navegador i es veuen a `paquets.html?prova`.
