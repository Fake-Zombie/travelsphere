import React, { useState, useEffect, useRef } from 'react';
import DestinationCard from './DestinationCard';
import '../assets/css/home.css';
import { useNavigate, useLocation } from "react-router-dom";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import Toast from './toast/Toast';
import { useToast } from './toast/useToast';

const auroraVideo = "https://res.cloudinary.com/dzxgqrpnp/video/upload/v1782279298/aurora_fnknkn.mp4";



function Home({ destinations, favorites, setFavorites, toggleFavorite, loading }) {

const { toasts, showToast, removeToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMood, setSelectedMood] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [sortType, setSortType] = useState("popular");
  const [visibleCount, setVisibleCount] = useState(8);
  const [showDropdown, setShowDropdown] = useState(false);
  const [requestingDestination, setRequestingDestination] = useState(false);
const [requestSuccess, setRequestSuccess] = useState(false);

const location = useLocation();

useEffect(() => {
  if (location.search.includes('scroll=explore')) {
    // small delay lets the page render first
    setTimeout(() => {
      scrollToExplore(); // your existing function
    }, 100);
  }
}, [location]);

const handleDestinationRequest = async () => {
  if (!searchQuery.trim()) return;

  const token = localStorage.getItem("token");

  // user not logged in
  if (!token) {
    showToast("Please login to request destinations.", "error");
    return;
  }

  try {
    setRequestingDestination(true);

    const res = await fetch("http://localhost:5000/api/requests", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject: `Add destination: ${searchQuery}`,
        category: "Destination Suggestion",
        message: `User requested "${searchQuery}" destination to be added.`,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to submit request");
    }

    setRequestSuccess(true);

    showToast("Destination request sent successfully!", "success");

    setTimeout(() => {
      setRequestSuccess(false);
    }, 3000);

  } catch (err) {
    console.error(err);

    showToast(
      err.message || "Failed to send request",
      "error"
    );
  } finally {
    setRequestingDestination(false);
  }
};

//mood drum
const [moodScrollIndex, setMoodScrollIndex] = useState(0);
const [moodVisibleCount, setMoodVisibleCount] = useState(4);
const moodListRef = useRef(null);  
const moodDrumRef = useRef(null);
const moodCardsRef = useRef(null);
useEffect(() => {
  const el = moodDrumRef.current;
  if (!el) return;

  const handleMoodWheel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const moodEntries = Object.entries(moodConfig).filter(
      ([type]) => destinations.filter(d => d.type === type).length > 0
    );
    if (e.deltaY > 0) setMoodScrollIndex(i => Math.min(i + 1, moodEntries.length - 1));
    else setMoodScrollIndex(i => Math.max(i - 1, 0));
  };

  el.addEventListener('wheel', handleMoodWheel, { passive: false });
  return () => el.removeEventListener('wheel', handleMoodWheel);
}, [destinations]);
useEffect(() => {
  setMoodVisibleCount(4);
}, [moodScrollIndex]);

