import React from 'react';
import { Search, Filter } from 'lucide-react';

export default function FilterBar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  subtopic,
  onSubtopicChange,
  availableSubtopics = [],
}) {
  return (
    <div className="filter-bar">
      <div style={{ position: 'relative', flex: '1', minWidth: '220px' }}>
        <input
          type="text"
          className="input-field"
          style={{ width: '100%', paddingLeft: '2rem' }}
          placeholder="Search by title or concept..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <Search
          size={14}
          style={{
            position: 'absolute',
            left: '0.65rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
          }}
        />
      </div>

      <select
        className="select-field"
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
      >
        <option value="">All Statuses</option>
        <option value="unsolved">Unsolved Only</option>
        <option value="solved">Solved Only</option>
      </select>

      {availableSubtopics.length > 0 && (
        <select
          className="select-field"
          value={subtopic}
          onChange={(e) => onSubtopicChange(e.target.value)}
        >
          <option value="">All Subtopics ({availableSubtopics.length})</option>
          {availableSubtopics.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
      )}

      {(search || status || subtopic) && (
        <button
          className="btn btn-outline btn-sm"
          onClick={() => {
            onSearchChange('');
            onStatusChange('');
            onSubtopicChange('');
          }}
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}
