/**
 * Phase 0: an empty dark window. The 40px top strip is the window drag region
 * (UI_SPEC §1); the rail, top bar and views arrive in phase 1.
 */
export function App() {
  return (
    <div data-testid="app-root" className="flex h-full flex-col bg-background">
      <div data-testid="title-bar" className="h-10 shrink-0 [-webkit-app-region:drag]" />
    </div>
  )
}