//drum for mobile
useEffect(() => {
  const el = moodDrumRef.current;
  if (!el) return;

  // existing wheel handler
  const handleWheel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const moodEntries = Object.entries(moodConfig).filter(
      ([type]) => destinations.filter(d => d.type === type).length > 0
    );
    if (e.deltaY > 0 || e.deltaX > 0) setMoodScrollIndex(i => Math.min(i + 1, moodEntries.length - 1));
    else setMoodScrollIndex(i => Math.max(i - 1, 0));
  };

  // touch swipe
  let touchStartX = 0;
  let touchStartY = 0;

  const handleTouchStart = (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    const dx = touchStartX - e.changedTouches[0].clientX;
    const dy = touchStartY - e.changedTouches[0].clientY;
    const moodEntries = Object.entries(moodConfig).filter(
      ([type]) => destinations.filter(d => d.type === type).length > 0
    );
    // only trigger if horizontal swipe dominates
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
      if (dx > 0) setMoodScrollIndex(i => Math.min(i + 1, moodEntries.length - 1));
      else setMoodScrollIndex(i => Math.max(i - 1, 0));
    }
  };

  el.addEventListener('wheel', handleWheel, { passive: false });
  el.addEventListener('touchstart', handleTouchStart, { passive: true });
  el.addEventListener('touchend', handleTouchEnd, { passive: true });

  return () => {
    el.removeEventListener('wheel', handleWheel);
    el.removeEventListener('touchstart', handleTouchStart);
    el.removeEventListener('touchend', handleTouchEnd);
  };
}, [destinations]);



  const trendingSectionRef = useRef(null);
  const trendingRef = useRef(null);
  const scrollOffset = useRef(0); // tracks current scroll position
  const resultsRef = useRef(null);
  const suggestionsRef = useRef(null);
  const requestIdRef = useRef(null);
  const touchTimeoutRef = useRef(null);

  const navigate = useNavigate();

  


  /*HERO BOTTOM QUOTES*/
  const quotes = [
    "Adventure awaits beyond the horizon.",
    "Travel far, travel wide, travel deep.",
    "Discover hidden gems off the beaten path.",
    "Wanderlust is a never-ending journey.",
    "Every journey begins with a single step."
  ];
  const [activeQuote, setActiveQuote] = useState(0);
  const nextQuote = () => setActiveQuote((prev) => (prev + 1) % quotes.length);
  const prevQuote = () => setActiveQuote((prev) => (prev - 1 + quotes.length) % quotes.length);

  /*MOODS */
  const moodConfig = {
  Beach: "🏖️", Mountain: "🏔️", Romance: "❤️", City: "🏙️",
  Desert: "🏜️", Forest: "🌲", Island: "🌴", Cultural: "🏛️",
  Adventure: "🧗", Other: "🌍"
};

  /*TRENDING DESTINATIONS */
  const trendingDestinations = destinations.slice(0, 7);

  // Scroll to top on refresh
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Auto-rotate hero quotes
  useEffect(() => {
    const interval = setInterval(() => nextQuote(), 3000);
    return () => clearInterval(interval);
  }, []);

  // Scroll tracking for search suggestions
  useEffect(() => {
    const el = suggestionsRef.current;
    if (!el) return;

    let scrollTimeout;

    const handleScroll = () => {
      el.classList.add("scrolling"); // add class immediately
      clearTimeout(scrollTimeout);

      // Remove class after 300ms of no scroll
      scrollTimeout = setTimeout(() => {
        el.classList.remove("scrolling");
      }, 300);
    };

    el.addEventListener("scroll", handleScroll);

    return () => {
      el.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [showSuggestions]);

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = () => setShowSuggestions(false);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);



  /*SEARCH & SUGGESTIONS*/
  const suggestions =
    searchQuery.length > 0
      ? destinations.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5)
      : [];

  /* FAVORITES LOGIC*/


  /* FILTER DESTINATIONS BY MOOD & SEARCH */
