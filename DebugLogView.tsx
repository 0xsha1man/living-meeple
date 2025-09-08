import { FC } from 'react';
import { DebugLogViewProps } from './interfaces';

// --- COMPONENT: StoryCollectionView ---
// const StoryCollectionView: FC<StoryCollectionViewProps> = ({ onSelectStory }) => {
//   const [stories, setStories] = useState<StoredStory[]>([]);
//   useEffect(() => {
//     try {
//       const stored = localStorage.getItem('livingMeepleStories');
//       if (stored) {
//         setStories(JSON.parse(stored));
//       }
//     } catch (e) {
//       console.error("Could not parse stories from localStorage", e);
//     }
//   }, []);
//   return (
//     <div className="story-collection-view">
//       <h2><i className="fas fa-book"></i> My Story Collection</h2>
//       <p>Revisit the historical stories you've created.</p>
//       <div className="story-list">
//         {stories.length > 0 ? stories.map(story => (
//           <div className="story-card" key={story.id} onClick={() => onSelectStory(story)}>
//             <h3>{story.name}</h3>
//           </div>
//         )) : <p>You haven't created any stories yet. Come back after you've made one!</p>}
//       </div>
//     </div>
//   );
// };
// --- COMPONENT: DebugLogView ---
export const DebugLogView: FC<DebugLogViewProps> = ({ log }) => (
  <div className="debug-log-view">
    <h2><i className="fas fa-bug"></i> Debug Log</h2>
    <p>A real-time log of the generation process behind the scenes.</p>
    <pre>
      {log.map((entry, index) => <span key={index}>[{entry.timestamp}] {entry.message}<br /></span>)}
    </pre>
  </div>
);
