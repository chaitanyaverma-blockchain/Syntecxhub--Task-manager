import React from 'react';
import { Search, RotateCcw, Filter } from 'lucide-react';

const TaskFilters = ({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  priorityFilter,
  onPriorityChange,
  sortBy,
  onSortChange,
  onClearFilters,
}) => {
  const isFiltered =
    Boolean(search) || statusFilter !== '' || priorityFilter !== '' || sortBy !== 'createdAt_desc';

  return (
    <div
      className="task-filters-bar"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '12px',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Search Input */}
      <div
        style={{
          position: 'relative',
          flex: '1 1 240px',
          minWidth: '200px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Search
          size={18}
          color="#94a3b8"
          style={{ position: 'absolute', left: '12px', pointerEvents: 'none' }}
        />
        <input
          type="text"
          placeholder="Search tasks by title..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="form-control"
          style={{ paddingLeft: '38px', height: '40px' }}
        />
      </div>

      {/* Status Filter */}
      <div style={{ flex: '0 1 150px' }}>
        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          className="form-control"
          style={{ height: '40px' }}
          aria-label="Filter by Status"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Priority Filter */}
      <div style={{ flex: '0 1 150px' }}>
        <select
          value={priorityFilter}
          onChange={(e) => onPriorityChange(e.target.value)}
          className="form-control"
          style={{ height: '40px' }}
          aria-label="Filter by Priority"
        >
          <option value="">All Priorities</option>
          <option value="high">High Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="low">Low Priority</option>
        </select>
      </div>

      {/* Sort Options */}
      <div style={{ flex: '0 1 170px' }}>
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className="form-control"
          style={{ height: '40px' }}
          aria-label="Sort Tasks"
        >
          <option value="createdAt_desc">Newest First</option>
          <option value="createdAt_asc">Oldest First</option>
          <option value="dueDate_asc">Due Date (Earliest)</option>
          <option value="dueDate_desc">Due Date (Latest)</option>
          <option value="priority_desc">Priority (High to Low)</option>
        </select>
      </div>

      {/* Clear Filters Button */}
      {isFiltered && (
        <button
          type="button"
          onClick={onClearFilters}
          className="btn btn-secondary"
          style={{ height: '40px', padding: '0 14px' }}
          title="Reset all filters to defaults"
        >
          <RotateCcw size={15} />
          <span>Reset</span>
        </button>
      )}
    </div>
  );
};

export default TaskFilters;
