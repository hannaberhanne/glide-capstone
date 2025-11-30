// src/pages/SignUpPage.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { auth } from "../config/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import AuthLogo from "../components/AuthLogo";
import "./LoginPage.css";

export default function SignUpPage() {
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();
    if (password !== confirm) return alert("Passwords do not match.");

    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCred.user, {
        displayName: `${first} ${last}`,
      });
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <AuthLogo />

        <h1 className="auth-title">Create your account</h1>
        <p className="auth-sub">Start organizing your goals, tasks, and habits today.</p>

        <form className="auth-form" onSubmit={handleSignup}>
          <label className="field-label">First Name</label>
          <input
            className="field-input"
            value={first}
            onChange={(e) => setFirst(e.target.value)}
            required
          />

          <label className="field-label">Last Name</label>
          <input
            className="field-input"
            value={last}
            onChange={(e) => setLast(e.target.value)}
            required
          />

          <label className="field-label">Email</label>
          <input
            className="field-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label className="field-label">Password</label>
          <input
            className="field-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <label className="field-label">Confirm Password</label>
          <input
            className="field-input"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />

          <button type="submit" className="auth-btn">
            Sign Up
          </button>
        </form>

        <p className="auth-alt">
          Already have an account?{" "}
          <Link to="/login" className="auth-link">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}