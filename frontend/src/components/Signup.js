import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import "../assets/css/auth.css";
import { API_URL } from "../services/api";
function Signup() {
  const [form, setForm] = useState({ username: "", email: "", country: "", password: "" });
  const [error, setError] = useState("");
  const [animate, setAnimate] = useState(false);
  const [flying, setFlying] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { setAnimate(true); }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFlying(true);
    setTimeout(() => setFlying(false), 1500);

    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.message || "Signup failed"); return; }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify({
        _id: data._id,
        username: data.username,
        email: data.email,
        country: data.country,
      }));
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
      if (!res.ok) { setError(data.message || "Google signup failed"); return; }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify({
        _id: data._id,
        username: data.username,
        email: data.email,
        country: data.country,
        profile_pic: data.profile_pic,
        role: data.role,
      }));
      navigate("/");
    } catch (err) {
      setError("Google signup failed");
    }
  };

  return (
    <div className="auth-wrapper">
      <div className={`auth-card ${animate ? "slide-in" : ""}`}>
        <h2>Create Account</h2>

        {error && <p className="auth-error">{error}</p>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <input type="text" name="username" value={form.username} onChange={handleChange} placeholder=" " required />
            <label>Username</label>
          </div>

          <div className="input-group">
            <input type="email" name="email" value={form.email} onChange={handleChange} placeholder=" " required />
            <label>Email Address</label>
          </div>

          <div className="input-group row">
            <div className="input-group">
              <input type="password" name="password" value={form.password} onChange={handleChange} placeholder=" " required minLength="6" />
              <label>Password</label>
            </div>

            <div className="input-group">
              <input type="text" name="country" value={form.country} onChange={handleChange} placeholder=" " required />
              <label>Country</label>
            </div>
          </div>

          <button type="submit" className="auth-btn-main">Create Account</button>
        </form>

        <div className="divider"><span>OR</span></div>

        <div className="google-btn-wrap">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError("Google signup failed")}
            theme="filled_black"
            shape="rectangular"
            width="100%"
            text="signup_with"
          />
        </div>

        <p className="auth-switch">
          Already have an account? <span onClick={() => navigate("/login")}>Login</span>
        </p>
      </div>
    </div>
  );
}

export default Signup;