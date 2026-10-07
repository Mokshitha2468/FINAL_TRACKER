import React from 'react';

export default function TopicCard({
  topicData,
  isSelected,
  selectedDifficulty,
  onSelectTopicDifficulty,
}) {
  const { topic, total, solved, difficulties } = topicData;
  const pct = total > 0 ? Math.round((solved / total) * 100) : 0;

  const easy = difficulties?.Easy || { total: 0, solved: 0 };
  const medium = difficulties?.Medium || { total: 0, solved: 0 };
  const hard = difficulties?.Hard || { total: 0, solved: 0 };

  return (
    <div className={`topic-card ${isSelected ? 'active' : ''}`}>
      <div
        className="topic-card-header"
        onClick={() => onSelectTopicDifficulty(topic, selectedDifficulty || 'Easy')}
      >
        <span className="topic-card-title">{topic}</span>
        <span className="topic-card-counts">
          {solved} / {total}
        </span>
      </div>

      <div className="progress-bar-bg" style={{ marginBottom: '0.75rem' }}>
        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="topic-pills">
        <button
          type="button"
          className={`diff-pill diff-pill-easy ${
            isSelected && selectedDifficulty === 'Easy' ? 'selected' : ''
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onSelectTopicDifficulty(topic, 'Easy');
          }}
        >
          <span>Easy</span>
          <span>{easy.solved}/{easy.total}</span>
        </button>

        <button
          type="button"
          className={`diff-pill diff-pill-medium ${
            isSelected && selectedDifficulty === 'Medium' ? 'selected' : ''
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onSelectTopicDifficulty(topic, 'Medium');
          }}
        >
          <span>Medium</span>
          <span>{medium.solved}/{medium.total}</span>
        </button>

        <button
          type="button"
          className={`diff-pill diff-pill-hard ${
            isSelected && selectedDifficulty === 'Hard' ? 'selected' : ''
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onSelectTopicDifficulty(topic, 'Hard');
          }}
        >
          <span>Hard</span>
          <span>{hard.solved}/{hard.total}</span>
        </button>
      </div>
    </div>
  );
}
