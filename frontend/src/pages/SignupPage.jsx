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