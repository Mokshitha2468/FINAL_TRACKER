import React from 'react';
import { ExternalLink, BookOpen, Video } from 'lucide-react';

export default function ProblemRow({ problem, onToggle }) {
  const {
    position,
    title,
    difficulty,
    subtopic,
    platform,
    url,
    article_url,
    video_url,
    companies_count,
    is_solved,
  } = problem;

  return (
    <div className={`problem-row ${is_solved ? 'solved' : ''}`}>
      <div className="problem-main">
        <input
          type="checkbox"
          className="checkbox-custom"
          checked={is_solved}
          onChange={() => onToggle(position)}
          title={is_solved ? 'Mark unsolved' : 'Mark solved'}
        />

        <span className="problem-pos">#{position}</span>

        <span className="problem-title">{title}</span>

        {subtopic && <span className="subtopic-badge">{subtopic}</span>}

        {platform && <span className="platform-badge">{platform}</span>}

        {companies_count && (
          <span className="companies-badge" title="Companies asking this question">
            {companies_count} cos
          </span>
        )}
      </div>

      <div className="problem-links">
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="link-icon-btn"
            title="Open Practice Problem"
          >
            <ExternalLink size={13} />
            <span>Practice</span>
          </a>
        )}

        {article_url && (
          <a
            href={article_url}
            target="_blank"
            rel="noopener noreferrer"
            className="link-icon-btn"
            title="Read Solution Article"
          >
            <BookOpen size={13} />
            <span>Article</span>
          </a>
        )}

        {video_url && (
          <a
            href={video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="link-icon-btn"
            title="Watch Striver Video"
          >
            <Video size={13} />
            <span>Video</span>
          </a>
        )}
      </div>
    </div>
  );
}
