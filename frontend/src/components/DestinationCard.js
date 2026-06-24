import React from 'react';
import '../assets/css/destinationCard.css';
import { API_URL } from "../services/api";

function DestinationCard({ 
  dest, 
  isFavorite, 
  onToggleFavorite, 
  onClick 
}) {
  if (!dest) return null;

  const { _id, name, country, image, avgRating } = dest;

  return (
    <div 
      className="modern-dest-card"
      onClick={() => onClick(_id)}
      role="button"
      tabIndex={0}
    >
      {/* Main Image */}
      <img
        className="dest-bg-image"
        src={`http://localhost:5000${image}`}
        alt={name}
        onError={(e) => {
          e.target.src = "/static/uploads/country_pics/default.jpg";
        }}
      />

      {/* Dark Overlay Gradient for Text Readability */}
      <div className="dest-overlay"></div>

      {/* Top Floating Elements */}
      <div className="dest-top-ui">
        {avgRating > 0 && (
          <div className="dest-rating">
            <span>★</span> {avgRating.toFixed(1)}
          </div>
        )}
        <button
          className={`dest-fav-btn ${isFavorite ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(_id);
          }}
        >
          {isFavorite ? '❤️' : '🤍'}
        </button>
      </div>

      {/* Bottom Text Content */}
      <div className="dest-details">
        <h3 className="dest-title">{name}</h3>
        <span className="dest-country-tag">{country}</span>
        <div className="dest-explore-btn">View Destination</div>
      </div>
    </div>
  );
}

export default DestinationCard;