import { FC, useEffect, useState } from 'react';
import { DebugLogView } from './DebugLogView';
import { ImageGalleryView } from './ImageGalleryView';
import { WebAppProps } from './interfaces';
import { StorybookView } from './StorybookView';

export const WebApp: FC<WebAppProps> = ({ story, log, onRestart, onSelectStory, isLoading, realTimeAssets, realTimeFrames }) => {
  const [activeTab, setActiveTab] = useState('storybook');

  useEffect(() => {
    if (isLoading) {
      setActiveTab('debug');
    } else if (story) {
      setActiveTab('gallery'); // Default to gallery to see the base assets
    }
  }, [isLoading, story]);

  return (
    <div className="webapp-container">
      <nav className="webapp-nav">
        <button onClick={() => setActiveTab('storybook')} className={activeTab === 'storybook' ? 'active' : ''}><i className="fas fa-book-reader"></i> Storybook</button>
        <button onClick={() => setActiveTab('gallery')} className={activeTab === 'gallery' ? 'active' : ''}><i className="fas fa-images"></i> Image Gallery</button>
        {/* <button onClick={() => setActiveTab('collection')} className={activeTab === 'collection' ? 'active' : ''}><i className="fas fa-archive"></i> My Stories</button> */}
        <button onClick={() => setActiveTab('debug')} className={activeTab === 'debug' ? 'active' : ''}><i className="fas fa-terminal"></i> Debug Log</button>
        <button onClick={onRestart} className="start-over-button"><i className="fas fa-undo"></i> Start Over</button>
      </nav>
      <main className="webapp-content">
        {activeTab === 'storybook' && <StorybookView story={story} />}
        {activeTab === 'gallery' && <ImageGalleryView assets={realTimeAssets} frames={realTimeFrames} />}
        {/* {activeTab === 'collection' && <StoryCollectionView onSelectStory={onSelectStory} />} */}
        {activeTab === 'debug' && <DebugLogView log={log} />}
      </main>
    </div>
  );
};