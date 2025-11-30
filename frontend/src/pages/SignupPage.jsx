import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../config/firebase.js";
import "./SignupPage.css";

export default function SignupPage() {
  const nav = useNavigate();
  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

  // FIELDS FOR USER COLLECTION IN DB
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  //const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/;  PASSWORD REQUIREMENTS upper, lower, decimal, 10 chars

  const canSubmit =
      email.trim() !== "" &&
      firstName.trim() !== "" &&
      lastName.trim() !== "" &&
      password !== "" &&
      password.length >= 3 &&
      password === confirmPassword;

  // !passwordRegex.test(password.trim())

  async function handleSignup(e) {
    e.preventDefault();
    setError("");

    if (!canSubmit) { setError("Please fill in all fields correctly"); return; }

    setLoading(true);

    try {
      // 1. Create user in Firebase Auth
      const userCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCred.user;
      const idToken = await user.getIdToken();


      const response = await fetch(`${API_URL}/api/auth/signup`, {  // route to sign up a new user
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({  // body in alphabetical order
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        })
      })
      console.log(`${API_URL}`);

      // 2. Store user profile in Firestore
      //await setDoc(doc(db, "users", user.uid), {
      //  name,
      //  email,
      //  createdAt: new Date().toISOString(),
      //});

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create profile');
      }


      alert("Account created successfully!");
      nav("/dashboard");
    } catch (err) {
      console.error("Signup error:", err.message);
      let errorMessage = err.message;

      // specific error messages from Claude
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters';
      }
      setError(errorMessage);
      setLoading(false);
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
            <span className="field-label">FIRST NAME</span>
            <input
              className="field-input"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <span className="underline" />
          </label>

          <label className="field">
            <span className="field-label">LAST NAME</span>
            <input
                className="field-input"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
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
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
