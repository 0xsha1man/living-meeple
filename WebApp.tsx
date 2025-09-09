import { FC, MouseEvent, useEffect, useState } from 'react';
import { DebugLogView } from './DebugLogView';
import { ImageGalleryView } from './ImageGalleryView';
import { WebAppProps } from './interfaces';
import { StorybookView } from './StorybookView';

export const WebApp: FC<WebAppProps> = ({ story, log, onRestart, onSelectStory, isLoading, realTimeAssets, realTimeFrames, generationMode, progress, progressText }) => {
  const [activeTab, setActiveTab] = useState<'storybook' | 'gallery' | 'debug'>('storybook');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const assets = story?.assets ?? realTimeAssets;
  const frames = story?.frames ?? realTimeFrames;

  useEffect(() => {
    if (isLoading) {
      setActiveTab('debug');
    } else if (story) {
      // When the story is finished, it's often best to show the final product first.
      // The user can then navigate to the gallery or debug log if they are curious.
      setActiveTab('storybook');
    } else {
      // If loading is finished but there's no story (e.g. an error occurred),
      // stay on the debug tab.
      setActiveTab('debug');
    }
  }, [isLoading, story]);

  const handleCloseLightbox = (e: MouseEvent<HTMLElement>) => {
    // Close if the overlay or the close button itself is clicked, but not the image
    if (e.target === e.currentTarget) {
      setSelectedImage(null);
    }
  };

  const Lightbox = () => {
    if (!selectedImage) return null;
    return (
      <div className="lightbox-overlay" onClick={handleCloseLightbox}>
        <img src={selectedImage} alt="Full size view" className="lightbox-image" />
        <button className="lightbox-close" onClick={() => setSelectedImage(null)}>&times;</button>
      </div>
    );
  };

  return (
    <div className="webapp-container">
      <div className="webapp-header">
        <img src="images/living_meeple_header.png" alt="Living Meeple Logo" />
      </div>
      <nav className="webapp-nav">
        <button onClick={() => setActiveTab('storybook')} className={activeTab === 'storybook' ? 'active' : ''}><i className="fas fa-book-reader"></i> Storybook</button>
        <button onClick={() => setActiveTab('gallery')} className={activeTab === 'gallery' ? 'active' : ''}><i className="fas fa-images"></i> Image Gallery</button>
        {/* <button onClick={() => setActiveTab('collection')} className={activeTab === 'collection' ? 'active' : ''}><i className="fas fa-archive"></i> My Stories</button> */}
        <button onClick={() => setActiveTab('debug')} className={activeTab === 'debug' ? 'active' : ''}><i className="fas fa-terminal"></i> Debug Log</button>
        <button onClick={onRestart} className="start-over-button"><i className="fas fa-undo"></i> Start Over</button>
      </nav>
      <main className="webapp-content">
        {activeTab === 'storybook' && <StorybookView story={story} onImageClick={setSelectedImage} />}
        {activeTab === 'gallery' && <ImageGalleryView assets={assets} frames={frames} onImageClick={setSelectedImage} />}
        {/* {activeTab === 'collection' && <StoryCollectionView onSelectStory={onSelectStory} />} */}
        {activeTab === 'debug' && <>
          {generationMode !== 'full' && (
            <div className="detail-card debug-note-card">
              <h4><i className="fas fa-cogs"></i> Debug Mode Active</h4>
              <p>
                Generation is currently set to <strong>{generationMode}</strong> mode. The process will stop early.
              </p>
            </div>
          )}
          {isLoading && (
            <div className="detail-card progress-card">
              <h4><i className="fas fa-spinner fa-spin"></i> Generation Progress</h4>
              <div className="progress-bar-container">
                <div className="progress-bar" style={{ width: `${progress * 100}%` }}>
                  {progress > 0 && `${Math.round(progress * 100)}%`}
                </div>
              </div>
              <p className="progress-text">{progressText || 'Starting...'}</p>
            </div>
          )}
          <div className="detail-card debug-note-card">
            <h4><i className="fas fa-stopwatch"></i> A Note on Generation Speed</h4>
            <p>
              This project runs on the free tier of Google's Gemini API, which has rate limits (e.g., 10 requests per minute for the image model). To avoid exceeding these limits, a deliberate delay has been engineered between each step of the generation process. This is why the story takes a few minutes to create. Thank you for your patience!
            </p>
          </div>
          <DebugLogView log={log} />
        </>}
      </main>
      <Lightbox />
    </div>
  );
};