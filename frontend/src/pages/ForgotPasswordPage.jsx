import { useState } from "react";
import { Link } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../config/firebase";
import "./ForgotPasswordPage.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
    } catch {
      setSent(true);
    }
  }

  return (
    <div className="glide-auth-page">
      <div className="glide-auth-card">
        <div className="glide-auth-head">
          <h1 className="glide-auth-title">Reset Password</h1>
        </div>


        {!sent ? (
            <>
              <p className="glide-auth-copy">
                Enter your email and we’ll send you a reset link.
              </p>

            <form className="glide-auth-form" onSubmit={handleSubmit}>
              <label className="glide-auth-field">
                <span className="glide-auth-label">Email</span>
              <input
                  type="email"
                  className="glide-auth-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
              />
              </label>


            <button type="submit" className="glide-btn glide-btn--primary glide-auth-submit">
              Send Reset Link
            </button>
          </form>
            </>
        ) : (
          <p className="glide-auth-copy forgot-success">
            If an account with this email exists, you will receive a reset link.
          </p>
        )}

        <p className="glide-auth-alt">
          Back to <Link to="/login" className="glide-auth-link">Login</Link>
        </p>
      </div>
    </div>
  );
}
