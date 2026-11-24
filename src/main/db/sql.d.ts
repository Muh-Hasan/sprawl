// Vite's `?raw` suffix imports a file's text (used for the SQL migrations).
declare module '*.sql?raw' {
  const sql: string
  export default sql
}
