import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase.js";
import "./LoginPage.css"; // reuse same styling

export default function SignupPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const canSubmit =
    email.trim() !== "" &&
    name.trim() !== "" &&
    password.trim() !== "" &&
    password === confirm;

  async function handleSignup(e) {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      // 1. Create user in Firebase Auth
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCred.user;

      // 2. Store user profile in Firestore
      await setDoc(doc(db, "users", user.uid), {
        name,
        email,
        createdAt: new Date().toISOString(),
      });

      alert("Account created successfully!");
      nav("/dashboard");
    } catch (err) {
      console.error("Signup error:", err.message);
      setError(err.message);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-top">
        <div className="login-top-left">Sign Up</div>
        <Link className="create-link" to="/login">
          Back to Login
        </Link>
      </div>

      <div className="login-card">
        <div className="logo-box" aria-hidden="true">
          LOGO
        </div>
        <h1 className="login-title">
          CREATE ACCOUNT ON <span>GLIDE+</span>
        </h1>

        <form className="login-form" onSubmit={handleSignup}>
          <label className="field">
            <span className="field-label">NAME</span>
            <input
              className="field-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <span className="underline" />
          </label>

          <label className="field">
            <span className="field-label">EMAIL</span>
            <input
              className="field-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <span className="underline" />
          </label>

          <label className="field">
            <span className="field-label">PASSWORD</span>
            <input
              className="field-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span className="underline" />
          </label>

          <label className="field">
            <span className="field-label">CONFIRM PASSWORD</span>
            <input
              className="field-input"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            <span className="underline" />
          </label>

          <button className="login-btn" type="submit" disabled={!canSubmit}>
            SIGN UP
          </button>
          {error && <p style={{ color: "red", marginTop: "1rem" }}>{error}</p>}
        </form>
      </div>
    </div>
  );
}