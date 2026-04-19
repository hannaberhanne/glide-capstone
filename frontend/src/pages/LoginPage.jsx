import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./LoginPage.css";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../config/firebase.js";
import AuthLogo from "../components/AuthLogo";
import AlertBanner from "../components/AlertBanner.jsx";

export default function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState(null);

  const canSubmit = email.trim() !== "" && password.trim() !== "";

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit || loading) return;


    setLoading(true);
    
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);


      nav("/dashboard");

    } catch (error) {
      console.error("Login error:", error);
      setBanner({ message: "Please fill in all fields correctly", type: "error" });
      if (error.code === 'auth/invalid-credential') {
        setBanner({ message: "Invalid email or password.", type: "error" });
      } else if (error.code === 'auth/user-not-found') {
        setBanner({ message: "No account found with this email.", type: "error" });
      } else if (error.code === 'auth/too-many-requests') {
        setBanner({ message: "Too many failed attempts. Try again later.", type: "error" });
      }

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

        <form onSubmit={handleSubmit}>
          <label>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </label>
          <label>
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </label>

          {banner && (
              <AlertBanner
                  message={banner.message}
                  type={banner.type}
                  onClose={() => setBanner(null)}
              />)}
          
          <button type="submit" disabled={!canSubmit || loading}>
            {loading ? "Logging in..." : "Log In"}
          </button>
          <p style={{ marginTop: "1rem" }}>
            Don't have an account?{" "}
            <Link to="/signup" style={{ color: "var(--highlight-color)", fontWeight: 500 }}>
              Sign up here
            </Link>
          </p>
        </form>

        <div className="login-footer">
          <Link to="/signup" className="create-link">
            Create Account
          </Link>
          <Link to="/forgot-password" className="help-link">Forgot Password</Link>
        </div>
      </div>
    </div>
  );
}