import React, { useState, useEffect } from "react";
import Modal from "../modal/Modal";
import "./userManagement.css";

// ── Avatar initials helper ──────────────────────────────────────────────────
function Avatar({ name = "", role = "user" }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className={`um-avatar um-avatar--${role}`}>
      {initials || "?"}
    </div>
  );
}

// ── Section wrapper with toggle ─────────────────────────────────────────────
function Section({ title, count, accent, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="um-section">
      <button
        className="um-section-header"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="um-section-title" style={{ color: accent }}>
          {title}
        </span>
        <span className="um-section-meta">
          <span className="um-count">{count}</span>
          <span className={`um-chevron ${open ? "um-chevron--open" : ""}`}>›</span>
        </span>
      </button>
      {open && <div className="um-section-body">{children}</div>}
    </div>
  );
}

// ── Search bar ──────────────────────────────────────────────────────────────
function SearchBar({ value, onChange, placeholder }) {
  return (
    <div className="um-search">
      <span className="um-search-icon">⌕</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button className="um-search-clear" onClick={() => onChange("")}>
          ×
        </button>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
function UserManagement() {
  const [users, setUsers] = useState([]);
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    isOpen: false, title: "", message: "", onConfirm: null, type: "default",
  });

  // Search
  const [userSearch, setUserSearch] = useState("");
  const [guideSearch, setGuideSearch] = useState("");
  const [adminSearch, setAdminSearch] = useState("");

  // Sort
  const [userSort, setUserSort] = useState("oldest");

  // Edit guide
  const [editGuide, setEditGuide] = useState(null);
  const [editForm, setEditForm] = useState({});

  const currentUser = JSON.parse(localStorage.getItem("user"));
  const adminCount = users.filter((u) => u.role === "admin").length;

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const [uRes, gRes] = await Promise.all([
        fetch("http://localhost:5000/api/admin/users", { headers }),
        fetch("http://localhost:5000/api/admin/guides", { headers }),
      ]);
      setUsers(uRes.ok ? await uRes.json() : []);
      setGuides(gRes.ok ? await gRes.json() : []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  // ── Sorting ───────────────────────────────────────────────────────────────
  const roleOrder = { admin: 0, guide: 1, user: 2 };
  const sortedUsers = [...users].sort((a, b) => {
    if (userSort === "aga") return roleOrder[a.role] - roleOrder[b.role];
    if (userSort === "uga") return roleOrder[b.role] - roleOrder[a.role];
    if (userSort === "newest") return new Date(b.createdAt) - new Date(a.createdAt);
    return new Date(a.createdAt) - new Date(b.createdAt);
  });

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filteredUsers = sortedUsers.filter((u) =>
    u.username.toLowerCase().includes(userSearch.toLowerCase())
  );
  const filteredGuides = guides.filter((g) =>
    g.fullName.toLowerCase().includes(guideSearch.toLowerCase())
  );
  const filteredAdmins = users
    .filter((u) => u.role === "admin")
    .filter((u) => u.username.toLowerCase().includes(adminSearch.toLowerCase()));

  // ── Modal helpers ─────────────────────────────────────────────────────────
  const confirm = (title, message, type, onConfirm) =>
    setModalConfig({ isOpen: true, title, message, type, onConfirm });
  const warn = (title, message) =>
    setModalConfig({ isOpen: true, title, message, type: "warning", onConfirm: null });
  const closeModal = () => setModalConfig((p) => ({ ...p, isOpen: false }));

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleDeleteUser = (userId) => {
    if (currentUser._id === userId) return warn("Not Allowed", "You cannot delete your own account.");
    confirm("Delete User", "Delete this user? This cannot be undone.", "danger", () => doDeleteUser(userId));
  };
  const doDeleteUser = async (userId) => {
    closeModal(); setActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5000/api/admin/users/${userId}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setUsers((p) => p.filter((u) => u._id !== userId));
        setGuides((p) => p.filter((g) => g.userId._id !== userId));
      }
    } catch (err) { console.error(err); }
    setActionLoading(false);
  };

  const handleDeleteGuide = (guideId) =>
    confirm("Delete Guide", "Remove this guide profile?", "danger", () => doDeleteGuide(guideId));
  const doDeleteGuide = async (guideId) => {
    closeModal(); setActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5000/api/admin/guides/${guideId}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setGuides((p) => p.filter((g) => g._id !== guideId));
    } catch (err) { console.error(err); }
    setActionLoading(false);
  };

  const handlePromoteAdmin = (userId) =>
    confirm("Promote to Admin", "Grant admin access to this user?", "default", () => doPromoteAdmin(userId));
  const doPromoteAdmin = async (userId) => {
    closeModal(); setActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5000/api/admin/make-admin/${userId}`, {
        method: "PUT", headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setUsers((p) => p.map((u) => u._id === userId ? { ...u, role: "admin" } : u));
    } catch (err) { console.error(err); }
    setActionLoading(false);
  };

  const handleDemoteAdmin = (userId) => {
    if (currentUser?._id === userId) return warn("Not Allowed", "You cannot demote yourself.");
    if (adminCount <= 1) return warn("Not Allowed", "There must be at least one admin.");
    confirm("Demote Admin", "Remove admin access from this user?", "danger", () => doDemoteAdmin(userId));
  };
  const doDemoteAdmin = async (userId) => {
    closeModal(); setActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5000/api/admin/demote-admin/${userId}`, {
        method: "PUT", headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setUsers((p) => p.map((u) => u._id === userId ? { ...u, role: "user" } : u));
    } catch (err) { console.error(err); }
    setActionLoading(false);
  };

  const handleDemoteGuide = (userId, guideId) => {
    if (currentUser?._id === userId) return warn("Not Allowed", "You cannot demote yourself.");
    confirm("Demote Guide", "Revoke guide status and return to normal user?", "danger", () => doDemoteGuide(userId, guideId));
  };
  const doDemoteGuide = async (userId, guideId) => {
    closeModal(); setActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      await fetch(`http://localhost:5000/api/admin/demote-guide/${userId}`, {
        method: "PUT", headers: { Authorization: `Bearer ${token}` },
      });
      await fetch(`http://localhost:5000/api/admin/guides/${guideId}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      setUsers((p) => p.map((u) => u._id === userId ? { ...u, role: "user" } : u));
      setGuides((p) => p.filter((g) => g._id !== guideId));
    } catch (err) { console.error(err); }
    setActionLoading(false);
  };

  const handleEditGuide = (guide) => {
    setEditGuide(guide);
    setEditForm({
      fullName: guide.fullName,
      phone: guide.phone,
      city: guide.city,
      country: guide.country,
      languages: guide.languages.join(", "),
      experience: guide.experience,
      bio: guide.bio,
      pricePerDay: guide.pricePerDay,
    });
  };
  const confirmEditGuide = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5000/api/admin/guides/${editGuide._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...editForm,
          languages: editForm.languages.split(",").map((l) => l.trim()),
          pricePerDay: Number(editForm.pricePerDay),
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setGuides((p) => p.map((g) => g._id === editGuide._id ? updated : g));
        setUsers((p) => p.map((u) =>
          u._id === editGuide.userId._id ? { ...u, fullName: editForm.fullName, country: editForm.country } : u
        ));
        setEditGuide(null);
      }
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className="um-loading">Loading...</div>;

  return (
    <div className="user-management">
      <div className="um-page-header">
        <h2>User Management</h2>
        <p className="um-page-sub">
          {users.length} users &nbsp;·&nbsp; {guides.length} guides &nbsp;·&nbsp; {adminCount} admins
        </p>
      </div>

      {/* ── Users ── */}
      <Section title="All Users" count={filteredUsers.length} accent="var(--accent)" defaultOpen>
        <div className="um-toolbar">
          <SearchBar value={userSearch} onChange={setUserSearch} placeholder="Search by username…" />
          <select
            className="um-sort"
            value={userSort}
            onChange={(e) => setUserSort(e.target.value)}
          >
            <option value="oldest">Oldest first</option>
            <option value="newest">Newest first</option>
            <option value="aga">Admin → Guide → User</option>
            <option value="uga">User → Guide → Admin</option>
          </select>
        </div>

        <div className="um-list">
          {filteredUsers.length === 0 && <p className="um-empty">No users match your search.</p>}
          {filteredUsers.map((user) => (
            <div className={`um-card um-card--${user.role}`} key={user._id} id={`user-${user._id}`}>
              <Avatar name={user.username} role={user.role} />
              <div className="um-card-info">
                <span className="um-card-name">{user.username}</span>
                <span className="um-card-sub">{user.email}</span>
              </div>
              <div className="um-card-meta">
                <span className="um-card-country">{user.country || "—"}</span>
                <span className="um-card-date">{new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="um-card-actions">
                {user.role === "user" && (
                  <button
                    className="um-btn um-btn--promote"
                    onClick={() => handlePromoteAdmin(user._id)}
                    disabled={actionLoading}
                  >
                    Make Admin
                  </button>
                )}
                {user.role === "admin" && (
                  <button
                    className="um-btn um-btn--demote"
                    onClick={() => handleDemoteAdmin(user._id)}
                    disabled={actionLoading || adminCount <= 1 || user._id === currentUser?._id}
                    title={
                      user._id === currentUser?._id ? "Can't demote yourself"
                      : adminCount <= 1 ? "Need at least 1 admin" : ""
                    }
                  >
                    Demote
                  </button>
                )}
                {user.role === "guide" && (
                  <span className="um-badge um-badge--guide">Guide</span>
                )}
                <button
                  className="um-btn um-btn--delete"
                  onClick={() => handleDeleteUser(user._id)}
                  disabled={actionLoading || user._id === currentUser?._id}
                  title={user._id === currentUser?._id ? "Can't delete yourself" : ""}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Guides ── */}
      <Section title="All Guides" count={filteredGuides.length} accent="var(--accent-2)" defaultOpen={false}>
        <div className="um-toolbar">
          <SearchBar value={guideSearch} onChange={setGuideSearch} placeholder="Search by name…" />
        </div>

        <div className="um-list">
          {filteredGuides.length === 0 && <p className="um-empty">No guides match your search.</p>}
          {filteredGuides.map((guide) => (
            <div className="um-card um-card--guide" key={guide._id} id={`guide-${guide._id}`}>
              <Avatar name={guide.fullName} role="guide" />
              <div className="um-card-info">
                <span className="um-card-name">{guide.fullName}</span>
                <span className="um-card-sub">
                  {guide.city}, {guide.country} &nbsp;·&nbsp; ${guide.pricePerDay}/day
                </span>
              </div>
              <div className="um-card-meta">
                <span className="um-card-country">{guide.languages.join(", ")}</span>
              </div>
              <div className="um-card-actions">
                <button
                  className="um-btn um-btn--edit"
                  onClick={() => handleEditGuide(guide)}
                >
                  Edit
                </button>
                <button
                  className="um-btn um-btn--demote"
                  onClick={() => handleDemoteGuide(guide.userId._id, guide._id)}
                  disabled={actionLoading || guide.userId._id === currentUser?._id}
                >
                  Demote
                </button>
                <button
                  className="um-btn um-btn--delete"
                  onClick={() => handleDeleteGuide(guide._id)}
                  disabled={actionLoading}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Admins ── */}
      <Section title="All Admins" count={filteredAdmins.length} accent="#d4b8b8" defaultOpen={false}>
        <div className="um-toolbar">
          <SearchBar value={adminSearch} onChange={setAdminSearch} placeholder="Search admins…" />
        </div>

        <div className="um-list">
          {filteredAdmins.length === 0 && <p className="um-empty">No admins found.</p>}
          {filteredAdmins.map((user) => (
            <div className="um-card um-card--admin" key={user._id} id={`admin-${user._id}`}>
              <Avatar name={user.username} role="admin" />
              <div className="um-card-info">
                <span className="um-card-name">{user.username}</span>
                <span className="um-card-sub">{user.email}</span>
              </div>
              <div className="um-card-meta">
                <span className="um-card-country">{user.country || "—"}</span>
                <span className="um-card-date">{new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="um-card-actions">
                {user._id !== currentUser?._id && (
                  <button
                    className="um-btn um-btn--demote"
                    onClick={() => handleDemoteAdmin(user._id)}
                    disabled={actionLoading || adminCount <= 1}
                    title={adminCount <= 1 ? "Need at least 1 admin" : ""}
                  >
                    Demote
                  </button>
                )}
                {user._id === currentUser?._id && (
                  <span className="um-badge um-badge--self">You</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Edit Guide Modal ── */}
      {editGuide && (
        <div className="um-overlay" onClick={() => setEditGuide(null)}>
          <div className="um-modal" onClick={(e) => e.stopPropagation()}>
            <div className="um-modal-header">
              <h3>Edit Guide</h3>
              <button className="um-modal-close" onClick={() => setEditGuide(null)}>×</button>
            </div>
            <div className="um-modal-body">
              {[
                { label: "Full Name", key: "fullName" },
                { label: "Phone", key: "phone" },
                { label: "City", key: "city" },
                { label: "Country", key: "country" },
                { label: "Languages (comma-separated)", key: "languages" },
                { label: "Price Per Day ($)", key: "pricePerDay" },
              ].map(({ label, key }) => (
                <div className="um-field" key={key}>
                  <label>{label}</label>
                  <input
                    value={editForm[key]}
                    onChange={(e) => setEditForm((p) => ({ ...p, [key]: e.target.value }))}
                  />
                </div>
              ))}
              <div className="um-field">
                <label>Experience</label>
                <textarea
                  rows={3}
                  value={editForm.experience}
                  onChange={(e) => setEditForm((p) => ({ ...p, experience: e.target.value }))}
                />
              </div>
              <div className="um-field">
                <label>Bio</label>
                <textarea
                  rows={3}
                  value={editForm.bio}
                  onChange={(e) => setEditForm((p) => ({ ...p, bio: e.target.value }))}
                />
              </div>
            </div>
            <div className="um-modal-footer">
              <button className="um-btn um-btn--cancel" onClick={() => setEditGuide(null)}>Cancel</button>
              <button className="um-btn um-btn--save" onClick={confirmEditGuide}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={modalConfig.isOpen}
        onClose={closeModal}
        title={modalConfig.title}
        onConfirm={modalConfig.onConfirm}
        type={modalConfig.type}
      >
        <p>{modalConfig.message}</p>
      </Modal>
    </div>
  );
}

export default UserManagement;