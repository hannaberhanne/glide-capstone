import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./LoginPage.css";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

export default function LoginPage() {
  const nav = useNavigate();
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");

  const canSubmit = user.trim() && pass.trim();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
<<<<<<< HEAD
    try {
      await signInWithEmailAndPassword(auth, user, pass);
      alert("Login successful!");
      nav("/dashboard");
    } catch (error) {
      alert(`Login failed: ${error.message}`);
    }
=======
    alert("Logging in (demo)...");
    nav("/dashboard");
>>>>>>> origin/landinPage
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>
            Log in to <span>Glide+</span>
          </h1>
          <p>Welcome back! Let’s pick up where you left off.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <label>
            <span>Username</span>
            <input
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
            />
          </label>
          <label>
            <span>Password</span>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
          </label>
          <button type="submit" disabled={!canSubmit}>
            Log In
          </button>
          <p style={{ marginTop: "1rem" }}>
            Don’t have an account?{" "}
            <Link to="/signup" style={{ color: "#4a7bf7", fontWeight: 500 }}>
              Sign up here
            </Link>
          </p>
        </form>

        <div className="login-footer">
          <Link to="/signup" className="create-link">
            Create Account
          </Link>
          <button className="help-link">Can’t log in?</button>
        </div>
      </div>
    </div>
  );
}