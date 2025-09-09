import { FC, useEffect, useState } from 'react';
import { StorybookViewProps } from './interfaces';

// --- COMPONENT: StorybookView ---
export const StorybookView: FC<StorybookViewProps> = ({ story, onImageClick }) => {
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    setPageIndex(0);
  }, [story]);

  if (!story) return <div className="detail-card"><p>Your story will appear here once it's created!</p></div>;

  const { plan, frames } = story;
  const currentPageData = plan.storyboard[pageIndex];
  const currentPageImages = frames[pageIndex];
  const finalImageForPage = currentPageImages?.[currentPageImages.length - 1];

  return (
    <div className="storybook-view">
      <div className="storybook-main-content">
        <div className="storybook-image-panel card" onClick={() => finalImageForPage && onImageClick(finalImageForPage.url)}>
          {finalImageForPage ? (
            <img src={finalImageForPage.url} alt={currentPageData.description} />
          ) : (
            <div className="image-placeholder">Page content is being generated...</div>
          )}
        </div>
        <div className="storybook-details-panel">
          <div className="detail-card story-text">
            <p>{currentPageData.description}</p>
          </div>
          <div className="detail-card admin-view">
            <h4><i className="fas fa-quote-left"></i> Source Text</h4>
            <blockquote>"{currentPageData.source_text}"</blockquote>
          </div>
        </div>
      </div>
      <div className="storybook-controls">
        <button onClick={() => setPageIndex(p => Math.max(0, p - 1))} disabled={pageIndex === 0}>
          <i className="fas fa-chevron-left"></i> Previous Page
        </button>
        <span>Page {pageIndex + 1} of {plan.storyboard.length}</span>
        <button onClick={() => setPageIndex(p => Math.min(plan.storyboard.length - 1, p + 1))} disabled={pageIndex === plan.storyboard.length - 1}>
          Next Page <i className="fas fa-chevron-right"></i>
        </button>
      </div>
    </div>
  );
};
