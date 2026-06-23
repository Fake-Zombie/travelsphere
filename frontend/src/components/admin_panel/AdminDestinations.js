import React, { useState, useEffect, useRef } from "react";
import Modal from "../modal/Modal";
import "./addAdminDestinations.css";

const EMPTY_FORM = {
  name: "", country: "", description: "", type: "", image: null,
  bestTimeMonths: "", bestTimeReason: ""
};

function AdminDestinations() {
    const [destinations, setDestinations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [mode, setMode] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [preview, setPreview] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [search, setSearch] = useState("");
    const [showTypeDropdown, setShowTypeDropdown] = useState(false);
    const [modal, setModal] = useState({ isOpen: false, type: "default", title: "", message: "", onConfirm: null });

    const closeModal = () => setModal(m => ({ ...m, isOpen: false }));
    const showError = (msg) => setModal({ isOpen: true, type: "danger", title: "Error", message: msg, onConfirm: null });
    const typeDropdownRef = useRef(null);
    useEffect(() => {
  const handleClickOutside = (e) => {
    if (typeDropdownRef.current && !typeDropdownRef.current.contains(e.target)) {
      setShowTypeDropdown(false);
    }
  };
  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, []);


    useEffect(() => { fetchDestinations(); }, []);

    const fetchDestinations = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const res = await fetch("http://localhost:5000/api/destinations", {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setDestinations(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const openAdd = () => {
        setSelected(null);
        setForm(EMPTY_FORM);
        setPreview(null);
        setMode("add");
    };

    const openEdit = (dest) => {
        setSelected(dest);
        setForm({
            name: dest.name,
            country: dest.country,
            description: dest.description,
            type: dest.type || "Other",
            image: null,
            bestTimeMonths: dest.bestTimeToVisit?.months || "",
            bestTimeReason: dest.bestTimeToVisit?.reason || "",
        });
        setPreview(`http://localhost:5000${dest.image}`);
        setMode("edit");
    };

    const openView = (dest) => {
        setSelected(dest);
        setMode("view");
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setForm((f) => ({ ...f, image: file }));
        setPreview(URL.createObjectURL(file));
    };

    const handleSubmit = async () => {
        if (!form.name.trim() || !form.country.trim() || !form.description.trim()) return;
        try {
            setSubmitting(true);
            const token = localStorage.getItem("token");
            const formData = new FormData();
            formData.append("name", form.name);
            formData.append("country", form.country);
            formData.append("description", form.description);
            formData.append("type", form.type);
            formData.append("bestTimeMonths", form.bestTimeMonths);
            formData.append("bestTimeReason", form.bestTimeReason);
            if (form.image) formData.append("image", form.image);

            const url = mode === "edit"
                ? `http://localhost:5000/api/destinations/${selected._id}`
                : "http://localhost:5000/api/destinations";
            const method = mode === "edit" ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            if (!res.ok) throw new Error("Failed to save destination");
            const saved = await res.json();

            if (mode === "edit") {
                setDestinations((prev) => prev.map((d) => d._id === saved._id ? saved : d));
                setSelected(saved);
                setMode("view");
            } else {
                setDestinations((prev) => [saved, ...prev]);
                setSelected(saved);
                setMode("view");
            }
            setForm(EMPTY_FORM);
            setPreview(null);
        } catch (err) {
            showError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        setModal({
            isOpen: true,
            type: "danger",
            title: "Delete Destination",
            message: "Are you sure you want to delete this destination? This cannot be undone.",
            onConfirm: async () => {
                closeModal();
                try {
                    const token = localStorage.getItem("token");
                    const res = await fetch(`http://localhost:5000/api/destinations/${id}`, {
                        method: "DELETE",
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    if (!res.ok) throw new Error("Failed to delete");
                    setDestinations((prev) => prev.filter((d) => d._id !== id));
                    setSelected(null);
                    setMode(null);
                } catch (err) {
                    showError(err.message);
                }
            }
        });
    };

    const filtered = destinations.filter((d) =>
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.country.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="ad-root">
            {/* LEFT PANEL */}
            <div className="ad-list-panel">
                <div className="ad-list-header">
                    <div className="ad-list-title">
                        <h2>Destinations</h2>
                        <span className="ad-count">{destinations.length}</span>
                    </div>
                    <button className="ad-add-btn" onClick={openAdd}>+ Add</button>
                </div>

                <div className="ad-search-wrap">
                    <input
                        type="text"
                        placeholder="Search destinations..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="ad-list">
                    {loading ? (
                        <div className="ad-empty">Loading...</div>
                    ) : filtered.length === 0 ? (
                        <div className="ad-empty">No destinations found.</div>
                    ) : (
                        filtered.map((dest) => (
                            <div
                                key={dest._id}
                                className={`ad-list-item ${selected?._id === dest._id ? "selected" : ""}`}
                                onClick={() => openView(dest)}
                            >
                                <img
                                    src={`http://localhost:5000${dest.image}`}
                                    alt={dest.name}
                                    className="ad-thumb"
                                    onError={(e) => { e.target.src = "/static/uploads/country_pics/default.jpg"; }}
                                />
                                <div className="ad-item-info">
                                    <span className="ad-item-name">{dest.name}</span>
                                    <span className="ad-item-country">{dest.country}</span>
                                </div>
                                {dest.avgRating > 0 && (
                                    <span className="ad-item-rating">★ {dest.avgRating.toFixed(1)}</span>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* RIGHT PANEL */}
            <div className="ad-detail-panel">
                {!mode && (
                    <div className="ad-placeholder">
                        <div className="ad-placeholder-icon">🌍</div>
                        <p>Select a destination or add a new one</p>
                    </div>
                )}

                {/* VIEW MODE */}
                {mode === "view" && selected && (
                    <div className="ad-view">
                        <img
                            src={`http://localhost:5000${selected.image}`}
                            alt={selected.name}
                            className="ad-detail-img"
                            onError={(e) => { e.target.src = "/static/uploads/country_pics/default.jpg"; }}
                        />
                        <div className="ad-detail-content">
                            <div className="ad-detail-top">
                                <div>
                                    <span className="ad-detail-country">{selected.country} · {selected.type}</span>
                                    <h3>{selected.name}</h3>
                                </div>
                                <div className="ad-detail-actions">
                                    <button className="ad-edit-btn" onClick={() => openEdit(selected)}>Edit</button>
                                    <button className="ad-delete-btn" onClick={() => handleDelete(selected._id)}>Delete</button>
                                </div>
                            </div>
                            <p className="ad-detail-desc">{selected.description}</p>
                            {selected.bestTimeToVisit?.months && (
                                <div className="ad-detail-besttime">
                                    <span className="ad-besttime-label">Best Time</span>
                                    <span className="ad-besttime-months">📅 {selected.bestTimeToVisit.months}</span>
                                    {selected.bestTimeToVisit.reason && (
                                        <p className="ad-besttime-reason">{selected.bestTimeToVisit.reason}</p>
                                    )}
                                </div>
                            )}
                            <div className="ad-detail-stats">
                                <div className="ad-stat">
                                    <span>{selected.avgRating > 0 ? selected.avgRating.toFixed(1) : "—"}</span>
                                    <label>Avg Rating</label>
                                </div>
                                <div className="ad-stat">
                                    <span>{selected.totalRatings || 0}</span>
                                    <label>Total Ratings</label>
                                </div>
                                <div className="ad-stat">
                                    <span>{selected.favoritesCount || 0}</span>
                                    <label>Favorites</label>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ADD / EDIT MODE */}
                {(mode === "add" || mode === "edit") && (
                    <div className="ad-form">
                        <div className="ad-form-header">
                            <h3>{mode === "edit" ? "Edit Destination" : "New Destination"}</h3>
                            <button className="ad-cancel-btn" onClick={() => { setMode(selected ? "view" : null); }}>Cancel</button>
                        </div>

                        {/* Image Upload */}
                        <div className="ad-img-upload" onClick={() => document.getElementById("dest-img-input").click()}>
                            {preview ? (
                                <img src={preview} alt="Preview" className="ad-img-preview" />
                            ) : (
                                <div className="ad-img-placeholder">
                                    <span>🖼</span>
                                    <p>Click to upload image</p>
                                </div>
                            )}
                            <input
                                id="dest-img-input"
                                type="file"
                                accept="image/*"
                                style={{ display: "none" }}
                                onChange={handleImageChange}
                            />
                        </div>

                        <div className="ad-form-grid">
                            <div className="ad-field">
                                <label>Name</label>
                                <input
                                    type="text"
                                    placeholder="Destination name"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                />
                            </div>
                            <div className="ad-field">
                                <label>Country</label>
                                <input
                                    type="text"
                                    placeholder="Country"
                                    value={form.country}
                                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                                />
                            </div>
                            <div className="ad-field">
                                <label>Type</label>
                                <div className="ad-type-input-wrap">
                                    <input
                                        type="text"
                                        placeholder="e.g. Beach, Mountain, City..."
                                        value={form.type}
                                        onChange={(e) => setForm({ ...form, type: e.target.value })}
                                    />
                                    <div className="ad-type-dropdown" ref={typeDropdownRef}>
                                        <button
                                            className="ad-type-toggle"
                                            onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                                            type="button"
                                        >
                                            ▾
                                        </button>
                                        {showTypeDropdown && (
                                            <div className="ad-type-options">
                                                {["Beach","Mountain","Romance","City","Desert","Forest","Island","Cultural","Adventure","Other"].map(t => (
                                                    <div
                                                        key={t}
                                                        className="ad-type-option"
                                                        onClick={() => { setForm({ ...form, type: t }); setShowTypeDropdown(false); }}
                                                    >
                                                        {t}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="ad-field">
                            <label>Description</label>
                            <textarea
                                placeholder="Describe this destination..."
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                rows={4}
                            />
                        </div>

                        {/* Best Time to Visit */}
                        <div className="ad-field-group">
                            <div className="ad-field-group-label">Best Time to Visit</div>
                            <div className="ad-form-grid">
                                <div className="ad-field">
                                    <label>Months</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Mar – May, Oct – Nov"
                                        value={form.bestTimeMonths}
                                        onChange={(e) => setForm({ ...form, bestTimeMonths: e.target.value })}
                                    />
                                </div>
                                <div className="ad-field">
                                    <label>Reason</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Dry season with clear skies."
                                        value={form.bestTimeReason}
                                        onChange={(e) => setForm({ ...form, bestTimeReason: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="ad-form-footer">
                            <button
                                className="ad-save-btn"
                                onClick={handleSubmit}
                                disabled={submitting || !form.name.trim() || !form.country.trim() || !form.description.trim()}
                            >
                                {submitting ? "Saving..." : mode === "edit" ? "Save Changes" : "Add Destination"}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <Modal
                isOpen={modal.isOpen}
                onClose={closeModal}
                title={modal.title}
                type={modal.type}
                onConfirm={modal.onConfirm}
                confirmText={modal.type === "danger" ? "Delete" : "OK"}
            >
                <p>{modal.message}</p>
            </Modal>
        </div>
    );
}

export default AdminDestinations;