import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./LoginPage.css";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../config/firebase.js";
import AuthLogo from "../components/AuthLogo";

export default function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = email.trim() !== "" && password.trim() !== "";

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit || loading) return;
    
    setError("");
    setLoading(true);
    
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);

      nav("/dashboard");

    } catch (error) {
      console.error("Login error:", error);
      let errorMessage = "Login failed. Please try again.";
      if (error.code === 'auth/invalid-credential') {
        errorMessage = "Invalid email or password.";
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = "No account found with this email.";
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = "Incorrect password.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many failed attempts. Try again later.";
      }

      setError(errorMessage);
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
          
          {error && <p style={{ color: "red", marginTop: "1rem", fontSize: "0.9rem" }}>{error}</p>}
          
          <button type="submit" disabled={!canSubmit || loading}>
            {loading ? "Logging in..." : "Log In"}
          </button>
          <p style={{ marginTop: "1rem" }}>
            Don't have an account?{" "}
            <Link to="/signup" style={{ color: "#f97316", fontWeight: 500 }}>
              Sign up here
            </Link>
          </p>
        </form>

        <div className="login-footer">
          <Link to="/signup" className="create-link">
            Create Account
          </Link>
          <Link to="/forgot-password" className="help-link">Can't log in?</Link>
        </div>
      </div>
    </div>
  );
}