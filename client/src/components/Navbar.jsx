import React from 'react';
import { Menu, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';

const Navbar = ({ onOpenSidebar, onOpenNewTaskModal, title = 'Dashboard' }) => {
  const { user } = useAuth();

  return (
    <header className="top-navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          className="btn-icon mobile-toggle"
          onClick={onOpenSidebar}
          aria-label="Open navigation menu"
        >
          <Menu size={22} />
        </button>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600 }}>{title}</h2>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <ThemeToggle id="navbar-theme-toggle" />
        <button
          className="btn btn-primary"
          onClick={onOpenNewTaskModal}
          id="btn-add-task-global"
        >
          <Plus size={18} />
          <span>Add Task</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
