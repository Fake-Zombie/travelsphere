import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import "../assets/css/auth.css";
import { API_URL } from "../services/api";
function Login({ setLoggedIn, setUser }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [animate, setAnimate] = useState(false);
  const [flying, setFlying] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { setAnimate(true); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFlying(true);
    setTimeout(() => setFlying(false), 1500);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.message || "Login failed"); return; }

      localStorage.setItem("token", data.token);
      const userData = {
        _id: data._id,
        username: data.username,
        email: data.email,
        country: data.country,
        profile_pic: data.profile_pic,
        role: data.role,
      };
      localStorage.setItem("user", JSON.stringify(userData));
      setLoggedIn(true);
      setUser(userData);
      navigate("/");
    } catch (err) {
      setError("Something went wrong");
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.message || "Google login failed"); return; }

      localStorage.setItem("token", data.token);
      const userData = {
        _id: data._id,
        username: data.username,
        email: data.email,
        country: data.country,
        profile_pic: data.profile_pic,
        role: data.role,
      };
      localStorage.setItem("user", JSON.stringify(userData));
      setLoggedIn(true);
      setUser(userData);
      navigate("/");
    } catch (err) {
      setError("Google login failed");
    }
  };

  return (
    <div className="auth-wrapper">
      <div className={`auth-card ${animate ? "slide-in" : ""}`}>
        <h2>Welcome Back</h2>

        {error && <p className="auth-error">{error}</p>}

        <form onSubmit={handleSubmit} className="auth-form" autoComplete="off">
          <div className="input-group">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder=" "
              required
              autoComplete="new-password"
            />
            <label>Username or Email</label>
          </div>

          <div className="input-group">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder=" "
              required
              autoComplete="new-password"
            />
            <label>Password</label>
          </div>

          <button type="submit" className="auth-btn-main">Login</button>
        </form>

        <div className="divider"><span>OR</span></div>

        <div className="google-btn-wrap">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError("Google login failed")}
            theme="filled_black"
            shape="rectangular"
            width="100%"
            text="continue_with"
          />
        </div>

        <p className="auth-switch">
          Don't have an account? <span onClick={() => navigate("/signup")}>Signup</span>
        </p>
      </div>
    </div>
  );
}

export default Login;