const moodFiltered = selectedMood === ""
  ? destinations
  : destinations.filter(d => d.type === selectedMood);

  let searchedDestinations = moodFiltered.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sorting logic
  if (sortType === "az") {
    searchedDestinations.sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  } else if (sortType === "za") {
    searchedDestinations.sort((a, b) =>
      b.name.localeCompare(a.name)
    );
  } else if (sortType === "popular") {
    searchedDestinations.sort((a, b) =>
      (favorites.includes(b._id) ? 1 : 0) -
      (favorites.includes(a._id) ? 1 : 0)
    );
  }
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleSort = (type) => {
    setSortType(type);
    setShowDropdown(false);
  };
  /*reset visible count on filters changed*/
  useEffect(() => {
    setVisibleCount(8);
  }, [searchQuery, selectedMood, sortType]);


  /* TRENDING AUTO-SCROLL & BUTTONS */
  const scrollTrending = (direction) => {
    const grid = trendingRef.current;
    if (!grid) return;

    // FIX: Card width (280) + gap (24) = 304
    const cardWidth = 304;

    // For manual button clicks, use smooth behavior
    grid.scrollBy({
      left: direction * cardWidth,
      behavior: 'smooth'
    });

    // Update the manual offset tracker so auto-scroll knows where we are
    scrollOffset.current = grid.scrollLeft + (direction * cardWidth);
  };

  // TRENDING AUTO SCROLL USEEFFECT
  useEffect(() => {
    const grid = trendingRef.current;
    if (!grid || !trendingDestinations.length) return;

    const scrollSpeed = 1; // Slightly slower for a more premium feel

    const autoScroll = () => {
      scrollOffset.current += scrollSpeed;

      // Loop seamlessly: using scrollWidth / 2 because you doubled the array
      if (scrollOffset.current >= grid.scrollWidth / 2) {
        scrollOffset.current = 0;
      }

      grid.scrollLeft = scrollOffset.current;
      requestIdRef.current = requestAnimationFrame(autoScroll);
    };

    requestIdRef.current = requestAnimationFrame(autoScroll);

    const stopScroll = () => cancelAnimationFrame(requestIdRef.current);

    const resumeScroll = () => {
      // Clear any existing timeout to prevent multiple loops
      if (touchTimeoutRef.current) clearTimeout(touchTimeoutRef.current);
      touchTimeoutRef.current = setTimeout(() => {
        requestIdRef.current = requestAnimationFrame(autoScroll);
      }, 2000);
    };

    // Stop on hover or touch
    grid.addEventListener("touchstart", stopScroll);
    grid.addEventListener("touchend", resumeScroll);

    return () => {
      cancelAnimationFrame(requestIdRef.current);
      grid.removeEventListener("mouseenter", stopScroll);
      grid.removeEventListener("mouseleave", resumeScroll);
      // ... remove other listeners
    };
  }, [trendingDestinations]);


  /*FOOTER*/
  const scrollToExplore = () => {
    if (!resultsRef.current) return;
    const offset = 60; // height of navbar
    const top = resultsRef.current.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top, behavior: "smooth" });
  };

  const scrollToTrending = () => {
    if (!trendingSectionRef.current) return;
    const offset = 60; // height of navbar
    const top = trendingSectionRef.current.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top, behavior: "smooth" });
  };


  /*RENDER*/
  return (
    <div className="home-wrapper">

      {/*  HERO SECTION  */}
      <div className="hero-section">
        {/* Video Background */}
        <video
          className="hero-video"
          autoPlay
          muted
          loop
          playsInline
        >
          <source src={auroraVideo} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <div className="hero-overlay">

          <h1 className="hero-title">Discover Your Next Journey</h1>

          {/* 🔍 SEARCH INSIDE HERO */}
          <div className="hero-search-container">
            <div className="hero-search">
              <input
                onClick={(e) => e.stopPropagation()}
                type="text"
                placeholder="Search destinations..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
              />
            </div>

            {showSuggestions && searchQuery.length > 0 && (
  <div
    ref={suggestionsRef}
    className={`search-suggestions ${isScrolling ? "scrolling" : ""}`}
  >

    {/* NORMAL SUGGESTIONS */}
    {suggestions.length > 0 ? (
      suggestions.map((dest) => (
        <div
          key={dest._id}
          className="suggestion-item"
          onClick={() => {
            setSearchQuery(dest.name);
            setShowSuggestions(false);
            navigate(`/destination/${dest._id}`);
          }}
        >
          <div className="suggestion-image">
            <img src={dest.image} alt={dest.name} />
          </div>

          <div className="suggestion-content">
            <div className="suggestion-title">{dest.name}</div>
            <div className="suggestion-location">{dest.location}</div>
            <div className="suggestion-description">
              {dest.description?.slice(0, 60)}...
            </div>
          </div>
        </div>
      ))
    ) : (
      /* REQUEST DESTINATION CARD */
      <div className="request-destination-box">
        <div className="request-destination-text">
          We don't have <strong>"{searchQuery}"</strong> yet.
          <br />
          Wanna request admin to add it?
        </div>

        <button
  className={`request-destination-btn ${
    requestSuccess ? "success" : ""
  }`}
  onClick={handleDestinationRequest}
  disabled={requestingDestination}
>
  {requestingDestination
    ? "Sending..."
    : requestSuccess
    ? "✓ Requested"
    : "Request Destination"}
</button>
      </div>
    )}
  </div>
)}

          </div>
        </div>
        {/*  HERO BOTTOM QUOTES  */}
        <div className="hero-bottom">
          <div className="quotes-container">
            <p className="quote-text">{quotes[activeQuote]}</p>
            <div className="quote-controls">
              <button className="prev-btn" onClick={prevQuote}>‹</button>
              <button className="next-btn" onClick={nextQuote}>›</button>
            </div>
          </div>
        </div>




      </div>

      {/*  TRENDING  */}
      <div ref={trendingSectionRef} className="section trending-section">
        <h2 className="section-title trending-title">Trending Destinations</h2>

        <div className="trending-carousel">
          <button className="carousel-btn prev" onClick={() => scrollTrending(-1)}>  <FaChevronLeft />
          </button>

          <div className="trending-grid" ref={trendingRef}>
            {[...trendingDestinations, ...trendingDestinations].map((dest, index) => (
              <DestinationCard
                key={dest._id}
                dest={dest}
                isFavorite={favorites.includes(dest._id)}
                onToggleFavorite={toggleFavorite} // pass from App.js
                onClick={(id) => navigate(`/destination/${id}`)}
              />


            ))}
          </div>


          <button className="carousel-btn next" onClick={() => scrollTrending(1)}>  <FaChevronRight /></button>
        </div>
      </div>


      {/*  MOOD SECTION  */}
{(() => {
  const moodEntries = Object.entries(moodConfig).filter(
    ([type]) => destinations.filter(d => d.type === type).length > 0
  );
  const activeMoodType = moodEntries[moodScrollIndex]?.[0] ?? "";
  const activeMoodEmoji = moodEntries[moodScrollIndex]?.[1] ?? "";
  const moodCards = destinations.filter(d => d.type === activeMoodType);

  const handleMoodWheel = (e) => {
    e.preventDefault();
    if (e.deltaY > 0) setMoodScrollIndex(i => Math.min(i + 1, moodEntries.length - 1));
    else setMoodScrollIndex(i => Math.max(i - 1, 0));
  };

  return (
    <div className="section mood-section">
      <h2 className="section-title">Explore by Mood</h2>
      <div className="mood-layout">

        {/* Left: drum-roll selector */}
<div className="mood-drum-wrap"ref={moodDrumRef}>
  <div className="mood-drum-fade-top" />
  <div className="mood-drum-fade-bottom" />
  <div
    className="mood-drum-track"
    style={{ '--active-index': moodScrollIndex }}
  >
    {moodEntries.map(([type, emoji], i) => {
      const diff = i - moodScrollIndex;
      return (
        <div
          key={type}
          className={`mood-drum-item ${diff === 0 ? "center" : ""}`}
          style={{ '--diff': Math.abs(diff) }}
          onClick={() => setMoodScrollIndex(i)}
        >
          <span className="mood-drum-emoji">{emoji}</span>
          <span className="mood-drum-label">{type}</span>
        </div>
      );
    })}
  </div>
</div>

        {/* Right: cards */}
        <div className="mood-cards-area">
  <div className="mood-cards-scroll-wrap">
    <button
      className="mood-cards-btn prev"
      onClick={() => moodCardsRef.current?.scrollBy({ left: -320, behavior: 'smooth' })}
    >
      <FaChevronLeft />
    </button>

    <div className="mood-cards-grid" key={activeMoodType} ref={moodCardsRef}>
      {moodCards.map(dest => (
        <DestinationCard
          key={dest._id}
          dest={dest}
          isFavorite={favorites.includes(dest._id)}
          onToggleFavorite={toggleFavorite}
          onClick={(id) => navigate(`/destination/${id}`)}
        />
      ))}
    </div>

    <button
      className="mood-cards-btn next"
      onClick={() => moodCardsRef.current?.scrollBy({ left: 320, behavior: 'smooth' })}
    >
      <FaChevronRight />
    </button>
  </div>
</div>

      </div>
    </div>
  );
})()}
      {/*  DESTINATION GRID  */}
      <div ref={resultsRef} className="section explore-section">
        <div className="explore-header">
          <h2 className="section-title">Explore Destinations</h2>
          <div className="sort-container">
            <div
              className="sort-selected"
              onClick={(e) => {
                e.stopPropagation(); // Prevents clicks from bubbling up
                setShowDropdown(!showDropdown); // Use showDropdown here
              }}
            >
              {sortType === "popular" && "Most Popular"}
              {sortType === "az" && "A - Z"}
              {sortType === "za" && "Z - A"}

              <span className={`dropdown-arrow ${showDropdown ? "open" : ""}`}>
                ▼
              </span>
            </div>

            {/* Changed from showDropdown && ... to use showDropdown consistently */}
            {showDropdown && (
              <div className="sort-options">
                <div onClick={() => handleSort("popular")}>Most Popular</div>
                <div onClick={() => handleSort("az")}>A - Z</div>
                <div onClick={() => handleSort("za")}>Z - A</div>
              </div>
            )}
          </div>

        </div>

        <div className="cards-container">
          {destinations.length > 0 ? (
            searchedDestinations.slice(0, visibleCount).map(dest => (
              <DestinationCard
                key={dest._id}
                dest={dest}
                isFavorite={favorites.includes(dest._id)}
                onToggleFavorite={toggleFavorite}
                onClick={(id) => navigate(`/destination/${id}`)}
              />
            ))
          ) : (
            <div>No destinations found.</div>
          )}
        </div>


        {visibleCount < searchedDestinations.length && (
          <div className="load-more-wrapper">
            <button
              className="load-more-btn"
              onClick={() => setVisibleCount(prev => prev + 4)}
            >
              Load More
            </button>
          </div>
        )}

      </div>

      <footer className="footer">

        <div className="footer-glow-line"></div>

        <div className="footer-content">

          <div className="footer-left">
            <h3 className="footer-logo">TravelSphere</h3>
            <p className="footer-tagline">
              Discover destinations that match your vibe.
            </p>
          </div>

          <div className="footer-center">
            <p>
              Crafted by
              <span className="footer-accent"> Ankur Rajak</span>
            </p>

            <p>
              <a
                href="mailto:ankurkrrajak@gmail.com"
                className="footer-accent"
              >
                ankurkrrajak@gmail.com
              </a>
            </p>
          </div>

          <div className="footer-right">
            <p className="footer-section-title">Explore</p>
            <ul>
              <li onClick={scrollToExplore}>Destinations</li>
              <li onClick={() => navigate("/favorites")}>Favorites</li>
              <li onClick={scrollToTrending}>Top Rated</li>
              <li onClick={() => navigate("/about")}>About</li>
            </ul>
          </div>



        </div>

        <div className="footer-bottom">
          © {new Date().getFullYear()} TravelSphere. All rights reserved.
          <button
            className="scroll-top-btn"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            ↑
          </button>
        </div>

      </footer>

<div className="toast-container">
  {toasts.map((toast) => (
    <Toast
      key={toast.id}
      message={toast.message}
      type={toast.type}
      duration={toast.duration}
      onClose={() => removeToast(toast.id)}
    />
  ))}
</div>
    </div>


  );

}

export default Home;
