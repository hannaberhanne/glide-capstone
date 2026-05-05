import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../config/firebase.js";
import { apiClient } from "../lib/apiClient.js";
import "./SignupPage.css";
import AlertBanner from "../components/AlertBanner.jsx";

export default function SignupPage() {
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [banner, setBanner] = useState(null);

  const [loading, setLoading] = useState(false);

  const canSubmit =
      email.trim() !== "" &&
      firstName.trim() !== "" &&
      lastName.trim() !== "" &&
      password !== "" &&
      password.length >= 6 &&
      password === confirmPassword;

  async function handleSignup(e) {
    e.preventDefault();

    if (!canSubmit) {
      setBanner({ message: "Please fill in all fields correctly", type: "error" });
      return;
    }

    setLoading(true);

    try {
      const userCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCred.user;
      await user.getIdToken();
      await apiClient.post("/api/auth/signup", {
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });

      setBanner({ message: "Account Created Successfully!", type: "success" });
      setTimeout(() => nav("/onboarding"), 2000);

    } catch (err) {
      let errorMessage = err.message;

      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters';
      }

      setBanner({ message: errorMessage, type: "error" });
      setLoading(false);
    }
  }

  return (
    <div className="glide-auth-page">
      {banner && (
          <AlertBanner
              message={banner.message}
              type={banner.type}
              onClose={() => setBanner(null)}
          />
      )}

      <div className="glide-auth-card">
        <div className="glide-auth-head glide-auth-head--centered">
          <Link to="/" className="glide-auth-brand" aria-label="Glide+ home">
            Glide<span>+</span>
          </Link>
          <h1 className="glide-auth-title glide-auth-title--compact">Create account</h1>
          <p className="glide-auth-copy">Start with the essentials. You can finish your student setup after sign up.</p>
        </div>

        <form className="glide-auth-form" onSubmit={handleSignup}>
          <div className="glide-auth-grid">
          <label className="glide-auth-field">
            <span className="glide-auth-label">First Name</span>
            <input
              className="glide-auth-input"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </label>

          <label className="glide-auth-field">
            <span className="glide-auth-label">Last Name</span>
            <input
                className="glide-auth-input"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
            />
          </label>

          <label className="glide-auth-field glide-auth-field--full">
            <span className="glide-auth-label">Email</span>
            <input
              className="glide-auth-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="glide-auth-field">
            <span className="glide-auth-label">Password</span>
            <input
              className="glide-auth-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <label className="glide-auth-field">
            <span className="glide-auth-label">Confirm Password</span>
            <input
              className="glide-auth-input"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </label>
          </div>

          <button className="glide-btn glide-btn--primary glide-auth-submit" type="submit" disabled={!canSubmit || loading}>
            {loading ? "Creating Account..." : "Sign Up"}
          </button>
          <div className="glide-auth-form-links">
            <p className="glide-auth-alt">
              Already have an account? <Link className="glide-auth-link glide-auth-link--primary" to="/login">Log in</Link>
            </p>
          </div>

        </form>
      </div>
    </div>
  );
}
