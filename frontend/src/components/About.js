import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../assets/css/about.css';
import ankurPhoto from '../assets/images/ankur.jpg';
import { API_URL } from "../services/api";

const VALUES = [
  {
    icon: '🌍',
    title: 'Authenticity First',
    text: 'We believe the best travel stories come from real connections — not curated tourist traps. Every guide on TravelSphere is vetted, local, and passionate.',
  },
  {
    icon: '🤝',
    title: 'Community-Driven',
    text: 'Travelers and guides shape TravelSphere together. Reviews, ratings, and social posts create a living, breathing travel community.',
  },
  {
    icon: '🔒',
    title: 'Trust & Safety',
    text: 'From verified guide applications to secure payments and real-time admin oversight — safety is baked into every layer of the platform.',
  },
  {
    icon: '💡',
    title: 'Transparent Pricing',
    text: 'No hidden fees. Guides set honest rates, travelers pay what is shown, and our 20% platform fee keeps the lights on — fairly.',
  },
  {
    icon: '📍',
    title: 'Local Knowledge',
    text: 'Guides know their cities the way only a local can. Skip the guidebook and discover the chai stall down the lane that no tourist ever finds.',
  },
  {
    icon: '♻️',
    title: 'Sustainable Travel',
    text: 'Small-group, guide-led travel leaves lighter footprints. We encourage mindful exploration that benefits local economies directly.',
  },
];

const HOW_STEPS = [
  {
    num: '1',
    emoji: '🔍',
    title: 'Discover Destinations',
    text: 'Browse our curated destination library — each page packed with community photos, traveler posts, and local insights sourced from real guides.',
  },
  {
    num: '2',
    emoji: '👤',
    title: 'Find Your Guide',
    text: 'Filter by destination, specialty, price, and rating. Every guide profile shows verified experience, traveler reviews, and live availability.',
  },
  {
    num: '3',
    emoji: '📅',
    title: 'Book & Connect',
    text: 'Send a booking request directly. Chat in real time, negotiate dates, and confirm details — all inside TravelSphere\'s secure messaging system.',
  },
  {
    num: '4',
    emoji: '🌄',
    title: 'Experience & Share',
    text: 'Go on your adventure. After, rate your guide, post your photos, tag the destination, and inspire the next traveler.',
  },
];

const TESTIMONIALS = [
  {
    stars: 5,
    quote: 'Our guide in Varanasi knew every ghat story going back centuries. Nothing we could have found on our own. TravelSphere changed how we travel.',
    avatar: '🧑‍🦱',
    name: 'James & Mia Foster',
    meta: 'Varanasi, India · 2 weeks ago',
  },
  {
    stars: 5,
    quote: 'The booking flow was seamless and our guide responded within minutes. Felt genuinely cared for from first message to the final sunset.',
    avatar: '👩',
    name: 'Fatima Al-Rashid',
    meta: 'Rajasthan, India · 1 month ago',
  },
  {
    stars: 5,
    quote: 'As a guide myself, TravelSphere is the only platform that treats us like professionals. The payment system is fair and transparent.',
    avatar: '🧑',
    name: 'Rohan Desai',
    meta: 'Certified Guide, Goa',
  },
];

/* ── Scroll Reveal Hook ───────────────────────────────────────── */
function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('visible');
        });
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

