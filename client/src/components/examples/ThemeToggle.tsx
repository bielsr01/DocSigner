import { ThemeToggle } from '../theme-toggle';

export default function ThemeToggleExample() {
  return (
    <div className="p-6">
      <div className="max-w-md">
        <h1 className="text-2xl font-bold mb-4">Theme Toggle</h1>
        <p className="text-muted-foreground mb-4">
          Clique no botão para alternar entre modo claro e escuro.
        </p>
        <div className="flex items-center gap-4">
          <span className="text-sm">Alternar tema:</span>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}