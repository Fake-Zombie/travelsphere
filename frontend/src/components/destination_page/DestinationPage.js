import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DestinationPageLeft from './DestinationPageLeft';
import DestinationPageRight from './DestinationPageRight';
import './destinationPage.css';

function DestinationPage({ destinations, favorites, toggleFavorite }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const dest = destinations.find(d => d._id === id);

  const token = localStorage.getItem('token');
  const currentUser = JSON.parse(localStorage.getItem('user') || 'null');

  const [userRating, setUserRating] = useState(0);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [avgRating, setAvgRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  // Fetch fresh destination data on mount — keeps avgRating & totalRatings accurate after refresh
  useEffect(() => {
    if (!id) return;
    fetch(`http://localhost:5000/api/destinations/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data?.avgRating !== undefined) setAvgRating(data.avgRating);
        if (data?.totalRatings !== undefined) setTotalRatings(data.totalRatings);
      })
      .catch(() => { });
  }, [id]);

  // Fetch user's own rating
  useEffect(() => {
    if (!token || !dest) return;
    fetch(`http://localhost:5000/api/ratings/${dest._id}/mine`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (data?.value) { setUserRating(data.value); setRatingSubmitted(true); }
      }).catch(() => { });
  }, [dest, token]);

  // Fetch reviews
  useEffect(() => {
    if (!dest) return;
    setReviewsLoading(true);
    fetch(`http://localhost:5000/api/reviews/${dest._id}`)
      .then(r => r.json())
      .then(data => { setReviews(Array.isArray(data) ? data : []); setReviewsLoading(false); })
      .catch(() => setReviewsLoading(false));
  }, [dest]);

  //guides in destination page
  const [guides, setGuides] = useState([]);

useEffect(() => {
  if (!id) return;
  fetch(`http://localhost:5000/api/guides/destination/${id}`)
    .then(r => r.json())
    .then(data => setGuides(Array.isArray(data) ? data : []))
    .catch(() => {});
}, [id]);

  const submitRating = async (value) => {
    if (!token) { navigate('/login'); return; }
    setUserRating(value);
    setRatingSubmitted(true);
    try {
      const res = await fetch(`http://localhost:5000/api/ratings/${dest._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ value })
      });
      const data = await res.json();
      if (data.avgRating !== undefined) setAvgRating(data.avgRating);
      if (data.totalRatings !== undefined) setTotalRatings(data.totalRatings);
    } catch (err) { console.error(err); }
  };

  const submitReview = async (text) => {
    if (!token) { navigate('/login'); return; }
    try {
      const res = await fetch(`http://localhost:5000/api/reviews/${dest._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      setReviews(prev => [data, ...prev]);
    } catch (err) { console.error(err); }
  };

  const handleLike = async (reviewId) => {
    if (!token) { navigate('/login'); return; }
    try {
      const res = await fetch(`http://localhost:5000/api/reviews/${reviewId}/like`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setReviews(prev => prev.map(r => r._id === reviewId ? { ...r, likes: data.likes } : r));
    } catch (err) { console.error(err); }
  };

  const handleReply = async (reviewId, text) => {
    if (!token) { navigate('/login'); return; }
    try {
      const res = await fetch(`http://localhost:5000/api/reviews/${reviewId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      setReviews(prev => prev.map(r => r._id === reviewId ? { ...r, replies: data.replies } : r));
    } catch (err) { console.error(err); }
  };

  const handleLikeReply = async (reviewId, replyId) => {
    if (!token) { navigate('/login'); return; }
    try {
      const res = await fetch(`http://localhost:5000/api/reviews/${reviewId}/replies/${replyId}/like`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setReviews(prev => prev.map(r => r._id === reviewId ? { ...r, replies: data.replies } : r));
    } catch (err) { console.error(err); }
  };
  const handleDeleteReview = async (reviewId) => {
    await fetch(`http://localhost:5000/api/reviews/${reviewId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    setReviews(prev => prev.filter(r => r._id !== reviewId));
  };

  const handleDeleteReply = async (reviewId, replyId) => {
    await fetch(`http://localhost:5000/api/reviews/${reviewId}/replies/${replyId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    setReviews(prev => prev.map(r =>
      r._id === reviewId
        ? { ...r, replies: r.replies.filter(rep => rep._id !== replyId) }
        : r
    ));
  };

  if (!dest) return (
    <div className="dp-not-found">
      <p>Destination not found.</p>
      <button onClick={() => navigate('/')}>← Back</button>
    </div>
  );

  return (
    <div className="dp-root">
      <div className="dp-layout">
        <DestinationPageLeft
          dest={dest}
          isFav={favorites.includes(dest._id)}
          toggleFavorite={toggleFavorite}
          avgRating={avgRating}
          totalRatings={totalRatings}
          userRating={userRating}
          ratingSubmitted={ratingSubmitted}
          submitRating={submitRating}
        />
        <DestinationPageRight
          dest={dest}
          reviews={reviews}
          reviewsLoading={reviewsLoading}
          currentUser={currentUser}
          token={localStorage.getItem('token')}
          submitReview={submitReview}
          handleLike={handleLike}
          handleReply={handleReply}
          handleLikeReply={handleLikeReply}
          handleDeleteReview={handleDeleteReview}   
          handleDeleteReply={handleDeleteReply}    
          totalRatings={totalRatings}
          avgRating={avgRating} 
          guides={guides}
        />
      </div>
    </div>
  );
}

export default DestinationPage;