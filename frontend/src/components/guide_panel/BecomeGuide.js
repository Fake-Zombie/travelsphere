import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./becomeGuide.css";


function BecomeGuide() {
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    city: "",
    country: "",
    languages: "",
    experience: "",
    specialties: "",
    bio: "",
    pricePerDay: ""
  });

  const [idProofImage, setIdProofImage] = useState(null);
  const [selfieImage, setSelfieImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

const navigate = useNavigate();

// Check if already applied
useEffect(() => {
  const checkApplication = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/guides/my-application", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.ok ? await res.json() : null;
      // Only redirect if application exists AND is not rejected
      if (data && data.status !== "rejected") {
        navigate("/guide-dashboard");
      }
    } catch (err) {
      console.error(err);
    }
  };
  checkApplication();
}, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setMessage("");

  if (!idProofImage || !selfieImage) {
    setMessage("Please upload both ID and Selfie.");
    setLoading(false);
    return;
  }

  const formData = new FormData();

  Object.keys(form).forEach((key) => {
    if (key === "languages" || key === "specialties") {
      formData.append(key, JSON.stringify(form[key].split(",")));
    } else {
      formData.append(key, form[key]);
    }
  });

  formData.append("idProofImage", idProofImage);
  formData.append("selfieImage", selfieImage);

  try {
    const res = await fetch("http://localhost:5000/api/guides/apply", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`
      },
      body: formData
    });

    const data = await res.json();

    if (res.ok) {
      navigate("/applications");
    } else {
      setMessage(data.message || "Submission failed.");
    }
  } catch (err) {
    setMessage("Server error.");
  }

  setLoading(false);
};

  return (
    <div className="auth-wrapper">
      <div className="auth-card guide-card slide-in">
        <h2>Become a Travel Guide</h2>

        {message && <div className="auth-error">{message}</div>}

        <form onSubmit={handleSubmit} className="guide-form-grid">

          <div className="input-group">
            <input name="fullName" placeholder=" " onChange={handleChange} required />
            <label>Full Name</label>
          </div>

          <div className="input-group">
            <input name="phone" placeholder=" " onChange={handleChange} required />
            <label>Phone Number</label>
          </div>

          <div className="input-group">
            <input name="city" placeholder=" " onChange={handleChange} required />
            <label>City</label>
          </div>

          <div className="input-group">
            <input name="country" placeholder=" " onChange={handleChange} required />
            <label>Country</label>
          </div>

          <div className="input-group full-width">
            <input name="languages" placeholder=" " onChange={handleChange} required />
            <label>Languages (comma separated)</label>
          </div>

          <div className="input-group full-width">
            <input name="specialties" placeholder=" " onChange={handleChange} />
            <label>Specialties</label>
          </div>

          <div className="input-group full-width">
            <textarea name="experience" placeholder=" " onChange={handleChange} required />
            <label>Experience</label>
          </div>

          <div className="input-group full-width">
            <textarea name="bio" placeholder=" " onChange={handleChange} required />
            <label>Short Bio</label>
          </div>

          <div className="input-group full-width">
            <input
              type="number"
              name="pricePerDay"
              placeholder=" "
              onChange={handleChange}
              required
            />
            <label>Price Per Day (USD)</label>
          </div>

          {/* ID Upload */}
          <div className={`input-group file-group ${idProofImage ? "active" : ""}`}>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setIdProofImage(e.target.files[0])}
              id="idUpload"
            />
            <label htmlFor="idUpload" className="file-label">
              <div className="file-content">
                <span className="file-title">Upload Government ID</span>
                <span className="file-sub">PNG or JPG • Max 5MB</span>
              </div>
              <div className="file-action">Choose File</div>
            </label>
            <span className="file-name">
              {idProofImage ? idProofImage.name : "No file selected"}
            </span>
          </div>

          {/* Selfie Upload */}
          <div className={`input-group file-group ${selfieImage ? "active" : ""}`}>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setSelfieImage(e.target.files[0])}
              id="selfieUpload"
            />
            <label htmlFor="selfieUpload" className="file-label">
              <div className="file-content">
                <span className="file-title">Upload Selfie</span>
                <span className="file-sub">Clear front-facing photo</span>
              </div>
              <div className="file-action">Choose File</div>
            </label>
            <span className="file-name">
              {selfieImage ? selfieImage.name : "No file selected"}
            </span>
          </div>

          <button className="auth-btn-main" type="submit" disabled={loading}>
            {loading ? "Submitting..." : "Submit Application"}
          </button>

        </form>
      </div>
    </div>
  );
}

export default BecomeGuide;