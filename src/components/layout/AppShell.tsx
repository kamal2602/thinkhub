import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { CommandPalette } from '../common/CommandPalette';

export function AppShell({
  children,
  currentView,
  onNavigate,
  isAdmin = false,
}: {
  children: React.ReactNode;
  currentView: string;
  onNavigate: (view: string) => void;
  isAdmin?: boolean;
}) {
  const [commandOpen, setCommandOpen] = useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50">
      <Sidebar
        currentView={currentView}
        onNavigate={onNavigate}
        isAdmin={isAdmin}
      />

      <div style={{ marginLeft: 'var(--sidebar-width)' }}>
        <TopBar onOpenCommand={() => setCommandOpen(true)} />

        <main
          className="p-6 animate-fade-in"
          style={{ marginTop: 'var(--topbar-height)' }}
        >
          {children}
        </main>
      </div>

      <CommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        onNavigate={onNavigate}
      />
    </div>
  );
}
