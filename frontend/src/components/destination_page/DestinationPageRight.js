import { getProfilePicUrl } from '../../utils/profilePicUrl';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../modal/Modal';
import BookingModal from './BookingModal';
import { API_URL } from "../../services/api";

// ── Avatar ──────────────────────────────────────────────────────────
function Avatar({ user, size = 'md', onClick }) {
  const letter = user?.username?.charAt(0).toUpperCase() || 'U';
  const sizePx = size === 'sm' ? 28 : 36;

  if (user?.profile_pic) {
    return (
      <img
        src={getProfilePicUrl(user.profile_pic)}
        alt={user.username}
        onClick={onClick}
        style={{
          width: sizePx,
          height: sizePx,
          borderRadius: '50%',
          objectFit: 'cover',
          border: '1px solid rgba(200,169,110,0.3)',
          cursor: onClick ? 'pointer' : 'default',
          flexShrink: 0,
          display: 'block',
        }}
      />
    );
  }

  return (
    <div
      className={`review-avatar${size === 'sm' ? ' sm' : ''}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {letter}
    </div>
  );
}

// ── ReviewCard ──────────────────────────────────────────────────────
function ReviewCard({ review, currentUser, onLike, onReply, onLikeReply, onDeleteReview, onDeleteReply }) {
  const navigate = useNavigate();
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionUsers, setMentionUsers] = useState([]);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);

  const myId = currentUser?._id;
  const isLiked = review.likes?.some(id => id === myId || id?._id === myId);
  const canDeleteReview = currentUser && (
    review.user?._id === myId || currentUser.role === 'admin'
  );

  const goToProfile = (userId) => {
  if (!userId) return;
  if (currentUser?._id === userId) {
    navigate('/profile');
  } else {
    navigate(`/user/${userId}`);
  }
};

  const submitReply = () => {
    if (!replyText.trim()) return;
    onReply(review._id, replyText);
    setReplyText('');
    setShowReplyBox(false);
    setShowReplies(true);
  };

  const renderTextWithMentions = (text) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const username = part.slice(1);
        return (
          <span
            key={i}
            className="mention-tag"
            onClick={async () => {
              const res = await fetch(`/api/auth/user/username/${username}`);
              const data = await res.json();
              if (data._id) navigate(`/user/${data._id}`);
            }}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="review-card">

      {/* Header */}
      <div className="review-header">
        <Avatar
          user={review.user}
          size="md"
          onClick={() => goToProfile(review.user?._id)}
        />
        <div className="reviewer-info">
          <span
            className="reviewer-name"
            onClick={() => goToProfile(review.user?._id)}
            style={{ cursor: 'pointer' }}
            title={review.user?.email}
          >
            {review.user?.username || 'Anonymous'}
          </span>
          <span className="review-date">
            {new Date(review.createdAt).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric'
            })}
          </span>
        </div>
      </div>

      <div className="review-body-wrap">
        <p className="review-text">{renderTextWithMentions(review.text)}</p>

        {/* Actions */}
        <div className="review-actions">
          <button
            className={`like-btn ${isLiked ? 'liked' : ''}`}
            onClick={() => onLike(review._id)}
          >
            {isLiked ? '♥' : '♡'} {review.likes?.length || 0}
          </button>
          <button className="reply-btn" onClick={() => setShowReplyBox(!showReplyBox)}>
            ↩ Reply
          </button>
          {review.replies?.length > 0 && (
            <button className="reply-btn" onClick={() => setShowReplies(!showReplies)}>
              {showReplies
                ? '▲ Hide'
                : `▼ ${review.replies.length} ${review.replies.length === 1 ? 'reply' : 'replies'}`}
            </button>
          )}
          {canDeleteReview && (
            <button className="delete-btn" onClick={() => setConfirmDelete({ type: 'review' })}>Delete</button>
          )}
        </div>

        {/* Replies */}
        {showReplies && review.replies?.length > 0 && (
          <div className="replies-thread">
            {review.replies.map(r => {
              const replyLiked = r.likes?.some(id => id === myId || id?._id === myId);
              const canDeleteReply = currentUser && (
                r.user?._id === myId || currentUser.role === 'admin'
              );
              return (
                <div key={r._id} className="reply-item">
                  <Avatar
                    user={r.user}
                    size="sm"
                    onClick={() => goToProfile(r.user?._id)}
                  />
                  <div className="reply-body">
                    <div className="review-meta-row">
                      <span
                        className="reviewer-name"
                        onClick={() => goToProfile(r.user?._id)}
                        style={{ cursor: 'pointer' }}
                        title={r.user?.email}
                      >
                        {r.user?.username || 'Anonymous'}
                      </span>
                      <span className="review-date">
                        {new Date(r.createdAt).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric'
                        })}
                      </span>
                    </div>
                    <p className="review-text">{renderTextWithMentions(r.text)}</p>
                    <div className="review-actions">
                      <button
                        className={`like-btn ${replyLiked ? 'liked' : ''}`}
                        onClick={() => onLikeReply(review._id, r._id)}
                      >
                        {replyLiked ? '♥' : '♡'} {r.likes?.length || 0}
                      </button>
                      <button
                        className="reply-btn"
                        onClick={() => {
                          setReplyText(`@${r.user?.username} `);
                          setShowReplyBox(true);
                          setShowReplies(true);
                        }}
                      >
                        Reply
                      </button>
                      {canDeleteReply && (
                        <button className="delete-btn" onClick={() => setConfirmDelete({ type: 'reply', replyId: r._id })}>Delete</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Reply input */}
        {showReplyBox && (
          <div className="reply-input-row">
            <Avatar user={currentUser} size="sm" />
            <div className="reply-input-wrap">
              <textarea
                placeholder="Write a reply... use @ to mention a friend"
                value={replyText}
                onChange={e => {
                  const val = e.target.value;
                  setReplyText(val);

                  const match = val.match(/@(\w*)$/);
                  if (match) {
                    const q = match[1];
                    setMentionQuery(q);
                    setShowMentionDropdown(true);
                    if (q.length > 0) {
                      fetch(`/api/auth/search?q=${q}`)
                        .then(r => r.json())
                        .then(setMentionUsers);
                    } else {
                      setMentionUsers([]);
                    }
                  } else {
                    setShowMentionDropdown(false);
                    setMentionUsers([]);
                  }
                }}
                className="reply-textarea"
                rows={2}
              />

              {/* Reply mention dropdown */}
              {showMentionDropdown && mentionUsers.length > 0 && (
                <div className="mention-dropdown">
                  {mentionUsers.map(u => (
                    <div
                      key={u._id}
                      className="mention-option"
                      onMouseDown={e => {
                        e.preventDefault();
                        const replaced = replyText.replace(/@(\w*)$/, `@${u.username} `);
                        setReplyText(replaced);
                        setShowMentionDropdown(false);
                        setMentionUsers([]);
                      }}
                    >
                      {u.profile_pic
                        ? <img src={getProfilePicUrl(u.profile_pic)} alt="" style={{ width: 22, height: 22, borderRadius: '50%', marginRight: 6 }} />
                        : <span style={{ marginRight: 6 }}>👤</span>
                      }
                      @{u.username}
                    </div>
                  ))}
                </div>
              )}

              <div className="reply-submit-row">
                <button className="submit-reply-btn" onClick={submitReply}>Post</button>
                <button className="cancel-btn" onClick={() => setShowReplyBox(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
      <Modal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title={`Delete ${confirmDelete?.type === 'reply' ? 'Reply' : 'Review'}`}
        type="danger"
        confirmText="Delete"
        onConfirm={() => {
          if (confirmDelete?.type === 'review') onDeleteReview(review._id);
          if (confirmDelete?.type === 'reply') onDeleteReply(review._id, confirmDelete.replyId);
          setConfirmDelete(null);
        }}
      >
        <p>Are you sure you want to delete this {confirmDelete?.type}? This cannot be undone.</p>
      </Modal>
    </div>
  );
}

const WEATHER_API_KEY = '749642f1500dfcf9d3a5c892a63d7fe8';



// ── WeatherCard ────────────────────────────────────────
function WeatherCard({ name, country }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!name || !country) return;
    setLoading(true);
    setError(false);
    fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(name)},${encodeURIComponent(country)}&appid=${WEATHER_API_KEY}&units=metric`
    )
      .then(r => r.json())
      .then(data => {
        if (data.cod !== 200) throw new Error();
        setWeather(data);
        setLoading(false);
      })
      .catch(() => {
        fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(country)}&appid=${WEATHER_API_KEY}&units=metric`
        )
          .then(r => r.json())
          .then(data => {
            if (data.cod !== 200) throw new Error();
            setWeather(data);
            setLoading(false);
          })
          .catch(() => { setError(true); setLoading(false); });
      });
  }, [name, country]);

  const iconUrl = weather?.weather?.[0]?.icon
    ? `https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`
    : null;

  return (
    <div className="dp-glass-card dp-weather-card">
      <p className="dp-overview-label">Current Weather</p>
      {loading && <p className="dp-overview-muted">Fetching weather...</p>}
      {error && <p className="dp-overview-muted">Weather unavailable for this destination.</p>}
      {weather && !loading && (
        <div className="dp-weather-body">
          <div className="dp-weather-main">
            {iconUrl && <img src={iconUrl} alt="weather icon" className="dp-weather-icon" />}
            <div className="dp-weather-temp-wrap">
              <span className="dp-weather-temp">{Math.round(weather.main.temp)}°C</span>
              <span className="dp-weather-desc">{weather.weather[0].description}</span>
            </div>
          </div>
          <div className="dp-weather-divider" />
          <div className="dp-weather-meta">
            <div className="dp-weather-meta-item">
              <span className="dp-weather-meta-val">{weather.main.humidity}%</span>
              <span className="dp-weather-meta-label">Humidity</span>
            </div>
            <div className="dp-weather-meta-item">
              <span className="dp-weather-meta-val">{Math.round(weather.wind.speed)} m/s</span>
              <span className="dp-weather-meta-label">Wind</span>
            </div>
            <div className="dp-weather-meta-item">
              <span className="dp-weather-meta-val">{Math.round(weather.main.feels_like)}°C</span>
              <span className="dp-weather-meta-label">Feels Like</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── DestinationPageRight ────────────────────────────────────────────
function DestinationPageRight({
  dest, reviews, reviewsLoading, currentUser,
  submitReview, handleLike, handleReply, handleLikeReply,
  handleDeleteReview, handleDeleteReply,
  avgRating, totalRatings, guides = []
}) {
  const [activeTab, setActiveTab] = useState('reviews');
  const [reviewText, setReviewText] = useState('');
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionUsers, setMentionUsers] = useState([]);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const navigate = useNavigate();

  const [bookingModal, setBookingModal] = useState({
  isOpen: false,
  guideId: null,
  guideName: ''
});
  const handleSubmit = () => {
    if (!reviewText.trim()) return;
    submitReview(reviewText);
    setReviewText('');
  };

  const tabs = ['reviews', 'overview', 'tips'];

  return (
    <div className="dp-right">
      <div className="dp-tabs-bar">
        {tabs.map(tab => (
          <button
            key={tab}
            className={`dp-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="dp-tab-content">

        {activeTab === 'reviews' && (
          <div className="dp-section">
            <div className="dp-write-review-row">
              <Avatar user={currentUser} size="md" />
              <div className="dp-write-review-input-wrap">
                <textarea
                  className="dp-review-textarea"
                  placeholder="Share your experience...try using @ to mention"
                  value={reviewText}
                  onChange={e => {
                    const val = e.target.value;
                    setReviewText(val);
                    const match = val.match(/@(\w*)$/);
                    if (match) {
                      const q = match[1];
                      setShowMentionDropdown(true);
                      if (q.length > 0) {
                        fetch(`/api/auth/search?q=${q}`)
                          .then(r => r.json())
                          .then(setMentionUsers);
                      } else {
                        setMentionUsers([]);
                      }
                    } else {
                      setShowMentionDropdown(false);
                      setMentionUsers([]);
                    }
                  }}
                  rows={3}
                />
                {showMentionDropdown && mentionUsers.length > 0 && (
                  <div className="mention-dropdown">
                    {mentionUsers.map(u => (
                      <div
                        key={u._id}
                        className="mention-option"
                        onMouseDown={e => {
                          e.preventDefault();
                          const replaced = reviewText.replace(/@(\w*)$/, `@${u.username} `);
                          setReviewText(replaced);
                          setShowMentionDropdown(false);
                          setMentionUsers([]);
                        }}
                      >
                        {u.profile_pic
                          ? <img src={getProfilePicUrl(u.profile_pic)} alt="" style={{ width: 22, height: 22, borderRadius: '50%' }} />
                          : <span>👤</span>
                        }
                        @{u.username}
                      </div>
                    ))}
                  </div>
                )}
                <button
                  className={`dp-submit-btn ${!reviewText.trim() ? 'disabled' : ''}`}
                  onClick={handleSubmit}
                >
                  Post
                </button>
              </div>
            </div>

            <div className="dp-reviews-header">
              <p className="dp-card-label" style={{ margin: 0 }}>Community Reviews</p>
              <span className="dp-reviews-count">{reviews.length} total</span>
            </div>

            {reviewsLoading ? (
              <p className="dp-reviews-empty">Loading...</p>
            ) : reviews.length === 0 ? (
              <p className="dp-reviews-empty">No reviews yet. Be the first!</p>
            ) : (
              <div className="dp-reviews-list">
                {reviews.map(r => (
                  <ReviewCard
                    key={r._id}
                    review={r}
                    currentUser={currentUser}
                    onLike={handleLike}
                    onReply={handleReply}
                    onLikeReply={handleLikeReply}
                    onDeleteReview={handleDeleteReview}
                    onDeleteReply={handleDeleteReply}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* // ── Overview tab JSX ───────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="dp-section">

            <div className="dp-overview-grid">
              {/* Left Column */}
              <div className="dp-overview-col-left">

                {/* About */}
                <div className="dp-glass-card dp-about-card">
                  <p className="dp-overview-label">About</p>
                  <p className="dp-desc-text">{dest.description}</p>
                </div>

                {/* Guides */}
                <div className="dp-glass-card dp-guides-card">
                  <p className="dp-overview-label">Guides</p>
                  <div className="dp-guides-count">
                    <span className="dp-guides-num">{guides.length}</span>
                    <span className="dp-guides-label">guides available</span>
                  </div>
                  {guides.length === 0 ? (
                    <>
                      <p className="dp-guides-placeholder">
                        Local guides for this destination will appear here once added.
                      </p>
                      <span className="dp-guides-coming">✦ Coming soon</span>
                    </>
                  ) : (
                    <div className="dp-guides-list">
                      {guides.map(g => (
                        <div key={g._id} className="dp-guide-item">
                          <Avatar user={g.userId} size="md" onClick={() => navigate(`/user/${g.userId?._id}`)} />
                          <div className="dp-guide-info">
                            <span className="dp-guide-name" onClick={() => navigate(`/user/${g.userId?._id}`)}>
                              {g.fullName}
                            </span>
                            <span className="dp-guide-meta">
                              <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
                                <path d="M5 0C3.07 0 1.5 1.57 1.5 3.5c0 2.63 3.5 7 3.5 7s3.5-4.37 3.5-7C8.5 1.57 6.93 0 5 0zm0 4.75a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5z" fill="rgba(226,232,240,0.35)" />
                              </svg>
                              {g.city}, {g.country}
                            </span>
                          </div>
                          <button
                            className="dp-guide-chat-btn"
                            onClick={() => setBookingModal({
                              isOpen: true,
                              guideId: g._id,
                              guideName: g.fullName
                            })}
                          >
                            Book
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Weather */}
                <WeatherCard name={dest.name} country={dest.country} />

              </div>

              {/* Right Column */}
              <div className="dp-overview-col-right">

                {/* At a Glance */}
                <div className="dp-glass-card dp-stats-card">
                  <p className="dp-overview-label">At a Glance</p>
                  <div className="dp-stats-grid">
                    <div className="dp-stat">
                      <span className="dp-stat-val" style={{ color: "var(--gold)" }}>{avgRating > 0 ? avgRating.toFixed(1) : '—'}</span>
                      <span className="dp-stat-label">Avg Rating</span>
                    </div>
                    <div className="dp-stat">
                      <span className="dp-stat-val">{totalRatings}</span>
                      <span className="dp-stat-label">Ratings</span>
                    </div>
                    <div className="dp-stat">
                      <span className="dp-stat-val">{reviews.length}</span>
                      <span className="dp-stat-label">Reviews</span>
                    </div>
                    <div className="dp-stat">
                      <span className="dp-stat-val">{dest.type || '—'}</span>
                      <span className="dp-stat-label">Type</span>
                    </div>
                  </div>
                </div>

                {/* Best Time to Visit */}
                <div className="dp-glass-card dp-besttime-card">
                  <p className="dp-overview-label">Best Time to Visit</p>
                  {dest.bestTimeToVisit?.months ? (
                    <div className="dp-besttime-body">
                      <span className="dp-besttime-months">📅 {dest.bestTimeToVisit.months}</span>
                      {dest.bestTimeToVisit.reason && (
                        <p className="dp-besttime-reason">{dest.bestTimeToVisit.reason}</p>
                      )}
                    </div>
                  ) : (
                    <p className="dp-overview-muted">No seasonal info added yet.</p>
                  )}
                </div>

              </div>
            </div>

            {/* Map — full width */}
            <div className="dp-glass-card dp-map-card">
              <p className="dp-overview-label">Location</p>
              <div className="dp-map-wrap">
                <iframe
                  title="destination-map"
                  className="dp-map-iframe"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(`${dest.name}, ${dest.country}`)}&output=embed&z=12`}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>

          </div>
        )}
        {activeTab === 'tips' && (
          <div className="dp-section">
            <div className="dp-glass-card">
              <p className="dp-card-label">Traveller Tips</p>
              <div className="dp-tips-list">
                {[
                  { icon: '🕐', tip: 'Visit early morning to avoid crowds and get the best light.' },
                  { icon: '💳', tip: "Carry local cash — many smaller vendors don't accept cards." },
                  { icon: '🎒', tip: 'Pack light layers. Weather can shift dramatically throughout the day.' },
                  { icon: '🗣️', tip: 'Learn a few local phrases — locals appreciate the effort.' },
                  { icon: '📱', tip: 'Download offline maps before you go — connectivity can be spotty.' },
                ].map((item, i) => (
                  <div key={i} className="dp-tip-row">
                    <span className="dp-tip-icon">{item.icon}</span>
                    <p className="dp-tip-text">{item.tip}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
      <BookingModal
        isOpen={bookingModal.isOpen}
        onClose={() => setBookingModal({ isOpen: false, guideId: null, guideName: '' })}
        guideId={bookingModal.guideId}
        destinationId={dest._id}
        guideName={bookingModal.guideName}
        onSubmitSuccess={(data) => {
          // Optional: Show toast/notification of success
          console.log('Booking sent to:', data.guideName);
        }}
      />
    </div>
  );
}

export default DestinationPageRight;