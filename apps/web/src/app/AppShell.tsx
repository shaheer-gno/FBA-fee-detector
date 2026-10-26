import { Link, Outlet, useRouterState } from '@tanstack/react-router';

const links = [
  { to: '/', label: 'Products' },
  { to: '/analyze', label: 'One-off analyze' },
  { to: '/history', label: 'History' },
] as const;

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <>
      <header className="app-header">
        <div className="brand">FBA Fee Detector</div>
        <nav className="nav">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              search={link.to === '/history' ? {} : undefined}
              className={pathname === link.to ? 'active' : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
      <Outlet />
    </>
  );
}
