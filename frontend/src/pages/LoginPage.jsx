import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./LoginPage.css";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../config/firebase.js";
import { apiClient } from "../lib/apiClient.js";
import AlertBanner from "../components/AlertBanner.jsx";
import { FiEye, FiEyeOff } from 'react-icons/fi';

export default function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState(null);
  const [showPassword, setShowPassword] = useState(false);


  const canSubmit = email.trim() !== "" && password.trim() !== "";

  const handleToggle = () => setShowPassword(prev => !prev);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit || loading) return;
    setLoading(true);


    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      await userCredential.user.getIdToken();

      let streakData = null;
      try {
        const data = await apiClient.post("/api/auth/login", { email: email.trim() });
        if (data.success) streakData = data.data;
      } catch (err) {
        console.error("Streak update failed:", err);
      }

      nav("/dashboard", { state: { streakData } });
    } catch (error) {
      console.error("Login error:", error);
      let message = "Please fill in all fields correctly";
      if (error.code === "auth/invalid-credential") {
        message = "Invalid email or password.";
      } else if (error.code === "auth/user-not-found") {
        message = "No account found with this email.";
      } else if (error.code === "auth/too-many-requests") {
        message = "Too many failed attempts. Try again later.";
      }
      setBanner({ message, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glide-auth-page">
      <div className="glide-auth-card">
        <div className="glide-auth-head glide-auth-head--centered">
          <Link to="/" className="glide-auth-brand" aria-label="Glide+ home">
            Glide<span>+</span>
          </Link>
          <h1 className="glide-auth-title glide-auth-title--compact">Log in</h1>
          <p className="glide-auth-copy">Welcome back. Pick up where you left off.</p>
        </div>

        <form className="glide-auth-form" onSubmit={handleSubmit}>
          <label className="glide-auth-field">
            <span className="glide-auth-label">Email</span>
            <input
              className="glide-auth-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </label>
          <label className="glide-auth-field">
            <span className="glide-auth-label">Password</span>
            <input
              className="glide-auth-input"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            <span className="password-toggle" onClick={handleToggle}>
  {showPassword ? <FiEye /> : <FiEyeOff />}
</span>
          </label>

          {banner && (
              <AlertBanner
                  message={banner.message}
                  type={banner.type}
                  onClose={() => setBanner(null)}
            />
          )}

          <button className="glide-btn glide-btn--primary glide-auth-submit" type="submit" disabled={!canSubmit || loading}>
            {loading ? "Logging in..." : "Log In"}
          </button>
          <div className="glide-auth-form-links">
            <Link to="/forgot-password" className="glide-auth-link glide-auth-link--muted">
              Can't log in?
            </Link>
          </div>
          <p className="glide-auth-alt">
            Don&apos;t have an account? <Link to="/signup" className="glide-auth-link glide-auth-link--primary">Start here</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
