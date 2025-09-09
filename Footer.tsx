import { FC } from 'react';

export const Footer: FC = () => {
  return (
    <footer className="footer">
      <div className="footer-links">
        <a href="https://www.kaggle.com/competitions/banana/writeups/living-meeple#3283984" target="_blank" rel="noopener noreferrer">Kaggle Write-up</a>
        <a href="https://www.youtube.com/watch?v=9HNK1-bh2zY" target="_blank" rel="noopener noreferrer">YouTube Demo</a>
        <a href="https://www.kaggle.com/competitions/banana" target="_blank" rel="noopener noreferrer">Nano-Banana Competition</a>
      </div>
      <p><strong>Acknowledgements:</strong> Google AI, Gemini, and ElevenLabs.</p>
    </footer>
  );
};