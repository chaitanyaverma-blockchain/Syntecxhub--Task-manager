import React, { useState, useEffect, useCallback } from 'react';
import { Plus, FolderSearch, RefreshCw } from 'lucide-react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import TaskCard from '../components/TaskCard';
import TaskForm from '../components/TaskForm';
import TaskFilters from '../components/TaskFilters';
import ConfirmDialog from '../components/ConfirmDialog';
import Loader from '../components/Loader';

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt_desc');

  // Layout & Modal states
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (statusFilter) params.append('status', statusFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      if (sortBy) params.append('sortBy', sortBy);

      const { data } = await api.get(`/tasks?${params.toString()}`);
      if (data.success) {
        setTasks(data.tasks);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch tasks.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, priorityFilter, sortBy]);

  // Debounced search / filter trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTasks();
    }, 250);

    return () => clearTimeout(timer);
  }, [fetchTasks]);

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setPriorityFilter('');
    setSortBy('createdAt_desc');
  };

  const handleToggleStatus = async (task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      await api.patch(`/tasks/${task._id}/status`, { status: newStatus });
      fetchTasks();
    } catch (err) {
      alert(err.message || 'Failed to update task status.');
    }
  };

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
      fetchTasks();
    } catch (err) {
      alert(err.message || 'Failed to save task.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTask) return;
    setActionLoading(true);
    try {
      await api.delete(`/tasks/${deletingTask._id}`);
      setDeletingTask(null);
      fetchTasks();
    } catch (err) {
      alert(err.message || 'Failed to delete task.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="app-container">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="main-wrapper">
        <Navbar
          title="All Tasks"
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onOpenNewTaskModal={() => {
            setEditingTask(null);
            setIsTaskModalOpen(true);
          }}
        />

        <main className="main-content">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Task Management</h1>
              <p className="text-muted text-sm">
                Organize, search, filter, and track all your tasks in one place.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={fetchTasks}
                className="btn btn-secondary"
                title="Refresh task list"
                aria-label="Refresh tasks"
              >
                <RefreshCw size={15} />
                <span>Refresh</span>
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setEditingTask(null);
                  setIsTaskModalOpen(true);
                }}
              >
                <Plus size={16} />
                <span>Add Task</span>
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <TaskFilters
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            priorityFilter={priorityFilter}
            onPriorityChange={setPriorityFilter}
            sortBy={sortBy}
            onSortChange={setSortBy}
            onClearFilters={handleClearFilters}
          />

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '20px' }}>
              <span>{error}</span>
              <button
                onClick={fetchTasks}
                className="btn btn-secondary"
                style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: '12px' }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Task Grid / States */}
          {loading ? (
            <Loader message="Loading your tasks..." />
          ) : tasks.length === 0 ? (
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
                  backgroundColor: '#f1f5f9',
                  color: '#64748b',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                }}
              >
                <FolderSearch size={28} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 600 }}>No matching tasks found</h3>
              <p className="text-muted text-sm" style={{ maxWidth: '360px', margin: '8px auto 20px' }}>
                {search || statusFilter || priorityFilter
                  ? 'No tasks matched your active filter or search criteria. Try resetting your filters.'
                  : "You haven't created any tasks yet. Click the button below to add your first one!"}
              </p>
              {search || statusFilter || priorityFilter ? (
                <button className="btn btn-secondary" onClick={handleClearFilters}>
                  Clear All Filters
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setEditingTask(null);
                    setIsTaskModalOpen(true);
                  }}
                >
                  <Plus size={16} />
                  <span>Create Task</span>
                </button>
              )}
            </div>
          ) : (
            <div className="tasks-grid">
              {tasks.map((task) => (
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
        </main>
      </div>

      {/* Task Form Modal */}
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
        message={`Are you sure you want to permanently delete "${deletingTask?.title}"?`}
        confirmText="Yes, Delete"
        isLoading={actionLoading}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeletingTask(null)}
      />
    </div>
  );
};

export default Tasks;
