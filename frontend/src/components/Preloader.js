import React, { useState, useEffect } from 'react';
import '../assets/css/preloader.css';
import { useLocation } from 'react-router-dom';
import { API_URL } from "../services/api";

const Preloader = ({ onComplete }) => {
  const [isSettling, setIsSettling] = useState(false);
  const [showPreloader, setShowPreloader] = useState(true);
  const location = useLocation();

useEffect(() => {
    const isHomePage = location.pathname === '/' || location.pathname === '';
    const preloaderShownThisSession = sessionStorage.getItem('preloaderShown');
    const isPageRefresh = performance.getEntriesByType('navigation')[0]?.type === 'reload';

    if (!isHomePage) {
      onComplete();
      setShowPreloader(false);
      return;
    }

    if (preloaderShownThisSession && !isPageRefresh) {
      onComplete();
      setShowPreloader(false);
      return;
    }

    // Animation timers
    const timer = setTimeout(() => setIsSettling(true), 2600);
    const finishTimer = setTimeout(() => {
      sessionStorage.setItem('preloaderShown', 'true'); // ✅ Set AFTER animation, not before
      onComplete();
      setShowPreloader(false);
    }, 3400);

    return () => {
      clearTimeout(timer);
      clearTimeout(finishTimer);
    };
  }, [onComplete, location.pathname]);

  // Don't render anything if preloader shouldn't show
  if (!showPreloader) {
    return null;
  }

  return (
    <div className={`splash-screen ${isSettling ? 'exit-bg' : ''}`}>
      <div className="splash-container">
        <h1 
          className={`splash-logo ${isSettling ? 'fly-to-nav' : 'glow-in'}`}
          style={!isSettling ? { 
            position: 'absolute', 
            left: '50%', 
            top: '50%', 
            transform: 'translate(-50%, -50%)',
          } : {
            transform: 'translate(0, 0)'
          }}
        >
          TravelSphere
        </h1>
        
        <div className={`loading-bar-wrapper ${isSettling ? 'fade-out' : ''}`}>
          <div className="loading-bar-fill"></div>
        </div>
      </div>
    </div>
  );
};

export default Preloader;