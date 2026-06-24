import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getProfilePicUrl } from '../utils/profilePicUrl';
import "../assets/css/profilePage.css";
import Cropper from "react-easy-crop";

function ProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const storedUser = JSON.parse(localStorage.getItem("user") || "null");
  const isOwnProfile = !id;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");
  const [posts, setPosts] = useState([]);
  const [companionStatus, setCompanionStatus] = useState("none");
  const [isSender, setIsSender] = useState(false);
  const [companionsCount, setCompanionsCount] = useState(0);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [editingBio, setEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState("");
  const [companionLoading, setCompanionLoading] = useState(false);
  const fileInputRef = useRef();
  const token = localStorage.getItem("token");

  const profileId = isOwnProfile ? storedUser?._id : id;



// Post system
const [postText, setPostText] = useState("");
const [postTag, setPostTag] = useState("");
const [postHashtags, setPostHashtags] = useState([]);
const [destinations, setDestinations] = useState([]);
const [submitting, setSubmitting] = useState(false);
const [showTagDropdown, setShowTagDropdown] = useState(false);
const [tagSearch, setTagSearch] = useState("");
const fileInputRef2 = useRef(); // separate from profile pic ref

// crop state
const [rawImageSrc, setRawImageSrc] = useState(null);
const [croppedBlob, setCroppedBlob] = useState(null);
const [croppedPreviewUrl, setCroppedPreviewUrl] = useState(null);
const [crop, setCrop] = useState({ x: 0, y: 0 });
const [zoom, setZoom] = useState(1);
const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
const [aspect, setAspect] = useState(1);
const [showCropper, setShowCropper] = useState(false);

// hashtag input
const [hashtagInput, setHashtagInput] = useState("");

//post handlers
const onCropComplete = useCallback((_, areaPixels) => {
  setCroppedAreaPixels(areaPixels);
}, []);

async function getCroppedImg(imageSrc, croppedAreaPixels) {
  const image = await new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = imageSrc;
  });
  const canvas = document.createElement("canvas");
  canvas.width = croppedAreaPixels.width;
  canvas.height = croppedAreaPixels.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height, 0, 0, croppedAreaPixels.width, croppedAreaPixels.height);
  return new Promise((res) => canvas.toBlob((blob) => res(blob), "image/jpeg", 0.92));
}

const handleFileChange2 = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    setRawImageSrc(reader.result);
    setShowCropper(true);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };
  reader.readAsDataURL(file);
  e.target.value = "";
};

const handleCropConfirm = async () => {
  try {
    const blob = await getCroppedImg(rawImageSrc, croppedAreaPixels);
    setCroppedBlob(blob);
    setCroppedPreviewUrl(URL.createObjectURL(blob));
    setShowCropper(false);
    setRawImageSrc(null);
  } catch (err) { console.error(err); }
};

const handleCropCancel = () => {
  setShowCropper(false);
  setRawImageSrc(null);
  if (fileInputRef2.current) fileInputRef2.current.value = "";
};

const clearImage = () => {
  setCroppedBlob(null);
  if (croppedPreviewUrl) URL.revokeObjectURL(croppedPreviewUrl);
  setCroppedPreviewUrl(null);
};

