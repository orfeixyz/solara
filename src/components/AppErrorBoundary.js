import React from "react";

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || "Unexpected application error"
    };
  }

  componentDidCatch(error) {
    // eslint-disable-next-line no-console
    console.error("AppErrorBoundary", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
          <h2>Application Error</h2>
          <p>{this.state.message}</p>
          <p>Reload after deploying latest build.</p>
        </div>
      );
    }

    return this.props.children;
  }
}
