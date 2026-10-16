import React from 'react';
import { Calendar, CheckCircle2, Circle, Edit3, Trash2, AlertCircle } from 'lucide-react';
import { formatDate, isOverdue } from '../utils/dateUtils';

const TaskCard = ({ task, onToggleStatus, onEdit, onDelete }) => {
  const isCompleted = task.status === 'completed';
  const hasDueDate = Boolean(task.dueDate);
  const overdue = isOverdue(task.dueDate, task.status);

  return (
    <div className={`task-card ${isCompleted ? 'is-completed' : ''}`}>
      <div>
        <div className="task-card-header">
          <button
            onClick={() => onToggleStatus(task)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              textAlign: 'left',
              flex: 1,
            }}
            aria-label={isCompleted ? 'Mark as pending' : 'Mark as completed'}
          >
            {isCompleted ? (
              <CheckCircle2 size={20} color="#059669" style={{ flexShrink: 0 }} />
            ) : (
              <Circle size={20} color="#94a3b8" style={{ flexShrink: 0 }} />
            )}
            <h4 className="task-title">{task.title}</h4>
          </button>

          <span className={`badge badge-${task.priority}`}>{task.priority}</span>
        </div>

        {task.description && <p className="task-desc">{task.description}</p>}
      </div>

      <div className="task-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {hasDueDate ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '12px',
                color: overdue ? '#dc2626' : '#64748b',
                fontWeight: overdue ? 600 : 500,
              }}
              title={overdue ? 'This task is overdue!' : 'Due Date'}
            >
              {overdue ? <AlertCircle size={14} /> : <Calendar size={14} />}
              <span>{formatDate(task.dueDate)}</span>
            </div>
          ) : (
            <span className="text-xs text-muted">No due date</span>
          )}
        </div>

        <div className="task-actions">
          <button
            className="btn-icon"
            onClick={() => onEdit(task)}
            title="Edit task"
            aria-label="Edit task"
          >
            <Edit3 size={16} />
          </button>
          <button
            className="btn-icon danger"
            onClick={() => onDelete(task)}
            title="Delete task"
            aria-label="Delete task"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
