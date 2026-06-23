// services/api.js
export const RATE_URL = "/rate";
export const COMMENT_URL = "/comment";

export async function rateDestination(destinationId, rating) {
  const res = await fetch(RATE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ destination_id: destinationId, rating })
  });
  return res.json();
}

export async function addComment(formData) {
  const res = await fetch(COMMENT_URL, { method: "POST", body: formData });
  return res.json();
}

export async function fetchWeather(city) {
  const apiKey = "749642f1500dfcf9d3a5c892a63d7fe8";
  const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`);
  return res.json();
}
