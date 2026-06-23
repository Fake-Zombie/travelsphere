import React, { useState, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Preloader from "./components/Preloader";
import Navbar from "./components/Navbar";
import Home from "./components/Home";
import About from "./components/About";
import DestinationPage from "./components/destination_page/DestinationPage";
import Login from "./components/Login";
import Signup from "./components/Signup";
import NotificationPage from "./components/NotificationPage";
import Applications from "./components/Applications";
import ProfilePage from "./components/ProfilePage";
import FavoritesPage from "./components/FavoritesPage";
import AdminDashboard from "./components/admin_panel/AdminDashboard";
import BecomeGuide from "./components/guide_panel/BecomeGuide";
import GuideSection from "./components/guide_panel/GuideSection";
import Requests from "./components/Requests";
import SocialPage from "./components/social_page/SocialPage";
import { SocketProvider } from "./context/SocketContext";
import NotificationToast from "./components/NotificationToast";
import MyBookings from "./components/MyBookings";
import GuideBookingRequests from './components/guide_panel/GuideBookingRequests';
import PendingPayments from './components/PendingPayments';

// ── Read auth state synchronously so socket connects on first render ──────────
function getInitialAuth() {
  try {
    const token = localStorage.getItem("token");
    const stored = localStorage.getItem("user");
    if (token && stored) {
      return { loggedIn: true, user: JSON.parse(stored) };
    }
  } catch (_) {}
  return { loggedIn: false, user: null };
}

const initialAuth = getInitialAuth();

function App() {
  const [destinations, setDestinations] = useState([]);
  const [favorites,    setFavorites]    = useState([]);
  const [loggedIn,     setLoggedIn]     = useState(initialAuth.loggedIn);
  const [user,         setUser]         = useState(initialAuth.user);
  const [loading,      setLoading]      = useState(true);
  const [showSplash,   setShowSplash]   = useState(true);
  const location = useLocation();
  const [notificationsCount, setNotificationsCount] = useState(0);
  const [socialDot,          setSocialDot]           = useState(false);

  // Only show splash on home page
  useEffect(() => {
    const isHomePage = location.pathname === "/" || location.pathname === "";
    if (!isHomePage) setShowSplash(false);
  }, [location.pathname]);

  // Fetch destinations
  useEffect(() => {
    fetch("http://localhost:5000/api/destinations")
      .then((res) => res.json())
      .then((data) => { setDestinations(data); setLoading(false); })
      .catch((err) => { console.error(err); setLoading(false); });
  }, []);

  // Fetch favorites
useEffect(() => {
  if (loggedIn !== true) return;
  const fetchFavorites = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/favorites", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      const favIds = data.map((dest) => String(dest._id)).reverse();
      setFavorites(favIds);
      
      const seenIds = JSON.parse(localStorage.getItem("seenFavorites") || "[]");

if (seenIds.length === 0) {
  // First login or cleared storage — treat everything as already seen
  localStorage.setItem("seenFavorites", JSON.stringify(favIds));
} else {
  // Clean up any removed favorites from seen list
  const filteredSeen = seenIds.filter(id => favIds.includes(String(id)));
  localStorage.setItem("seenFavorites", JSON.stringify(filteredSeen));
}
    } catch (err) {
      console.error("Error fetching favorites:", err);
    }
  };
  fetchFavorites();
}, [loggedIn]);

  // Clear state on logout
  useEffect(() => {
    if (loggedIn === false) {
      setFavorites([]);
      setNotificationsCount(0);
      setSocialDot(false);
    }
  }, [loggedIn]);

  // Toggle favorite
  const toggleFavorite = async (destinationId) => {
    if (!user) { alert("You must be logged in to like a destination!"); return; }
    const isAlreadyFavorite = favorites.includes(destinationId);
    try {
      const res = await fetch(`http://localhost:5000/api/favorites/${destinationId}`, {
        method: isAlreadyFavorite ? "DELETE" : "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (res.ok) {
        setFavorites((prev) =>
          isAlreadyFavorite
            ? prev.filter((id) => id !== destinationId)
            : [destinationId, ...prev]
        );
      } else {
        console.error("Favorite API error:", data.message);
      }
    } catch (err) {
      console.error("Favorite toggle failed:", err);
    }
  };

  return (
    <SocketProvider
      user={user}
      onCounts={({ pendingCount, unreadCount }) => {
        setSocialDot(pendingCount > 0);
        setNotificationsCount(unreadCount);
      }}
    >
      <NotificationToast onNewNotification={(notif) => {
  if (notif?.type === "request") setSocialDot(true);
  if (notif?.type === "booking_message") setNotificationsCount((c) => c + 1);
  else setNotificationsCount((c) => c + 1);
}} />
      {showSplash && <Preloader onComplete={() => setShowSplash(false)} />}
      <div className={`main-app-container ${showSplash ? "content-hidden" : "fade-in"}`}>
        {loggedIn !== null && (
          <Navbar
            loggedIn={loggedIn}
            favorites={favorites}
            destinations={destinations}
            user={user}
            setLoggedIn={setLoggedIn}
            setUser={setUser}
            notificationsCount={notificationsCount}
            socialDot={socialDot}
          />
        )}
        <Routes>
          <Route path="/about" element={<About />} />
          <Route path="/admin" element={user?.role === "admin" ? <AdminDashboard /> : <Home destinations={destinations} favorites={favorites} toggleFavorite={toggleFavorite} loading={loading} />} />
          <Route path="/become-guide" element={loggedIn ? <BecomeGuide /> : <Login setLoggedIn={setLoggedIn} setUser={setUser} />} />
          <Route path="/guide-dashboard" element={loggedIn ? <GuideSection /> : <Login setLoggedIn={setLoggedIn} setUser={setUser} />} />
          <Route path="/applications" element={loggedIn ? <Applications /> : <Login setLoggedIn={setLoggedIn} setUser={setUser} />} />
          <Route path="/" element={<Home destinations={destinations} favorites={favorites} toggleFavorite={toggleFavorite} loading={loading} />} />
          <Route path="/destination/:id" element={<DestinationPage destinations={destinations} favorites={favorites} toggleFavorite={toggleFavorite} />} />
          <Route path="/login" element={!showSplash ? <Login setLoggedIn={setLoggedIn} setUser={setUser} /> : null} />
          <Route path="/signup" element={<Signup setLoggedIn={setLoggedIn} />} />
          <Route path="/notifications" element={<NotificationPage setNotificationsCount={setNotificationsCount} />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/user/:id" element={<ProfilePage />} />
          <Route path="/favorites" element={<FavoritesPage destinations={destinations} favorites={favorites} toggleFavorite={toggleFavorite} />} />
          <Route path="/requests" element={loggedIn ? <Requests /> : <Login setLoggedIn={setLoggedIn} setUser={setUser} />} />
          <Route path="/social" element={loggedIn ? <SocialPage onSocialDotChange={setSocialDot} /> : <Login setLoggedIn={setLoggedIn} setUser={setUser} />} />
          <Route path="/my-bookings" element={<MyBookings />} />
          <Route path="/guide-booking-requests" element={<GuideBookingRequests />} />
          <Route path="/pending-payments" element={<PendingPayments />} />
        </Routes>
      </div>
    </SocketProvider>
  );
}

export default App;