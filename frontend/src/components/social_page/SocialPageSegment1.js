import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getProfilePicUrl } from "../../utils/profilePicUrl";
import "./socialPageFeed.css";
import { API_URL } from "../../services/api";
// ── Render @mentions as clickable spans ──────────────────────────────────────
function renderTextWithMentions(text, navigate) {
  if (!text) return null;
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, i) => {
    if (part.startsWith("@")) {
      const username = part.slice(1);
      return (
        <span
          key={i}
          className="mention-tag"
          onClick={async (e) => {
            e.stopPropagation();
            const res = await fetch(`/api/auth/user/username/${username}`);
            const data = await res.json();
            if (data._id) navigate(`/user/${data._id}`);
          }}
        >
          {part}
        </span>
      );
    }
    return part;
  });
}

// ── Comment Drawer ───────────────────────────────────────────────────────────
function CommentDrawer({
  post, storedUser, token, navigate,
  onClose, onCommentAdded, onCommentDeleted, onCommentLiked,
}) {
  const [commentText, setCommentText] = useState("");
  const [mentionUsers, setMentionUsers] = useState([]);
  const [showMentionDrop, setShowMentionDrop] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const drawerRef = useRef(null);
  const dragStartY = useRef(0);
  const dragY = useRef(0);
  const isDragging = useRef(false);
  const draggedClose = useRef(false);
  const closeBtnRef = useRef(null);

  const myId = storedUser?._id;
  const isAdmin = storedUser?.role === "admin";
  const myPic = getProfilePicUrl(storedUser?.profile_pic);
  const myLetter = storedUser?.username?.charAt(0).toUpperCase() || "U";

  // ── Lock body scroll while drawer is open ──────────────────────────────
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // ── Focus input on open ────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, []);

  // ── Scroll list to bottom on new comment ──────────────────────────────
  useEffect(() => {
    if (listRef.current)
      listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [post.comments?.length]);

  // ── Native touch handlers (non-passive so preventDefault works) ────────
  useEffect(() => {
    if (window.innerWidth > 768) return;
    const drawer = drawerRef.current;
    const backdrop = drawer?.parentElement;
    const list = listRef.current;
    if (!drawer || !backdrop || !list) return;

    const onTouchStart = (e) => {
      // If touch starts inside the list, let the list handle it natively
      if (list.contains(e.target)) {
        isDragging.current = false;
        return;
      }
      dragStartY.current = e.touches[0].clientY;
      isDragging.current = true;
    };

    const onTouchMove = (e) => {
      // Only intercept if we started a drag outside the list
      if (!isDragging.current) return;
      e.preventDefault();
      const delta = e.touches[0].clientY - dragStartY.current;
      if (delta > 0) {
        dragY.current = delta;
        drawer.style.transition = "none";
        drawer.style.transform = `translateY(${delta}px)`;
      }
    };

    const onTouchEnd = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
if (dragY.current > 130) {
        inputRef.current?.blur();
        drawer.style.transition = "transform 0.25s cubic-bezier(0.32,0.72,0,1)";
        drawer.style.transform  = `translateY(100%)`;
        setTimeout(() => closeBtnRef.current?.click(), 0);
      } else {
        drawer.style.transition = "transform 0.25s cubic-bezier(0.32,0.72,0,1)";
        drawer.style.transform = `translateY(0)`;
        dragY.current = 0;
      }
    };

    // Only block touchmove on the backdrop (the dim area outside the drawer)
    const onBackdropTouchMove = (e) => {
      if (!drawer.contains(e.target)) e.preventDefault();
    };

    drawer.addEventListener("touchstart", onTouchStart, { passive: true });
    drawer.addEventListener("touchmove", onTouchMove, { passive: false });
    drawer.addEventListener("touchend", onTouchEnd, { passive: true });
    backdrop.addEventListener("touchmove", onBackdropTouchMove, { passive: false });

    return () => {
      drawer.removeEventListener("touchstart", onTouchStart);
      drawer.removeEventListener("touchmove", onTouchMove);
      drawer.removeEventListener("touchend", onTouchEnd);
      backdrop.removeEventListener("touchmove", onBackdropTouchMove);
    };
  }, [onClose]);

  const handleBackdropClick = (e) => {
    if (draggedClose.current) { draggedClose.current = false; return; }
    if (e.target === e.currentTarget) onClose();
  };

  // ── @mention handling ──────────────────────────────────────────────────
  const handleInput = (e) => {
    const val = e.target.value;
    setCommentText(val);
    const match = val.match(/@(\w*)$/);
    if (match) {
      const q = match[1];
      setShowMentionDrop(true);
      if (q.length > 0) {
        fetch(`/api/auth/search?q=${q}`)
          .then((r) => r.json())
          .then(setMentionUsers);
      } else {
        setMentionUsers([]);
      }
    } else {
      setShowMentionDrop(false);
      setMentionUsers([]);
    }
  };

  const insertMention = (username) => {
    setCommentText(commentText.replace(/@(\w*)$/, `@${username} `));
    setShowMentionDrop(false);
    setMentionUsers([]);
    inputRef.current?.focus();
  };

  // ── Submit comment ─────────────────────────────────────────────────────
  const submitComment = async () => {
    const text = commentText.trim();
    if (!text) return;
    try {
      const res = await fetch(
        `${API_URL}/api/posts/${post._id}/comment`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        }
      );
      const newComment = await res.json();
      if (res.ok) { onCommentAdded(post._id, newComment); setCommentText(""); }
    } catch (err) { console.error(err); }
  };

  // ── Like comment ───────────────────────────────────────────────────────
  const handleCommentLike = async (commentId) => {
    try {
      const res = await fetch(
        `${API_URL}/api/posts/${post._id}/comment/${commentId}/like`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (res.ok) onCommentLiked(post._id, commentId, data);
    } catch (err) { console.error(err); }
  };

  // ── Delete comment ─────────────────────────────────────────────────────
  const handleCommentDelete = async (commentId) => {
    try {
      const res = await fetch(
        `${API_URL}/api/posts/${post._id}/comment/${commentId}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) onCommentDeleted(post._id, commentId);
    } catch (err) { console.error(err); }
  };

  return (
    <div className="drawer-backdrop" onClick={handleBackdropClick}>
      <div className="comment-drawer" ref={drawerRef}>

        <div className="drawer-handle" />

        <div className="drawer-header">
          <span>Comments</span>
          <button className="drawer-close" ref={closeBtnRef} onClick={onClose}>✕</button>
        </div>

        <div className="drawer-list" ref={listRef}>
          {(!post.comments || post.comments.length === 0) && (
            <p className="drawer-empty">No comments yet. Be the first.</p>
          )}
          {post.comments?.map((c) => {
            const pic = getProfilePicUrl(c.user?.profile_pic);
            const letter = c.user?.username?.charAt(0).toUpperCase() || "U";
            const isLiked = c.likes?.includes(myId);
            const isCommentOwner = c.user?._id === myId || c.user === myId;
            const isPostOwner = post.author?._id === myId;
            const canDelete = isCommentOwner || isPostOwner || isAdmin;

            return (
              <div key={c._id} className="drawer-comment">
                <div
                  className="drawer-comment-avatar"
                  onClick={() => { onClose(); navigate(`/user/${c.user?._id}`); }}
                >
                  {pic ? <img src={pic} alt="" /> : <span>{letter}</span>}
                </div>
                <div className="drawer-comment-body">
                  <div className="drawer-comment-top">
                    <span
                      className="drawer-comment-author"
                      onClick={() => { onClose(); navigate(`/user/${c.user?._id}`); }}
                    >
                      {c.user?.username}
                    </span>
                    <span className="drawer-comment-time">
                      {new Date(c.createdAt).toLocaleDateString("en-US", {
                        month: "short", day: "numeric",
                      })}
                    </span>
                  </div>
                  <p className="drawer-comment-text">
                    {renderTextWithMentions(c.text, navigate)}
                  </p>
                  <div className="drawer-comment-actions">
                    <button
                      className={`drawer-comment-like ${isLiked ? "liked" : ""}`}
                      onClick={() => handleCommentLike(c._id)}
                    >
                      {isLiked ? "♥" : "♡"}
                      {c.likes?.length > 0 && (
                        <span className="drawer-comment-like-count">{c.likes.length}</span>
                      )}
                    </button>
                    {canDelete && (
                      <button
                        className="drawer-comment-delete"
                        onClick={() => handleCommentDelete(c._id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="drawer-input-row">
          <div className="drawer-input-avatar">
            {myPic ? <img src={myPic} alt="" /> : <span>{myLetter}</span>}
          </div>
          <div className="drawer-input-wrap">
            {showMentionDrop && mentionUsers.length > 0 && (
              <div className="drawer-mention-dropdown">
                {mentionUsers.map((u) => (
                  <div
                    key={u._id}
                    className="mention-option"
                    onMouseDown={(e) => { e.preventDefault(); insertMention(u.username); }}
                  >
                    {u.profile_pic
                      ? <img src={getProfilePicUrl(u.profile_pic)} alt="" style={{ width: 22, height: 22, borderRadius: "50%", marginRight: 6 }} />
                      : <span style={{ marginRight: 6 }}>👤</span>}
                    @{u.username}
                  </div>
                ))}
              </div>
            )}
            <input
              ref={inputRef}
              className="drawer-input"
              placeholder="Use @ to mention"
              value={commentText}
              onChange={handleInput}
              onKeyDown={(e) => e.key === "Enter" && submitComment()}
            />
          </div>
          <button
            className="drawer-submit"
            onClick={submitComment}
            disabled={!commentText.trim()}
          >
            Post
          </button>
        </div>

      </div>
    </div>
  );
}

// ── Main Feed ────────────────────────────────────────────────────────────────
function SocialFeed() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const storedUser = JSON.parse(localStorage.getItem("user") || "null");

  const [activeTab, setActiveTab] = useState("following");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePost, setActivePost] = useState(null);

  const endpoints = {
    following: `${API_URL}/api/posts/feed`,
    trending: `${API_URL}/api/posts/trending`,
    global: `${API_URL}/api/posts/global`,
  };

  const fetchPosts = async (tab) => {
    setLoading(true);
    setPosts([]);
    try {
      const res = await fetch(endpoints[tab], { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setPosts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPosts(activeTab); }, [activeTab]);

  // Keep drawer in sync with posts state
  useEffect(() => {
    if (activePost) {
      const updated = posts.find((p) => p._id === activePost._id);
      if (updated) setActivePost(updated);
    }
  }, [posts]);

  // ── Post like ─────────────────────────────────────────────────────────
  const handleLike = async (postId) => {
    try {
      const res = await fetch(`${API_URL}/api/posts/${postId}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setPosts((prev) =>
          prev.map((p) =>
            p._id === postId
              ? {
                ...p,
                likes: data.liked
                  ? [...(p.likes || []), storedUser._id]
                  : (p.likes || []).filter((id) => id !== storedUser._id),
              }
              : p
          )
        );
      }
    } catch (err) { console.error(err); }
  };

  // ── Comment handlers ──────────────────────────────────────────────────
  const handleCommentAdded = (postId, newComment) => {
    setPosts((prev) =>
      prev.map((p) =>
        p._id === postId
          ? { ...p, comments: [...(p.comments || []), newComment] }
          : p
      )
    );
  };

  const handleCommentDeleted = (postId, commentId) => {
    setPosts((prev) =>
      prev.map((p) =>
        p._id === postId
          ? { ...p, comments: p.comments.filter((c) => c._id !== commentId) }
          : p
      )
    );
  };

  const handleCommentLiked = (postId, commentId, data) => {
    setPosts((prev) =>
      prev.map((p) =>
        p._id === postId
          ? {
            ...p,
            comments: p.comments.map((c) =>
              c._id === commentId
                ? {
                  ...c,
                  likes: data.liked
                    ? [...(c.likes || []), storedUser._id]
                    : (c.likes || []).filter((id) => id !== storedUser._id),
                }
                : c
            ),
          }
          : p
      )
    );
  };

  const emptyMessages = {
    following: "No posts yet. Add companions to see their posts.",
    trending: "No trending posts right now.",
    global: "No posts yet. Be the first to post from your profile!",
  };

  return (
    <>
      <div className="seg-root">

        <div className="feed-selector">
          <select
            className="feed-dropdown"
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
          >
            <option value="following">Following</option>
            <option value="trending">🔥 Trending</option>
            <option value="global">🌍 Global</option>
          </select>
        </div>

        {loading ? (
          <p className="seg-empty">Loading...</p>
        ) : posts.length === 0 ? (
          <p className="seg-empty">{emptyMessages[activeTab]}</p>
        ) : (
          posts.map((post) => {
            const liked = post.likes?.includes(storedUser?._id);
            const authorPic = getProfilePicUrl(post.author?.profile_pic);
            const authorLetter = post.author?.username?.charAt(0).toUpperCase() || "U";

            return (
              <div key={post._id} className="post-card">

                <div className="post-header">
                  <div className="post-avatar" onClick={() => navigate(`/user/${post.author?._id}`)}>
                    {authorPic
                      ? <img src={authorPic} alt="" className="post-avatar-img" />
                      : <span>{authorLetter}</span>}
                  </div>
                  <div className="post-meta">
                    <span className="post-author" onClick={() => navigate(`/user/${post.author?._id}`)}>
                      {post.author?.username}
                    </span>
                    {post.author?.role && post.author.role !== "user" && (
                      <span className="post-role-badge">{post.author.role}</span>
                    )}
                    <span className="post-date">
                      {new Date(post.createdAt).toLocaleDateString("en-US", {
                        month: "short", day: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                {post.destinationTag && (
                  <span
                    className="post-dest-tag"
                    onClick={() => navigate(`/destination/${post.destinationTag._id}`)}
                  >
                    📍 {post.destinationTag.name}
                  </span>
                )}

                {post.text && (
                  <p className="post-text">
                    {renderTextWithMentions(post.text, navigate)}
                  </p>
                )}

                {post.image && (
                  <div className="post-img-wrap">
                    <img
                     src={post.image}
                      alt="post"
                      className="post-img"
                    />
                  </div>
                )}

                {post.hashtags?.length > 0 && (
                  <div className="post-hashtags">
                    {post.hashtags.map((tag) => (
                      <span key={tag} className="post-hashtag">#{tag}</span>
                    ))}
                  </div>
                )}

                <div className="post-footer">
                  <div className="post-footer-actions">
                    <button
                      className={`post-like-btn ${liked ? "liked" : ""}`}
                      onClick={() => handleLike(post._id)}
                    >
                      <svg className="post-like-icon" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                      <span className="post-like-count">{post.likes?.length || 0}</span>
                    </button>

                    <button
                      className="post-comment-btn"
                      onClick={() => setActivePost(post)}
                    >
                      <svg className="post-comment-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      <span className="post-comment-count">{post.comments?.length || 0}</span>
                    </button>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {activePost && (
        <CommentDrawer
          key={activePost._id}
          post={activePost}
          storedUser={storedUser}
          token={token}
          navigate={navigate}
          onClose={() => setActivePost(null)}
          onCommentAdded={handleCommentAdded}
          onCommentDeleted={handleCommentDeleted}
          onCommentLiked={handleCommentLiked}
        />
      )}
    </>
  );
}

export default SocialFeed;