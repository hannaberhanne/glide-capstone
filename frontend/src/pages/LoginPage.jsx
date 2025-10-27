import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./LoginPage.css";

export default function LoginPage() {
  const nav = useNavigate();
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");

  const canSubmit = user.trim() !== "" && pass.trim() !== "";

  function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    // TODO: replace with real auth later
    alert("Logging in (stub). Redirecting to dashboard…");
    nav("/dashboard");
  }

  return (
    <div className="login-wrap">
      {/* Top bar — "Create account" */}
      <div className="login-top">
        <div className="login-top-left">Login Page</div>
        <Link className="create-link" to="/signup">Create Account</Link>
      </div>

      <div className="login-card">
        {/* Logo + Title */}
        <div className="logo-box" aria-hidden="true">LOGO</div>
        <h1 className="login-title">LOG IN TO <span>GLIDE+</span></h1>

        {/* Form */}
        <form className="login-form" onSubmit={handleSubmit}>
          <label className="field">
            <span className="field-label">USER NAME</span>
            <input
              className="field-input"
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder=""
            />
            <span className="underline" />
          </label>

          <label className="field">
            <span className="field-label">PASSWORD</span>
            <input
              className="field-input"
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder=""
            />
            <span className="underline" />
          </label>

          <button className="login-btn" type="submit" disabled={!canSubmit}>
            LOG IN
          </button>
        </form>

        <button className="help-link" type="button" onClick={() => alert("Password help (stub)")}>
          CAN’T LOG IN?
        </button>
      </div>
    </div>
  );
}
