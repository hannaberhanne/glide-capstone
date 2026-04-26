import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../config/firebase.js";
import "./SignupPage.css";
import AuthLogo from "../components/AuthLogo";
import AlertBanner from "../components/AlertBanner.jsx";

export default function SignupPage() {
  const nav = useNavigate();
  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

  // FIELDS FOR USER COLLECTION IN DB
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [banner, setBanner] = useState(null);

  //const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  //const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/;  PASSWORD REQUIREMENTS upper, lower, decimal, 10 chars

  const canSubmit =
      email.trim() !== "" &&
      firstName.trim() !== "" &&
      lastName.trim() !== "" &&
      password !== "" &&
      password.length >= 6 &&
      password === confirmPassword;

  // !passwordRegex.test(password.trim())

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
      const idToken = await user.getIdToken();

      const response = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        })
      });

      if (!response.ok) {
        const data = await response.json();
        setBanner({ message: data.error || "Failed to create profile", type: "error" });
        setLoading(false);
        return; // ❌ was missing — code was falling through to success banner
      }

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
    <div className="login-wrap">
      {banner && (
          <AlertBanner
              message={banner.message}
              type={banner.type}
              onClose={() => setBanner(null)}
          />
      )}

      <div className="login-top">
        <div className="login-top-left">Sign Up</div>
        <Link className="create-link" to="/login">
          Back to Login
        </Link>
      </div>

      <div className="login-card">
        <h1 className="login-title">
          Create Account
        </h1>

        <form className="login-form" onSubmit={handleSignup}>
          <label className="field">
            <span className="field-label">First Name</span>
            <input
              className="field-input"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <span className="underline" />
          </label>

          <label className="field">
            <span className="field-label">Last Name</span>
            <input
                className="field-input"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
            />
            <span className="underline" />
          </label>

          <label className="field">
            <span className="field-label">Email</span>
            <input
              className="field-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <span className="underline" />
          </label>

          <label className="field">
            <span className="field-label">Password</span>
            <input
              className="field-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span className="underline" />
          </label>

          <label className="field">
            <span className="field-label">Confirm Password</span>
            <input
              className="field-input"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <span className="underline" />
          </label>

          <button className="login-btn" type="submit" disabled={!canSubmit || loading}>
            {loading ? "Creating Account..." : "SIGN UP"}
          </button>
          {/** error && <error>{error}</error>**/}

        </form>
      </div>
    </div>
  );
}
