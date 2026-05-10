export const PhoneFrame: React.FC<{
  children: React.ReactNode;
  width?: number;
  height?: number;
}> = ({ children, width = 280, height = 580 }) => {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 24,
        border: "3px solid #334155",
        background: "#1E293B",
        overflow: "hidden",
        boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ height: 24, background: "#0F172A", flexShrink: 0 }} />
      <div style={{ flex: 1, overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
};

export const BrowserFrame: React.FC<{
  children: React.ReactNode;
  width?: number;
  height?: number;
  url?: string;
}> = ({ children, width = 800, height = 500, url = "school1.erp.app" }) => {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 12,
        border: "2px solid #334155",
        background: "#1E293B",
        overflow: "hidden",
        boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          height: 36,
          background: "#0F172A",
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          gap: 8,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#EF4444" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#F59E0B" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#10B981" }} />
        </div>
        <div
          style={{
            flex: 1,
            background: "#1E293B",
            borderRadius: 6,
            padding: "4px 12px",
            fontSize: 11,
            color: "#94A3B8",
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          {url}
        </div>
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
};
