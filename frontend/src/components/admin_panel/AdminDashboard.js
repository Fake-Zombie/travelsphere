import React, { useState, useEffect } from "react";
import StatCard from "./StatCard";
import UserManagement from "./UserManagement";
import GuideApplications from "./GuideApplications";
import AdminRequests from "./AdminRequests";
import AdminDestinations from "./AdminDestinations";
import AdminPayments from "./AdminPayments";
import "./admin_panel.css";
import { API_URL } from "../../services/api";
function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [usersRes, guidesRes, appsRes, destRes, requestsRes, payoutsRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/users`, { headers }),
        fetch(`${API_URL}/api/admin/guides`, { headers }),
        fetch(`${API_URL}/api/guides/applications`, { headers }),
        fetch(`${API_URL}/api/destinations`, { headers }),
        fetch(`${API_URL}/api/requests`, { headers }),
        fetch(`${API_URL}/api/admin/payment-bookings/pending`, { headers })
      ]);

      const users = usersRes.ok ? await usersRes.json() : [];
      const guides = guidesRes.ok ? await guidesRes.json() : [];
      const apps = appsRes.ok ? await appsRes.json() : [];
      const destinations = destRes.ok ? await destRes.json() : [];
      const requests = requestsRes.ok ? await requestsRes.json() : [];
      const payoutsData = payoutsRes.ok ? await payoutsRes.json() : { bookings: [] };

      const pendingRequests = requests.filter(r => r.status === "pending").length;
      const pending = apps.filter(a => a.status === "pending").length;
      const approved = apps.filter(a => a.status === "approved").length;
      const rejected = apps.filter(a => a.status === "rejected").length;
      const pendingPayouts = Array.isArray(payoutsData.bookings) 
        ? payoutsData.bookings.length 
        : 0;

      setStats({
        totalUsers: users.length,
        totalGuides: guides.length,
        totalApplications: apps.length,
        pendingApplications: pending,
        approvedApplications: approved,
        rejectedApplications: rejected,
        totalDestinations: destinations.length,
        pendingRequests: pendingRequests,
        pendingPayouts: pendingPayouts
      });

      setLoading(false);
    } catch (err) {
      console.error("Error:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="loading">Error: {error}</div>;
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
      </div>

      <div className="admin-tabs">
        <button 
          className={`tab ${activeTab === "overview" ? "active" : ""}`} 
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>
        <button 
          className={`tab ${activeTab === "users" ? "active" : ""}`} 
          onClick={() => setActiveTab("users")}
        >
          Users & Guides
        </button>
        <button 
          className={`tab ${activeTab === "applications" ? "active" : ""}`} 
          onClick={() => setActiveTab("applications")}
        >
          Applications ({stats.pendingApplications})
        </button>
        <button 
          className={`tab ${activeTab === "requests" ? "active" : ""}`} 
          onClick={() => setActiveTab("requests")}
        >
          Requests ({stats.pendingRequests})
        </button>
        <button 
          className={`tab ${activeTab === "payments" ? "active" : ""}`} 
          onClick={() => setActiveTab("payments")}
        >
          Payments ({stats.pendingPayouts})
        </button>
        <button 
          className={`tab ${activeTab === "destinationsAdd" ? "active" : ""}`} 
          onClick={() => setActiveTab("destinationsAdd")}
        >
          Add Destinations
        </button>
      </div>

      <div className="admin-content">
        {activeTab === "overview" && (
          <div className="overview">
            <div className="stats-grid">
              <StatCard title="Total Users" value={stats.totalUsers} />
              <StatCard title="Total Guides" value={stats.totalGuides} />
              <StatCard title="Total Destinations" value={stats.totalDestinations} />
              <StatCard title="Total Applications" value={stats.totalApplications} />
              <StatCard title="Pending Applications" value={stats.pendingApplications} />
              <StatCard title="Approved Applications" value={stats.approvedApplications} />
              <StatCard title="Rejected Applications" value={stats.rejectedApplications} />
              <StatCard title="Pending Payouts" value={stats.pendingPayouts} />
            </div>
          </div>
        )}

        {activeTab === "users" && <UserManagement />}
        {activeTab === "applications" && <GuideApplications />}
        {activeTab === "requests" && <AdminRequests />}
        {activeTab === "payments" && <AdminPayments />}
        {activeTab === "destinationsAdd" && <AdminDestinations />}
      </div>
    </div>
  );
}

export default AdminDashboard;