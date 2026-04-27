import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./LoginPage.css";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../config/firebase.js";
import AuthLogo from "../components/AuthLogo";
import AlertBanner from "../components/AlertBanner.jsx";
import { FiEye, FiEyeOff } from 'react-icons/fi';

export default function LoginPage() {
  const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
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
      const token = await userCredential.user.getIdToken();

      let streakData = null;
      try {
        const res = await fetch(`${API_URL}/api/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ email: email.trim() }),
        });
        const data = await res.json();
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
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>
            Log in to <AuthLogo />
          </h1>
          <p>Welcome back! Let's pick up where you left off.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="login-label">
            <span className="login-label-text">Email</span>
            <input
              className="login-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </label>
          <label className="login-label">
            <span className="login-label-text">Password</span>
            <input
                className="login-input"
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

          <button className="login-submit" type="submit" disabled={!canSubmit || loading}>
            {loading ? "Logging in..." : "Log In"}
          </button>
          <p className="login-inline-copy">
            Don't have an account?{" "}
            <Link to="/signup" className="login-inline-link">
              Sign up here
            </Link>
          </p>
        </form>

        <div className="login-footer">
          <Link to="/signup" className="create-link">
            Create Account
          </Link>
          <Link to="/forgot-password" className="help-link">
            Can't log in?
          </Link>
        </div>
      </div>
    </div>
  );
}
