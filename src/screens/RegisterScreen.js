import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ImageLoader from "../components/ImageLoader";
import { imageMap } from "../data/imageMap";

export default function RegisterScreen() {
  const navigate = useNavigate();
  const { register, loading } = useAuth();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");

  const onChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const toText = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (Array.isArray(value)) return value.map((item) => toText(item)).filter(Boolean).join(" | ");
    if (typeof value === "object") {
      const combined = [toText(value.message), toText(value.error), toText(value.details)]
        .filter(Boolean)
        .join(" | ");
      if (combined) return combined;
      try {
        return JSON.stringify(value);
      } catch (_error) {
        return "Unexpected error";
      }
    }
    return "Unexpected error";
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await register(form);
      navigate("/login");
    } catch (err) {
      const nextError =
        toText(err?.response?.data) ||
        toText(err?.message) ||
        toText(err) ||
        "Register failed";
      setError(nextError);
    }
  };

  return (
    <div className="auth-page">
      {/* Intro image shown on login/register backgrounds */}
      <ImageLoader src={imageMap.backgrounds.intro} alt="Solara intro" className="auth-bg" />
      <form className="auth-card" onSubmit={onSubmit}>
        <h2>Register</h2>
        <input name="username" placeholder="Username" value={form.username} onChange={onChange} required />
        <input name="email" type="email" placeholder="Email" value={form.email} onChange={onChange} required />
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
          {loading ? "Submitting..." : "Create account"}
        </button>
        <p>
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}


