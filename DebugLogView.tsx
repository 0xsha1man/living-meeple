import { FC } from 'react';
import { DebugLogViewProps } from './interfaces';

// --- COMPONENT: DebugLogView ---
export const DebugLogView: FC<DebugLogViewProps> = ({ log }) => (
  <div className="debug-log-view">
    <h2><i className="fas fa-bug"></i> Debug Log</h2>
    <p>A real-time log of the generation process behind the scenes.</p>
    <pre>
      {log.map((entry, index) => (
        <span key={index}>
          [{entry.timestamp}]{' '}
          <span dangerouslySetInnerHTML={{ __html: entry.message }} />
          <br />
        </span>
      ))}
    </pre>
  </div>
);
