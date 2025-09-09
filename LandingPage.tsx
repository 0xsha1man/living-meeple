import React, { FC, useState } from 'react';
import { BATTLE_PLACEHOLDER } from './data/battle_placeholder';
import { LandingPageProps } from './interfaces';

export const LandingPage: FC<LandingPageProps> = ({ onStoryCreate, isLoading }) => {
  const [inputText, setInputText] = useState('');

  const handleInsertExample = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setInputText(BATTLE_PLACEHOLDER);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onStoryCreate(inputText);
  };

  return (
    <div className="landing-container">
      <div className="mascot-container">
        <img src="images/mascot.png" alt="A friendly historian meeple reading a book" />
      </div>
      <div className="app-header">
        <img src="images/living_meeple_header.png" alt="Living Meeple" />
      </div>
      <p className="tagline">Turn dense history into delightful, meeple-sized stories.</p>
      <div className="panels-container">
        <div className="left-panel">
          <h2><i className="fas fa-book-open"></i> Battle From A Textbook</h2>
          <p>Take a paragraph or two from a textbook describing a historical battle and let Elder Meeple explain it in the meeple way. Meeples eagerly wait to re-enact history for you!</p>
          <form className="form-container" onSubmit={handleSubmit}>
            <textarea
              name="historyText"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste a battle from a textbook here..."
              aria-label="Paste the story of a battle here"
              required
            />
            <div className="form-actions">
              <div className="example-action">
                <button type="button" onClick={handleInsertExample} className="example-link">
                  <i className="fas fa-file-alt"></i> Insert Example
                </button>
                <a
                  href="https://openstax.org/books/us-history/pages/15-3-1863-the-changing-nature-of-the-war"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="source-link"
                  title="Example text from OpenStax U.S. History, Chapter 15.3"
                >
                  from OpenStax
                </a>
              </div>
              <button type="submit" disabled={!inputText.trim() || isLoading} className="create-story-button">
                {isLoading ? 'Creating...' : 'Create Story'} <i className="fas fa-arrow-right"></i>
              </button>
            </div>
          </form>
        </div>
        <div className="right-panel">
          <div className="instructions card">
            <h2><i className="fas fa-book-open"></i> How It Works</h2>
            <ol>
              <li><strong>Paste History:</strong> Drop in text describing a historical event.</li>
              <li><strong>Create Story:</strong> Let the AI plan and generate a visual storybook.</li>
              <li><strong>Explore:</strong> Watch history unfold, page by page!</li>
            </ol>
          </div>
          <div className="detail-card" style={{ marginTop: '1.5rem' }}>
            <h4><i className="fas fa-stopwatch"></i> A Note on Speed</h4>
            <p>
              This demo uses the free tier of Google's Gemini API, which has rate limits. To respect these limits, a delay is added between each generation step. As a result, creating a full story may take several minutes. Thanks for your patience!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};