const handleAddHashtag = (e) => {
  if ((e.key === "Enter" || e.key === ",") && hashtagInput.trim()) {
    e.preventDefault();
    const tag = hashtagInput.trim().replace(/^#/, "").toLowerCase();
    if (tag && !postHashtags.includes(tag)) {
      setPostHashtags((prev) => [...prev, tag]);
    }
    setHashtagInput("");
  }
};

const handlePost = async () => {
  if (!postText.trim() && !croppedBlob) return;
  setSubmitting(true);
  const formData = new FormData();
  if (postText) formData.append("text", postText);
  if (croppedBlob) formData.append("image", croppedBlob, "post.jpg");
  if (postTag) formData.append("destinationTag", postTag);
  if (postHashtags.length) formData.append("hashtags", JSON.stringify(postHashtags));

  try {
    const res = await fetch("http://localhost:5000/api/posts", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (res.ok) {
      setPosts((prev) => [data, ...prev]);
      setPostText("");
      clearImage();
      setPostTag("");
      setTagSearch("");
      setPostHashtags([]);
      setHashtagInput("");
    }
  } catch (err) { console.error(err); }
  finally { setSubmitting(false); }
};
//post handlers close

//delete post
const handleDeletePost = async (postId) => {
  const confirmDelete = window.confirm("Delete this post?");
  if (!confirmDelete) return;

  try {
    const res = await fetch(`http://localhost:5000/api/posts/${postId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (res.ok) {
      setPosts(prev => prev.filter(p => p._id !== postId));
    }
  } catch (err) {
    console.error(err);
  }
};

//fetch destinations
useEffect(() => {
  fetch("http://localhost:5000/api/destinations")
    .then(r => r.json())
    .then(data => setDestinations(Array.isArray(data) ? data : []))
    .catch(() => {});
}, []);


  useEffect(() => {
    if (isOwnProfile) {
      if (!storedUser) { navigate("/login"); return; }
      setProfile(storedUser);
      setBioInput(storedUser.bio || "");
      setLoading(false);
    } else {
      fetch(`http://localhost:5000/api/auth/user/${id}`)
        .then(r => r.json())
        .then(data => { setProfile(data); setBioInput(data.bio || ""); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [id]);

  // Fetch posts
  useEffect(() => {
    if (!profileId) return;
    fetch(`http://localhost:5000/api/posts/user/${profileId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(r => r.json())
      .then(data => setPosts(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [profileId]);

  // Fetch companion status (public profiles only)
  useEffect(() => {
    if (isOwnProfile || !token || !id) return;
    fetch(`http://localhost:5000/api/companions/status/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => { setCompanionStatus(data.status); setIsSender(data.isSender); })
      .catch(() => {});
  }, [id]);

  // Fetch companions count
  useEffect(() => {
    if (!token) return;
    fetch(`http://localhost:5000/api/companions`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => setCompanionsCount(Array.isArray(data) ? data.length : 0))
      .catch(() => {});
  }, []);

  // Fetch favorites count
  useEffect(() => {
    if (!token) return;
    fetch(`http://localhost:5000/api/favorites`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => setFavoritesCount(Array.isArray(data) ? data.length : 0))
      .catch(() => {});
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("profile_pic", file);
    try {
      const res = await fetch("http://localhost:5000/api/auth/upload-profile-pic", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        const updated = { ...storedUser, profile_pic: data.profile_pic };
        localStorage.setItem("user", JSON.stringify(updated));
        setProfile(updated);
      }
    } catch (err) { console.error(err); }
    finally { setUploading(false); }
  };

  const handleSaveBio = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/auth/update-bio", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ bio: bioInput })
      });
      const data = await res.json();
      if (res.ok) {
        const updated = { ...storedUser, bio: bioInput };
        localStorage.setItem("user", JSON.stringify(updated));
        setProfile(updated);
        setEditingBio(false);
      }
    } catch (err) { console.error(err); }
  };

  const handleCompanionAction = async (action) => {
    setCompanionLoading(true);
    try {
      let res;
      if (action === "request") {
        res = await fetch(`http://localhost:5000/api/companions/request/${id}`, {
          method: "POST", headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) { setCompanionStatus("pending"); setIsSender(true); }
} else if (action === "cancel") {
  res = await fetch(`http://localhost:5000/api/companions/remove/${id}`, {
    method: "DELETE", headers: { Authorization: `Bearer ${token}` }
  });
  if (res.ok) { setCompanionStatus("none"); }
} else if (action === "remove") {
  res = await fetch(`http://localhost:5000/api/companions/remove/${id}`, {
    method: "DELETE", headers: { Authorization: `Bearer ${token}` }
  });
  if (res.ok) { setCompanionStatus("none"); }
} else if (action === "accept") {
        res = await fetch(`http://localhost:5000/api/companions/accept/${id}`, {
          method: "POST", headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) { setCompanionStatus("accepted"); }
      } else if (action === "reject") {
        res = await fetch(`http://localhost:5000/api/companions/reject/${id}`, {
          method: "POST", headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) { setCompanionStatus("none"); }
      }
    } catch (err) { console.error(err); }
    finally { setCompanionLoading(false); }
  };

  const renderCompanionButton = () => {
    if (isOwnProfile || !token) return null;
    if (profile?.role === "guide") return null;

    if (companionStatus === "none") return (
      <button className="pf-companion-btn" onClick={() => handleCompanionAction("request")} disabled={companionLoading}>
        + Add Companion
      </button>
    );
    // AFTER
if (companionStatus === "pending" && isSender) return (
  <button className="pf-companion-btn ghost" onClick={() => handleCompanionAction("cancel")} disabled={companionLoading}>
    Cancel Request
  </button>
);
    if (companionStatus === "pending" && !isSender) return (
      <div className="pf-companion-actions">
        <button className="pf-companion-btn" onClick={() => handleCompanionAction("accept")} disabled={companionLoading}>Accept</button>
        <button className="pf-companion-btn ghost" onClick={() => handleCompanionAction("reject")} disabled={companionLoading}>Decline</button>
      </div>
    );
    if (companionStatus === "accepted") return (
      <button className="pf-companion-btn ghost" onClick={() => handleCompanionAction("remove")} disabled={companionLoading}>
        ✓ Companions
      </button>
    );
  };

  if (loading) return <div className="pf-center"><p className="pf-muted">Loading...</p></div>;
  if (!profile) return (
    <div className="pf-center">
      <p className="pf-muted">User not found.</p>
      <button className="pf-back-btn" onClick={() => navigate(-1)}>← Go back</button>
    </div>
  );

  const avatarLetter = profile.username?.charAt(0).toUpperCase() || "U";
  const joined = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;
  const picUrl = getProfilePicUrl(profile.profile_pic);

  return (
    <div className="pf-root">

      {/* COVER */}
      <div className="pf-cover">
        <div className="pf-cover-gradient" />
      </div>

      <div className="pf-body">

        {/* HEADER */}
        <div className="pf-header">
          <div className="pf-avatar-wrap">
            {picUrl ? (
              <img src={picUrl} alt={profile.username} className="pf-avatar-img" />
            ) : (
              <div className="pf-avatar-fallback">{avatarLetter}</div>
            )}
            {isOwnProfile && (
              <button className="pf-avatar-edit" onClick={() => fileInputRef.current.click()} title="Change photo">
                {uploading ? "…" : "✎"}
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleUpload} />
          </div>

          <div className="pf-header-info">
            <div className="pf-identity">
              <h1 className="pf-name">{profile.username}</h1>
              {profile.role && profile.role !== "user" && (
                <span className="pf-badge">{profile.role}</span>
              )}
            </div>

            <div className="pf-meta">
              <span>📍 {profile.country}</span>
              {joined && <span>🗓 Joined {joined}</span>}
            </div>

            <div className="pf-stats">
              <div className="pf-stat">
                <span className="pf-stat-val">{posts.length}</span>
                <span className="pf-stat-label">Posts</span>
              </div>
              <div className="pf-stat-divider" />
              <div className="pf-stat">
                <span className="pf-stat-val">{companionsCount}</span>
                <span className="pf-stat-label">Companions</span>
              </div>
              <div className="pf-stat-divider" />
              <div className="pf-stat">
                <span className="pf-stat-val">{favoritesCount}</span>
                <span className="pf-stat-label">Favorites</span>
              </div>
            </div>
          </div>

          <div className="pf-header-actions">
            {renderCompanionButton()}
            {!isOwnProfile && (
              <button className="pf-back-btn" onClick={() => navigate(-1)}>← Back</button>
            )}
          </div>
        </div>

        {/* BIO */}
        <div className="pf-bio-section">
          {isOwnProfile ? (
            editingBio ? (
              <div className="pf-bio-edit">
                <textarea
                  className="pf-bio-input"
                  value={bioInput}
                  onChange={e => setBioInput(e.target.value)}
                  maxLength={200}
                  placeholder="Write something about yourself..."
                  rows={3}
                />
                <div className="pf-bio-edit-actions">
                  <span className="pf-bio-count">{bioInput.length}/200</span>
                  <button className="pf-bio-save" onClick={handleSaveBio}>Save</button>
                  <button className="pf-bio-cancel" onClick={() => { setEditingBio(false); setBioInput(profile.bio || ""); }}>Cancel</button>
                </div>
              </div>
            ) : (
              <p className="pf-bio" onClick={() => setEditingBio(true)}>
                {profile.bio || <span className="pf-bio-placeholder">+ Add a bio</span>}
              </p>
            )
          ) : (
            profile.bio && <p className="pf-bio">{profile.bio}</p>
          )}
        </div>

        {/* TABS */}
        <div className="pf-tabs">
          <button className={`pf-tab ${activeTab === "posts" ? "active" : ""}`} onClick={() => setActiveTab("posts")}>Posts</button>
          <button className={`pf-tab ${activeTab === "favorites" ? "active" : ""}`} onClick={() => setActiveTab("favorites")}>Favorites</button>
        </div>

        {/* POSTS TAB */}
        {activeTab === "posts" && (
  <div className="pf-posts-section">

    {/* ── CROP MODAL ── */}
    {showCropper && (
      <div className="crop-overlay">
        <div className="crop-aspect-btns">
          {[{ label: "1:1", value: 1 }, { label: "4:5", value: 4/5 }, { label: "1.91:1", value: 1.91 }].map((opt) => (
            <button
              key={opt.label}
              className={`crop-aspect-btn ${aspect === opt.value ? "active" : ""}`}
              onClick={() => setAspect(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="crop-container">
          <Cropper
            image={rawImageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <div className="crop-actions">
          <button className="crop-cancel" onClick={handleCropCancel}>Cancel</button>
          <button className="crop-confirm" onClick={handleCropConfirm}>Use Photo</button>
        </div>
      </div>
    )}

    {/* ── CREATE POST CARD (own profile only) ── */}
    {isOwnProfile && (
      <div className="create-post">
        <div className="create-post-top">
          <div className="cp-avatar">
            {picUrl
              ? <img src={picUrl} alt="" className="cp-avatar-img" />
              : <span>{avatarLetter}</span>}
          </div>
          <textarea
            className="cp-input"
            placeholder="Share a travel thought..."
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            rows={2}
          />
        </div>

        {/* hashtag input */}
        <div className="cp-hashtag-wrap">
          <input
            className="cp-hashtag-input"
            placeholder="Add hashtags (press Enter or ,)"
            value={hashtagInput}
            onChange={(e) => setHashtagInput(e.target.value)}
            onKeyDown={handleAddHashtag}
          />
          {postHashtags.length > 0 && (
            <div className="cp-hashtag-list">
              {postHashtags.map((tag) => (
                <span key={tag} className="cp-hashtag-pill">
                  #{tag}
                  <button onClick={() => setPostHashtags((prev) => prev.filter((t) => t !== tag))}>×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* previews */}
        {(croppedPreviewUrl || postTag) && (
          <div className="cp-previews">
            {postTag && destinations.find(d => d._id === postTag) && (
              <span className="cp-tag-preview">
                📍 {destinations.find(d => d._id === postTag).name}
                <button onClick={() => { setPostTag(""); setTagSearch(""); }}>×</button>
              </span>
            )}
            {croppedPreviewUrl && (
              <span className="cp-tag-preview">
                🖼 Photo selected
                <button onClick={clearImage}>×</button>
              </span>
            )}
          </div>
        )}

        <div className="cp-actions">
          <button className="cp-action-btn" onClick={() => fileInputRef2.current.click()}>
            + Image
          </button>
          <input
            ref={fileInputRef2}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFileChange2}
          />

          <div className="cp-tag-wrap">
            <button className="cp-action-btn" onClick={() => setShowTagDropdown(v => !v)}>
              + Destination
            </button>
            {showTagDropdown && (
              <div className="cp-tag-dropdown">
                <input
                  className="cp-tag-search"
                  placeholder="Search destination..."
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  autoFocus
                />
                {destinations
                  .filter(d => d.name.toLowerCase().includes(tagSearch.toLowerCase()))
                  .slice(0, 5)
                  .map(d => (
                    <div key={d._id} className="cp-tag-option" onClick={() => { setPostTag(d._id); setTagSearch(d.name); setShowTagDropdown(false); }}>
                      {d.name}
                    </div>
                  ))}
              </div>
            )}
          </div>

          <button
            className="cp-submit"
            onClick={handlePost}
            disabled={submitting || (!postText.trim() && !croppedBlob)}
          >
            {submitting ? "Posting..." : "Post"}
          </button>
        </div>
      </div>
    )}

    {/* ── POSTS GRID ── */}
    <div className="pf-posts-grid">
      {posts.length === 0 ? (
        <p className="pf-empty">No posts yet.</p>
      ) : (
        posts.map(post => (
          <div key={post._id} className="pf-post-card">
            {isOwnProfile && (
  <button
    className="pf-post-delete"
    onClick={() => handleDeletePost(post._id)}
  >
    🗑
  </button>
)}
            {post.image && (
              <img
                src={post.image}
                alt="post"
                className="pf-post-img"
              />
            )}
            <div className="pf-post-body">
              {post.destinationTag && (
                <span className="pf-post-tag" onClick={() => navigate(`/destination/${post.destinationTag._id}`)}>
                  📍 {post.destinationTag.name}
                </span>
              )}
              {post.text && <p className="pf-post-text">{post.text}</p>}
              {post.hashtags?.length > 0 && (
                <div className="pf-post-hashtags">
                  {post.hashtags.map(tag => (
                    <span key={tag} className="pf-post-hashtag">#{tag}</span>
                  ))}
                </div>
              )}
              <div className="pf-post-footer">
                <span className="pf-post-likes">♥ {post.likes?.length || 0}</span>
                <span className="pf-post-comments">💬 {post.comments?.length || 0}</span>
                <span className="pf-post-date">
                  {new Date(post.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  </div>
)}

        {/* FAVORITES TAB */}
        {activeTab === "favorites" && (
          <div className="pf-favorites-grid">
            <p className="pf-empty">Favorites visible on your favorites page.</p>
          </div>
        )}

      </div>
    </div>
  );
}

export default ProfilePage;