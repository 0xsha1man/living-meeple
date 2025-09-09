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
      <h1 className="main-title">Living Meeple</h1>
      <p className="tagline">Turn dense history into delightful, meeple-sized stories.</p>
      <div className="panels-container">
        <div className="left-panel">
          <form className="form-container" onSubmit={handleSubmit}>
            <textarea
              name="historyText"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Meeples eagerly wait to re-enact history for you! Paste a story here..."
              aria-label="Paste the story of a battle here"
              required
            />
            <div className="form-actions">
              <button type="button" onClick={handleInsertExample} className="example-link">
                <i className="fas fa-file-alt"></i> Insert Example from OpenStax
              </button>
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
          <div className="mascot-container">
            <img src="images/mascot.png" alt="A friendly historian meeple reading a book" />
          </div>
        </div>
      </div>
      <footer className="footer">
        <p>A Hackathon Project for Kaggle's <a href="https://www.kaggle.com/competitions/banana" target="_blank" rel="noopener noreferrer">Nano-Banana Competition</a></p>
        <p><strong>Acknowledgements:</strong> Google AI, Gemini, and ElevenLabs.</p>
      </footer>
    </div>
  );
};