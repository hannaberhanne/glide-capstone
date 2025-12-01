import { useState } from "react";
import { Link } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../config/firebase";
import "./ForgotPasswordPage.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
    } catch (err) {
      console.error(err);
      setError("Unable to send reset email. Try again.");
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">
          Reset your <span className="brand-orange">password</span>
        </h1>
        <p className="auth-sub">
          Enter your email and we’ll send you a reset link.
        </p>

        {!sent ? (
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-label">Email</label>
            <input
              type="email"
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            {error && <p style={{ color: "red" }}>{error}</p>}

            <button type="submit" className="auth-btn">
              Send Reset Link
            </button>
          </form>
        ) : (
          <p className="success-msg">
            ✔ Reset email sent! Check your inbox.
          </p>
        )}

        <p className="auth-alt">
          Back to <Link to="/login" className="auth-link">Login</Link>
        </p>
      </div>
    </div>
  );
}