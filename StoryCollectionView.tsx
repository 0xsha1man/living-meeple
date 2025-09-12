import { FC, MouseEvent, useEffect, useState } from 'react';
import { deleteStory, getStoryCollection } from './api';
import { StoredStory } from './interfaces';

interface StoryCollectionViewProps {
  onSelectStory: (story: StoredStory) => void;
}

export const StoryCollectionView: FC<StoryCollectionViewProps> = ({ onSelectStory }) => {
  const [stories, setStories] = useState<StoredStory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStories = async () => {
    try {
      setLoading(true);
      const collection = await getStoryCollection();
      setStories(collection);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStories();
  }, []);

  const handleDelete = async (e: MouseEvent<HTMLButtonElement>, storyId: string) => {
    e.stopPropagation(); // Prevent the card's onClick from firing
    if (window.confirm('Are you sure you want to delete this story? This cannot be undone.')) {
      try {
        await deleteStory(storyId);
        // Refresh the list after deletion
        fetchStories();
      } catch (err: any) {
        setError(`Failed to delete story: ${err.message}`);
      }
    }
  };

  if (loading) {
    return <div className="detail-card">Loading story collection...</div>;
  }

  if (error) {
    return <div className="detail-card error-card">Error loading stories: {error}</div>;
  }

  if (stories.length === 0) {
    return <div className="detail-card">No cached stories found. Generate a new story to see it here!</div>;
  }

  return (
    <div className="story-collection-container">
      {stories.map(story => (
        <div key={story.id} className="detail-card story-collection-item">
          <div className="story-collection-item-content" onClick={() => onSelectStory(story)}>
            <h4>{story.name}</h4>
            <p>Created from: "{story.plan.battle_identification.source_text}"</p>
          </div>
          <button className="delete-story-button" onClick={(e) => handleDelete(e, story.id)} title="Delete Story"><i className="fas fa-trash-alt"></i></button>
        </div>
      ))}
    </div>
  );
};