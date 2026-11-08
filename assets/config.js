/* Connexió amb Supabase per al panell d'administració.
   La clau anon és pública per disseny: la seguretat la donen les regles de la taula (vegeu CONFIGURAR-PANELL.md).
   Mai hi posis la contrasenya de ningú ni la clau service_role.
   Tampoc hi posis el correu del compte d'administració: seria regalar la meitat de l'accés. */
window.MNA_CONFIG = {
  supabaseUrl: 'https://eqkhggjkpaakouvbiodp.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxa2hnZ2prcGFha291dmJpb2RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM5OTg5OTMsImV4cCI6MjEwOTU3NDk5M30.IzOMhgZRpCu7Nc3svqsCBAv9pSrCp2vbsrkpbvkoxpg',
};
