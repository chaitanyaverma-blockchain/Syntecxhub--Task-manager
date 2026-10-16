import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ListTodo,
  Clock,
  CheckCircle,
  Flame,
  ArrowRight,
  Plus,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import TaskCard from '../components/TaskCard';
import TaskForm from '../components/TaskForm';
import ConfirmDialog from '../components/ConfirmDialog';
import Loader from '../components/Loader';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0, highPriority: 0 });
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Layout & Modal states
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    setError(null);
    try {
      const [statsRes, tasksRes] = await Promise.all([
        api.get('/tasks/stats'),
        api.get('/tasks?sortBy=createdAt_desc'),
      ]);

      if (statsRes.data.success) {
        setStats(statsRes.data.stats);
      }
      if (tasksRes.data.success) {
        // Take top 6 recent tasks
        setRecentTasks(tasksRes.data.tasks.slice(0, 6));
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Handle task status toggle (pending <-> completed)
  const handleToggleStatus = async (task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      await api.patch(`/tasks/${task._id}/status`, { status: newStatus });
      fetchDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to update task status');
    }
  };

  // Handle Task Submit (create or edit)
  const handleTaskSubmit = async (payload) => {
    setActionLoading(true);
    try {
      if (editingTask) {
        await api.put(`/tasks/${editingTask._id}`, payload);
      } else {
        await api.post('/tasks', payload);
      }
      setIsTaskModalOpen(false);
      setEditingTask(null);
      fetchDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to save task');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Task Delete
  const handleDeleteConfirm = async () => {
    if (!deletingTask) return;
    setActionLoading(true);
    try {
      await api.delete(`/tasks/${deletingTask._id}`);
      setDeletingTask(null);
      fetchDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to delete task');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="app-container">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="main-wrapper">
        <Navbar
          title="Dashboard"
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onOpenNewTaskModal={() => {
            setEditingTask(null);
            setIsTaskModalOpen(true);
          }}
        />

        <main className="main-content">
          {/* Welcome Banner */}
          <div
            style={{
              marginBottom: '28px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <div>
              <h1 style={{ fontSize: '26px', fontWeight: 700 }}>
                Welcome back, {user?.name ? user.name.split(' ')[0] : 'there'} 👋
              </h1>
              <p className="text-muted" style={{ marginTop: '4px' }}>
                Here is an overview of your productivity and upcoming commitments.
              </p>
            </div>

            <button
              onClick={fetchDashboardData}
              className="btn btn-secondary"
              title="Refresh dashboard metrics"
              aria-label="Refresh dashboard data"
            >
              <RefreshCw size={15} />
              <span>Refresh</span>
            </button>
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '24px' }}>
              <span>{error}</span>
              <button
                onClick={fetchDashboardData}
                className="btn btn-secondary"
                style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: '12px' }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Statistics Cards */}
          <section className="stats-grid">
            <StatCard
              title="Total Tasks"
              count={stats.total}
              icon={ListTodo}
              theme="indigo"
            />
            <StatCard
              title="Pending Tasks"
              count={stats.pending}
              icon={Clock}
              theme="amber"
            />
            <StatCard
              title="Completed Tasks"
              count={stats.completed}
              icon={CheckCircle}
              theme="emerald"
            />
            <StatCard
              title="High Priority"
              count={stats.highPriority}
              icon={Flame}
              theme="rose"
            />
          </section>

          {/* Recent Tasks Section */}
          <section>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '18px',
              }}
            >
              <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Recent Tasks</h2>
              {recentTasks.length > 0 && (
                <Link
                  to="/tasks"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}
                >
                  <span>View All Tasks</span>
                  <ArrowRight size={16} />
                </Link>
              )}
            </div>

            {loading ? (
              <Loader message="Loading dashboard data..." />
            ) : recentTasks.length === 0 ? (
              <div
                className="empty-state-card"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px dashed var(--border-subtle)',
                  borderRadius: '14px',
                  padding: '48px 24px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    backgroundColor: '#eef2ff',
                    color: '#4f46e5',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px',
                  }}
                >
                  <FolderOpen size={28} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 600 }}>No tasks found</h3>
                <p className="text-muted text-sm" style={{ maxWidth: '360px', margin: '8px auto 20px' }}>
                  You don't have any tasks created yet. Get organized and start tracking your priorities right now.
                </p>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setEditingTask(null);
                    setIsTaskModalOpen(true);
                  }}
                >
                  <Plus size={16} />
                  <span>Create Your First Task</span>
                </button>
              </div>
            ) : (
              <div className="tasks-grid">
                {recentTasks.map((task) => (
                  <TaskCard
                    key={task._id}
                    task={task}
                    onToggleStatus={handleToggleStatus}
                    onEdit={(t) => {
                      setEditingTask(t);
                      setIsTaskModalOpen(true);
                    }}
                    onDelete={(t) => setDeletingTask(t)}
                  />
                ))}
              </div>
            )}
          </section>
        </main>
      </div>

      {/* Task Create / Edit Modal Form */}
      <TaskForm
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSubmit={handleTaskSubmit}
        initialTask={editingTask}
        isLoading={actionLoading}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingTask)}
        title="Delete Task"
        message={`Are you sure you want to delete "${deletingTask?.title}"? This action cannot be undone.`}
        confirmText="Yes, Delete"
        isLoading={actionLoading}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeletingTask(null)}
      />
    </div>
  );
};

export default Dashboard;
