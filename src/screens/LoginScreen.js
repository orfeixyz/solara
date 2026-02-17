import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ImageLoader from "../components/ImageLoader";
import { imageMap } from "../data/imageMap";

export default function LoginScreen() {
  const navigate = useNavigate();
  const { login, loading } = useAuth();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");

  const onChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await login(form);
      navigate("/world");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-page">
      {/* Intro image shown on login/register backgrounds */}
      <ImageLoader src={imageMap.backgrounds.intro} alt="Solara intro" className="auth-bg" />
      <form className="auth-card" onSubmit={onSubmit}>
        <h2>Sign In</h2>
        <input name="username" placeholder="Username" value={form.username} onChange={onChange} required />
        <input
          name="password"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={onChange}
          required
        />
        {error && <p className="error-text">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? "Connecting..." : "Login"}
        </button>
        <p>
          New operator? <Link to="/register">Create account</Link>
        </p>
      </form>
    </div>
  );
}
