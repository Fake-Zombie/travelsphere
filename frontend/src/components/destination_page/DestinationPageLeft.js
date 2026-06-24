import React, { useRef, useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { API_URL } from "../../services/api";
function Stars({ rating, interactive = false, onRate }) {
  const [hover, setHover] = React.useState(0);
  
  return (
    <div className="stars">
      {[1, 2, 3, 4, 5].map(s => (
        <span
          key={s}
          className={`star ${s <= (interactive ? (hover || rating) : rating) ? 'filled' : ''} ${interactive ? 'interactive' : ''}`}
          onMouseEnter={() => interactive && setHover(s)}
          onMouseLeave={() => interactive && setHover(0)}
          onClick={() => interactive && onRate && onRate(s)}
        >★</span>
      ))}
    </div>
  );
}

function DestinationPageLeft({
  dest, isFav, toggleFavorite,
  avgRating, totalRatings, userRating, ratingSubmitted, submitRating
}) {
  const navigate = useNavigate();
  const photoInputRef = useRef();
  const [destPhotos, setDestPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

  // Fetch posts tagged with this destination (only if logged in)
  useEffect(() => {
    const fetchDestinationPosts = async () => {
      const token = localStorage.getItem('token');
      if (!dest?._id || !token) {
        setDestPhotos([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/posts/destination/${dest._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const posts = await res.json();
          const images = posts.map(post => ({
            id: post._id,
            src: `${API_URL}/static/post_images/${post.image}`,
            alt: `Post by ${post.author?.username || 'user'}`,
            author: post.author?.username
          }));
          setDestPhotos(images);
        }
      } catch (err) {
        console.error('Failed to fetch destination posts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDestinationPosts();
  }, [dest?._id]);

  // Handle lightbox open
  const openLightbox = (photo) => {
    setLightboxPhoto(photo);
  };

  // Close lightbox
  const closeLightbox = () => {
    setLightboxPhoto(null);
  };

  // Handle escape key and body scroll lock
  useEffect(() => {
    if (lightboxPhoto) {
      document.body.classList.add('lightbox-open');
      const handleEscape = (e) => {
        if (e.key === 'Escape') closeLightbox();
      };
      window.addEventListener('keydown', handleEscape);
      return () => {
        window.removeEventListener('keydown', handleEscape);
        document.body.classList.remove('lightbox-open');
      };
    } else {
      document.body.classList.remove('lightbox-open');
    }
  }, [lightboxPhoto]);

  // Handle adding a new photo (upload post with destination tag)
  const handleAddPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);
    formData.append('text', `Shared at ${dest.name}`);
    formData.append('destinationTag', dest._id);
    formData.append('hashtags', JSON.stringify([]));

    try {
      const res = await fetch(`${API_URL}/api/posts`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });

      if (res.ok) {
        const newPost = await res.json();
        // Add to photo grid immediately
        const newPhoto = {
          id: newPost._id,
          src: `${API_URL}/static/post_images/${newPost.image}`,
          alt: `Post by ${newPost.author?.username || 'you'}`,
          author: newPost.author?.username
        };
        // Check if photo already exists (dedup)
        setDestPhotos(prev => {
          const exists = prev.some(p => p.id === newPhoto.id);
          return exists ? prev : [newPhoto, ...prev];
        });
      } else {
        alert('Failed to upload photo');
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Error uploading photo');
    } finally {
      setUploading(false);
      // Reset input
      if (photoInputRef.current) {
        photoInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="dp-left">

      {/* Main Image */}
      <div className="dp-main-image-wrap">
        <img
          src={{dest.image?.startsWith("http") ? dest.image : {dest.image?.startsWith("http") ? dest.image : `${API_URL}${dest.image}`}}}
          alt={dest.name}
          className="dp-main-img"
          onError={e => e.target.src = '/static/uploads/country_pics/default.jpg'}
        />

        {/* Bottom left — Location + Type */}
        <div className="dp-img-bottom-left">
          <span className="dp-tag-country">📍 {dest.country}</span>
          {dest.type && <span className="dp-tag-type">{dest.type}</span>}
        </div>

        {/* Bottom right — Rating */}
        <div className="dp-img-bottom-right">
          <span className="dp-avg-rating">★ {avgRating > 0 ? avgRating.toFixed(1) : '—'}</span>
          <span className="dp-total-ratings">{totalRatings} ratings</span>
        </div>

        {/* Gradient overlay so text is readable */}
        <div className="dp-img-overlay" />
      </div>

      {/* Info Block */}
      <div className="dp-info-block">
        <div className="dp-info-text">
          <h1 className="dp-title">{dest.name}</h1>
          <div className="dp-rate-row">
            <Stars rating={userRating} interactive onRate={submitRating} />
          </div>
        </div>
        <button
          className={`dp-info-save-btn ${isFav ? 'active' : ''}`}
          onClick={() => toggleFavorite(dest._id)}
        >
          {isFav ? '♥ Saved' : '♡ Save'}
        </button>
      </div>

      {/* Photo Grid - Only visible to logged in users */}
      {localStorage.getItem('token') ? (
        <div className="dp-photo-section">
          <p className="dp-photo-label">Community Photos</p>
          <div className="dp-photo-grid">
            {loading ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                Loading photos...
              </div>
            ) : destPhotos.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                No photos yet. Be the first to share!
              </div>
            ) : (
              destPhotos.map((photo) => (
                <div 
                  key={photo.id} 
                  className="dp-photo-thumb"
                  onClick={() => openLightbox(photo)}
                >
                  <img 
                    src={photo.src} 
                    alt={photo.alt}
                    onError={e => {
                      console.log('Image failed to load:', photo.src);
                      e.target.style.display = 'none';
                    }}
                  />
                  <div className="dp-photo-author">{photo.author}</div>
                </div>
              ))
            )}

            {/* Add Photo Button */}
            <div 
              className={`dp-photo-add ${uploading ? 'uploading' : ''}`}
              onClick={() => !uploading && photoInputRef.current?.click()}
              title="Upload a photo"
            >
              <span>{uploading ? '⏳' : '+'}</span>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAddPhoto}
                disabled={uploading}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="dp-photo-section">
          <p className="dp-photo-label">Community Photos</p>
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p>Log in to see community photos</p>
            <button onClick={() => navigate('/login')} style={{ marginTop: '10px', cursor: 'pointer', padding: '8px 16px', borderRadius: '4px', border: 'none', backgroundColor: 'var(--accent)', color: 'white' }}>
              Log In
            </button>
          </div>
        </div>
      )}

      {/* Lightbox Modal - Portal style */}
      {lightboxPhoto && ReactDOM.createPortal(
        <div 
          className="lightbox-overlay"
          onClick={closeLightbox}
        >
          <div 
            className="lightbox-container"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              className="lightbox-close"
              onClick={closeLightbox}
              title="Close (ESC)"
            >
              ✕
            </button>
            <img 
              src={lightboxPhoto.src} 
              alt={lightboxPhoto.alt}
              className="lightbox-image"
            />
            <div className="lightbox-info">
              <span className="lightbox-author">📸 {lightboxPhoto.author}</span>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}

export default DestinationPageLeft;