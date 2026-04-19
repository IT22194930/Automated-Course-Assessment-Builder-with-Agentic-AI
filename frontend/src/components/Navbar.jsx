import { Link, useLocation } from 'react-router-dom';
import { Cpu, BookOpen, Home, ListOrdered } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();

  return (
    <nav className="navbar" id="navbar">
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 15px rgba(139,92,246,0.4)',
          }}>
            <Cpu size={18} color="white" />
          </div>
          <div>
            <span style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.02em', color: '#f1f5f9' }}>Course</span>
            <span style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.02em' }} className="gradient-text"> Builder AI</span>
          </div>
        </Link>

        {/* Nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <NavLink to="/"        active={location.pathname === '/'}        icon={<Home size={15} />}        label="Pipeline" />
          <NavLink to="/builder" active={location.pathname === '/builder'} icon={<ListOrdered size={15} />} label="Step Builder" />
          <NavLink to="/results" active={location.pathname === '/results'} icon={<BookOpen size={15} />}    label="Results" />
        </div>
      </div>
    </nav>
  );
}

function NavLink({ to, active, icon, label }) {
  return (
    <Link to={to} style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
      borderRadius: 10, textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500,
      transition: 'all 0.2s ease',
      background: active ? 'rgba(139,92,246,0.15)' : 'transparent',
      color: active ? '#a78bfa' : '#94a3b8',
      border: active ? '1px solid rgba(139,92,246,0.3)' : '1px solid transparent',
    }}>
      {icon}
      {label}
    </Link>
  );
}
