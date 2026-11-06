/* Connexió amb Supabase per al panell d'administració.
   Enganxa aquí l'URL del projecte i la clau pública "anon" (Project Settings > API).
   La clau anon és pública per disseny: la seguretat la donen les regles de la taula (vegeu CONFIGURAR-PANELL.md).
   Mai hi posis la contrasenya de ningú ni la clau "service_role". */
window.MNA_CONFIG = {
  supabaseUrl: '',
  supabaseAnonKey: '',
  adminEmail: 'equip.lliga.cat@gmail.com',
};
