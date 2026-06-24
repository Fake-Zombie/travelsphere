import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from "react-router-dom";
import '../assets/css/navbar.css';
import { getProfilePicUrl } from '../utils/profilePicUrl';
import { API_URL } from "../services/api";
function Navbar({ favorites = [], destinations = [], notificationsCount = 0, loggedIn, user, setLoggedIn, setUser, socialDot = false }) {
  const navigate = useNavigate();
  const [showFavoritesDropdown, setShowFavoritesDropdown] = useState(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const seenIds = JSON.parse(localStorage.getItem("seenFavorites") || "[]");
  const showDot = favorites.some(id => !seenIds.includes(id));

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [hasPendingPayments, setHasPendingPayments] = useState(false);
  const BASE_URL = API_URL;

  // Check for pending payments on mount
  useEffect(() => {
    if (user?.role === 'guide' && loggedIn) {
      checkPendingPayments();
    }
  }, [user, loggedIn]);

  const checkPendingPayments = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BASE_URL}/api/booking/payments/pending-count`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setHasPendingPayments(data.hasPending);
    } catch (err) {
      console.error('Error checking payments:', err);
    }
  };

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setLoggedIn(false);
    setUser(null);
    navigate("/");
  };

  const isNavSolid = scrolled || showFavoritesDropdown || showNotificationsDropdown || showProfileDropdown;
  //close side drawer on click anywhere
  useEffect(() => {
    if (!showProfileDropdown) return;
    const handleClickOutside = (e) => {
      if (!e.target.closest(".profile-section")) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showProfileDropdown]);

  return (
    <nav className={`navbar ${isNavSolid ? "nav-solid" : ""}`}>

      {/* LEFT: Logo */}
      <div className="nav-left">
        <p className="nav-logo" onClick={() => navigate("/")}>TravelSphere</p>
      </div>

      {/* CENTER: Navigation */}
      <div className="nav-center">
        <div
          className="nav-center-item-wrapper"
          onMouseEnter={() => setShowFavoritesDropdown(true)}
          onMouseLeave={() => setShowFavoritesDropdown(false)}
        >
          {windowWidth > 850 && (
            <div
              className={`nav-center-item ${showFavoritesDropdown ? 'active' : ''}`}
              onClick={() => {
                navigate("/favorites");
                setShowFavoritesDropdown(false);
              }}
            >
              Favorites
              {showDot && <span className="badge"></span>}
            </div>
          )}
        </div>

        <div className="nav-center-item-wrapper">
          <div
            className="nav-center-item"
            onClick={() => navigate("/social")}
          >
            Social
            {socialDot && <span className="dot" />}
          </div>
        </div>

        <div
          className="nav-center-item-wrapper"
          onMouseEnter={() => setShowNotificationsDropdown(true)}
          onMouseLeave={() => setShowNotificationsDropdown(false)}
        >
          {windowWidth > 850 && (
            <div
              className={`nav-center-item ${showNotificationsDropdown ? 'active' : ''}`}
              onClick={() => {
                navigate("/notifications");
                setShowNotificationsDropdown(false);
              }}
            >
              Notifications
              {notificationsCount > 0 && <span className="badge">{notificationsCount}</span>}
            </div>
          )}
        </div>

      </div>

      {/* RIGHT: Profile / Auth */}
      <div className="nav-right">
        {loggedIn ? (
          <div className="profile-section">
            {/* social button for mobile */}
            {loggedIn && (
              <button
                className="mobile-social-btn"
                onClick={() => navigate("/social")}
                style={{ position: "relative" }}
              >
                {socialDot && (
                  <span style={{
                    position: "absolute", top: 4, right: 4,
                    width: 8, height: 8, borderRadius: "50%",
                    background: "var(--red)"
                  }} />
                )}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </button>
            )}
            <div className="nav-divider"></div>
            <div className="nav-divider"></div>

            {/* Hamburger Toggle Logic */}
            <div className="hamburger-wrapper">
              {(showDot || notificationsCount > 0 || hasPendingPayments) && (
                <span className="hamburger-dot" />
              )}
              <div
                className={`menu-btn ${showProfileDropdown ? "open" : ""}`}
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              >
                <span className="line"></span>
                <span className="line"></span>
                <span className="line"></span>
              </div>
            </div>

            <div className="profile-icon" onClick={() => navigate("/profile")}>
              {user?.profile_pic ? (
  <img
    src={getProfilePicUrl(user.profile_pic)}
    alt="Profile"
    className="profile-img"
  />
) : (
  <span className="profile-initial">{user?.username?.charAt(0).toUpperCase()}</span>
)}
            </div>

            {/* SIDE DRAWER */}
            <div className={`side-drawer ${showProfileDropdown ? "open" : ""}`}>
              <div className="drawer-content">
                {/* PAYMENT WARNING - Show at top if pending */}
                {user?.role === 'guide' && hasPendingPayments && (
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid var(--red)',
                    borderRadius: '6px',
                    padding: '12px',
                    marginBottom: '12px',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: '0 0 8px 0', color: 'var(--red)', fontWeight: '600', fontSize: '13px' }}>
                      ⚠️ Payment Due
                    </p>
                    <button 
                      onClick={() => { navigate("/pending-payments"); setShowProfileDropdown(false); }}
                      style={{
                        background: 'var(--red)',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                        width: '100%'
                      }}
                    >
                      Pay Now
                    </button>
                  </div>
                )}

                <h4>Menu</h4>
                {/* Mobile Links */}
                <div className="mobile-nav-links">
                  {windowWidth <= 849 && (
                    <button
                      className="mobile-only-link"
                      onClick={() => {
                        navigate("/favorites");
                        setShowProfileDropdown(false);
                      }}
                      style={{ position: "relative" }}
                    >
                      Favorites
                      {showDot && (
                        <span className="mobile-dot-circular" />
                      )}
                    </button>
                  )}

                  {windowWidth <= 849 && (
                    <button
                      className="mobile-only-link"
                      onClick={() => {
                        navigate("/notifications");
                        setShowProfileDropdown(false);
                      }}
                      style={{ position: "relative" }}
                    >
                      Notifications
                      {notificationsCount > 0 && (
                        <span className="mobile-badge">{notificationsCount}</span>
                      )}
                    </button>
                  )}
                </div>

                <h4>Account</h4>

                {user?.role !== "admin" && user?.role !== "guide" && (
                  <button onClick={() => { navigate("/become-guide"); setShowProfileDropdown(false); }}>
                    Be a Guide
                  </button>
                )}

                {user?.role !== "admin" && (
                  <button onClick={() => { navigate("/applications"); setShowProfileDropdown(false); }}>
                    My Applications
                  </button>
                )}

                {user?.role !== "admin" && user?.role !== "guide" && (
                  <button onClick={() => { navigate("/my-bookings"); setShowProfileDropdown(false); }}>
                    My Bookings
                  </button>
                )}

                {user?.role === "guide" && (
                  <button onClick={() => { navigate("/guide-booking-requests"); setShowProfileDropdown(false); }}>
                    Booking Requests
                  </button>
                )}

                {user?.role === "guide" && (
                  <button onClick={() => { navigate("/guide-dashboard"); setShowProfileDropdown(false); }}>
                    Guide Dashboard
                  </button>
                )}

                {user?.role !== "admin" && (
                  <button onClick={() => { navigate("/requests"); setShowProfileDropdown(false); }}>
                    Request Admin
                  </button>
                )}

                <button onClick={() => { navigate("/profile"); setShowProfileDropdown(false); }}>
                  Profile Settings
                </button>

                {user?.role === "admin" && (
                  <button
                    onClick={() => {
                      navigate("/admin");
                      setShowProfileDropdown(false);
                    }}
                  >
                    Admin Dashboard
                  </button>
                )}

                <button onClick={handleLogout} className="logout-btn">Logout</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="auth-buttons">
            <Link to="/login" className="auth-btn">Login</Link>
            <Link to="/signup" className="auth-btn">Sign Up</Link>
          </div>
        )}
      </div>

      {/* DECOUPLED MEGA DROPDOWNS */}
      <div
        className={`mega-dropdown ${showFavoritesDropdown ? 'visible' : ''}`}
        onMouseEnter={() => setShowFavoritesDropdown(true)}
        onMouseLeave={() => setShowFavoritesDropdown(false)}
      >
        <div className="mega-content">

          {/* COLUMN 1 Primary */}
          <div className="section primary">
            <h4>Your Favorites</h4>
            {favorites.length > 0 ? (
              <ul>
                {favorites.map(id => {
                  const destination = destinations.find(
                    d => String(d._id) === String(id)
                  );
                  if (!destination) return null;

                  return (
                    <li key={id} onClick={() => navigate(`/destination/${id}`)}>
                      <span className="fav-name">{destination.name}</span>
                      <span className="fav-country">{destination.country}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="empty-msg">No favorites yet.</p>
            )}
          </div>

          {/* COLUMN 2 — Insights */}
          <div className="section secondary">
            <h4>Insights</h4>
            {favorites.length > 0 ? (
              <ul>
                <li>Total saved: {favorites.length}</li>
                <li>Last added: #{favorites[favorites.length - 1]}</li>
                <li>Plan your next revisit</li>
              </ul>
            ) : (
              <p className="empty-msg">Start exploring to save places.</p>
            )}
          </div>

          {/* COLUMN 3 — Actions */}
          <div className="section actions">
            <h4>Manage</h4>
            <button
              className="mega-action-btn"
              onClick={() => {
                navigate("/favorites");
                setShowFavoritesDropdown(false);
              }}
            >
              View All Favorites
            </button>

            {favorites.length > 0 && (
              <button
                className="mega-action-btn"
                onClick={() => {
                  localStorage.removeItem("seenFavorites");
                  window.location.reload();
                }}
              >
                Reset Seen
              </button>
            )}
          </div>

        </div>
      </div>

      <div
        className={`mega-dropdown ${showNotificationsDropdown ? 'visible' : ''}`}
        onMouseEnter={() => setShowNotificationsDropdown(true)}
        onMouseLeave={() => setShowNotificationsDropdown(false)}
      >
        <div className="mega-content">

          {/* COLUMN 1 Primary */}
          <div className="section primary">
            <h4>Recent Notifications</h4>
            {notificationsCount > 0 ? (
              <p className="empty-msg">You have {notificationsCount} unread — click to view all.</p>
            ) : (
              <p className="empty-msg">No new notifications</p>
            )}
          </div>
          {/* COLUMN 2 SECONDARY */}
          <div className="section secondary">
            <h4>Activity</h4>
            <p className="empty-msg">{notificationsCount > 0 ? `${notificationsCount} unread` : "You're all caught up."}</p>
          </div>

          {/* COLUMN 3 Actions */}
          <div className="section actions">
            <h4>Settings</h4>

            <button
              className="mega-action-btn"
              onClick={() => {
                navigate("/notifications");
                setShowNotificationsDropdown(false);
              }}
            >
              View All Notifications
            </button>

            {notificationsCount > 0 && (
              <button
                className="mega-action-btn"
                onClick={() => alert("Notifications cleared (UI demo)")}
              >
                Clear All
              </button>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
}

export default Navbar;