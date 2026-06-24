import React, { useEffect } from "react";
import DestinationCard from "./DestinationCard";
import { useNavigate } from "react-router-dom";
import "../assets/css/favorites.css";
import { API_URL } from "../services/api";

function FavoritesPage({ destinations, favorites, toggleFavorite }) {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) { 
      navigate("/login"); 
      return; 
    }

    // Mark ALL current favorites as seen only when user visits this page
    localStorage.setItem("seenFavorites", JSON.stringify(favorites));

  }, []); // Empty dependency array - only run on mount

  const favoriteDestinations = favorites
    .map(id => destinations.find(d => d._id === id))
    .filter(Boolean);

  return (
    <div className="favorites-page">

      {/* HERO */}
      <div className="favorites-hero">
        <p className="favorites-eyebrow">Your Collection</p>
        <h1 className="favorites-title">Saved Places</h1>
        <p className="favorites-subtitle">
          {favoriteDestinations.length === 0
            ? "You haven't saved anything yet."
            : `${favoriteDestinations.length} destination${favoriteDestinations.length !== 1 ? "s" : ""} saved`}
        </p>
      </div>

      {/* EMPTY STATE */}
      {favoriteDestinations.length === 0 ? (
        <div className="favorites-empty">
          <span className="favorites-empty-icon">✦</span>
          <h3>Nothing saved yet</h3>
          <p>Explore destinations and heart the ones that speak to you.</p>
          <button onClick={() => navigate("/")}>Start Exploring</button>
        </div>
      ) : (
        <div className="favorites-grid">
          {favoriteDestinations.map((destination) => (
            <div key={destination._id} className="favorites-card-wrapper">
              {(() => {
  const seen = JSON.parse(localStorage.getItem("seenFavorites") || "[]");
  return !seen.includes(destination._id);
})() && (
  <span className="recent-badge">Recently Added</span>
)}
              <DestinationCard
                dest={destination}
                isFavorite={true}
                onToggleFavorite={toggleFavorite}
                onClick={(id) => navigate(`/destination/${id}`)}
              />
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

export default FavoritesPage;