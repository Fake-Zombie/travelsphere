import { API_URL } from "../services/api";
// Utility: always builds the correct profile pic URL
// profile_pic is stored as just a filename e.g. "1234567890.jpg"
export function getProfilePicUrl(profile_pic) {
  if (!profile_pic) return null;
  if (profile_pic.startsWith("http")) return profile_pic;
  return `${API_URL}/static/profile_pics/${profile_pic}`;
}