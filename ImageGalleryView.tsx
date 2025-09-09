import { FC } from 'react';
import { ImageGalleryViewProps } from './interfaces';

// --- COMPONENT: ImageGalleryView ---
export const ImageGalleryView: FC<ImageGalleryViewProps> = ({ assets, frames, onImageClick }) => {
  if (Object.keys(assets).length === 0 && frames.length === 0) {
    return <div className="detail-card"><p>Your image gallery will appear here as images are generated.</p></div>;
  }
  const allImages = [
    ...Object.values(assets),
    ...frames.flat()
  ];

  return (
    <div className="image-gallery-view">
      <h2><i className="fas fa-images"></i> Generation Gallery</h2>
      <p>See every step of the image creation process, from base assets to final compositions.</p>
      <div className="gallery">
        {allImages.map((asset) => (
          <figure key={asset.url} onClick={() => onImageClick(asset.url)}>
            <img src={asset.url} alt={asset.caption} />
            <figcaption>{asset.caption}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
};