/* ── Component ────────────────────────────────────────────────── */
export default function About() {
  useScrollReveal();

  // Fix: ensure page always opens at the top
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Fix: keep navbar transparent throughout the entire about page
  // Adds a class to <body> that the CSS uses to override navbar background
  useEffect(() => {
    document.body.classList.add('about-active');
    return () => {
      // Clean up when navigating away — navbar returns to normal
      document.body.classList.remove('about-active');
    };
  }, []);

  return (
    <div className="about-page">

      {/* ── Hero ── */}
      <section className="about-hero">
        <div className="about-hero__bg" />
        <div className="about-hero__grid" />

        <div className="about-hero__content">
          <div className="about-hero__eyebrow">
            <span className="about-hero__eyebrow-dot" />
            Our Story
          </div>

          <h1 className="about-hero__title">
            Travel is better<br />
            with a <em>local</em> friend
          </h1>

          <p className="about-hero__subtitle">
            TravelSphere connects curious travelers with passionate local guides —
            turning destinations into deeply personal journeys.
          </p>

          {/* Launch-day stats — honest but atmospheric */}
          <div className="about-hero__stats">
            <div className="hero-stat">
              <span className="hero-stat__number hero-stat__number--launch">Day<span> One</span></span>
              <span className="hero-stat__label">We just launched</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat__number">&infin;</span>
              <span className="hero-stat__label">Stories waiting</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat__number hero-stat__number--launch">Your<span> first</span></span>
              <span className="hero-stat__label">Adventure starts here</span>
            </div>
          </div>
        </div>

        <div className="about-hero__scroll">
          <div className="about-hero__scroll-line" />
          <span>Scroll</span>
        </div>
      </section>

      {/* ── Mission ── */}
      <section className="about-mission">
        <div className="about-mission__text reveal">
          <p className="about-mission__label">Our Mission</p>
          <h2 className="about-mission__heading">
            Putting the <strong>human</strong> back<br />
            into travel
          </h2>
          <p className="about-mission__body">
            The travel industry spent the last decade optimising for scale — mass tours,
            algorithm-sorted hotels, and one-size-fits-all itineraries. We built TravelSphere
            because we believed something was being lost: the warmth of a person who genuinely
            loves where they live, and wants to share it with you.
          </p>
          <p className="about-mission__body">
            Every feature on our platform exists to serve that goal — from real-time booking
            chats to guide earnings dashboards that put fair compensation front and centre.
          </p>
          <blockquote className="about-mission__quote">
            <p>"The world is a book, and those who do not travel read only one page."</p>
            <cite>— Saint Augustine</cite>
          </blockquote>
        </div>

        <div className="about-mission__visual reveal reveal-delay-2">
          <div className="about-mission__card-stack">
            <div className="mission-card">
              <div className="mission-card__icon">🗺️</div>
              <h3 className="mission-card__title">Curated Destinations</h3>
              <p className="mission-card__text">
                Each destination page is built from guide expertise and traveler posts — not just stock photography.
              </p>
              <span className="mission-card__tag">Growing every day</span>
            </div>
            <div className="mission-card">
              <div className="mission-card__icon">⭐</div>
              <h3 className="mission-card__title">Verified Local Guides</h3>
              <p className="mission-card__text">
                Every guide undergoes an admin review before going live — credentials, experience, and community trust.
              </p>
              <span className="mission-card__tag">Applications open</span>
            </div>
            <div className="mission-card" />
          </div>
        </div>
      </section>

      {/* ── Values ── */}
      <section className="about-values">
        <div className="about-values__inner">
          <div className="about-values__header reveal">
            <span className="section-label">What We Stand For</span>
            <h2 className="section-heading">Six principles that<br />guide everything we build</h2>
          </div>

          <div className="about-values__grid">
            {VALUES.map((v, i) => (
              <div className={`value-card reveal reveal-delay-${(i % 3) + 1}`} key={v.title}>
                <div className="value-card__number">0{i + 1}</div>
                <div className="value-card__icon">{v.icon}</div>
                <h3 className="value-card__title">{v.title}</h3>
                <p className="value-card__text">{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Founder ── */}
      <section className="about-team">
        <div className="about-team__header reveal">
          <span className="section-label">The Builder</span>
          <h2 className="section-heading">One person</h2>
          <p className="about-team__subtitle">
            TravelSphere was designed, built, and shipped solo — every line of code, every pixel.
          </p>
        </div>

        {/* Single founder card — centered */}
        <div className="about-founder">
          <div className="founder-card reveal reveal-delay-1">
            <FounderAvatar photo={ankurPhoto} initials="AR" />
            <div className="founder-card__body">
              <h3 className="founder-card__name">Ankur Rajak</h3>
              <p className="founder-card__role">Founder & Full-Stack Developer</p>
              <p className="founder-card__bio">
                Built TravelSphere as a college project.
                Passionate about connecting travelers with local guides and crafting
                experiences that feel genuinely human — one feature at a time.
              </p>
              <div className="team-card__links">
                <a
    href="https://www.linkedin.com/in/ankur-rajak-089b18395/"
    className="team-link"
    title="LinkedIn"
    target="_blank"
    rel="noopener noreferrer"
  >
    in
  </a>
                <a href="https://github.com/Fake-Zombie"
    className="team-link"
    title="GitHub"
    target="_blank"
    rel="noopener noreferrer">⌥</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="about-how">
        <div className="about-how__inner">
          <div className="about-how__header reveal">
            <span className="section-label">How It Works</span>
            <h2 className="section-heading">From curiosity</h2>
          </div>

          <div className="about-how__steps">
            {HOW_STEPS.map((step, i) => (
              <div className={`how-step reveal reveal-delay-${i + 1}`} key={step.num}>
                <div className="how-step__index">
                  <div className="how-step__circle">{step.num}</div>
                </div>
                <div className="how-step__content">
                  <div className="how-step__emoji">{step.emoji}</div>
                  <h3 className="how-step__title">{step.title}</h3>
                  <p className="how-step__text">{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="about-testimonials">
        <div className="about-testimonials__header reveal">
          <span className="section-label">Traveler Stories</span>
          <h2 className="section-heading">Heard from the road</h2>
        </div>

        <div className="about-testimonials__grid">
          {TESTIMONIALS.map((t, i) => (
            <div className={`testimonial-card reveal reveal-delay-${i + 1}`} key={t.name}>
              <div className="testimonial-card__stars">{'★'.repeat(t.stars)}</div>
              <p className="testimonial-card__quote">"{t.quote}"</p>
              <div className="testimonial-card__author">
                <div className="testimonial-card__avatar">{t.avatar}</div>
                <div>
                  <div className="testimonial-card__name">{t.name}</div>
                  <div className="testimonial-card__meta">{t.meta}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="about-cta">
        <div className="about-cta__bg" />
        <div className="about-cta__inner reveal">
          <h2 className="about-cta__heading">
            Ready to travel<br />
            <em>differently?</em>
          </h2>
          <p className="about-cta__sub">
            Join the first wave of travelers swapping itinerary apps for real conversations
            with people who love where they live.
          </p>
          <div className="about-cta__actions">
            <Link to="/?scroll=explore" className="btn-primary">Explore Destinations →</Link>
            <Link to="/guides" className="btn-secondary">Meet Our Guides</Link>
          </div>
        </div>
      </section>

    </div>
  );
}

/* ── Founder Avatar sub-component ─────────────────────────────── */

function FounderAvatar({ photo, initials }) {
  if (photo) {
    return (
      <div className="founder-card__photo-wrap">
        <img src={photo} alt="Ankur Rajak" className="founder-card__photo" />
      </div>
    );
  }
  return (
    <div className="founder-card__photo-wrap founder-card__photo-wrap--initials">
      <span>{initials}</span>
    </div>
  );
}