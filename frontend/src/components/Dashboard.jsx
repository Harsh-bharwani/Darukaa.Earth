import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import { Line } from "react-chartjs-2";
import api from "../utils/api";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import "mapbox-gl/dist/mapbox-gl.css";

// Register ChartJS subcomponents globally for rendering animations
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

// Set your Mapbox Public Token (For local development/hackathons, use a public access key)
mapboxgl.accessToken =
  "pk.eyJ1IjoiZGFydWthYS1kZXYiLCJhIjoiY20wZXhyeXdtMDNscTJpcHR6ZzBndm5hcCJ9.s-9bMWRbK7O7U3S_K6rL6A";

export default function Dashboard({ onLogout }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const drawRef = useRef(null);

  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [loading, setLoading] = useState(false);

  // 1. Fetch Projects from Backend on Boot
  const fetchProjects = async () => {
    try {
      const res = await api.get("/projects");
      setProjects(res.data);
      if (res.data.length > 0 && !selectedProject) {
        setSelectedProject(res.data[0]);
      }
    } catch (err) {
      console.error("Failed to load project records:", err);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // 2. Initialize Mapbox Engine Context
  useEffect(() => {
    if (mapRef.current) return; // Prevent double initialization layout

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [-62.0, -10.5], // Centered around our Amazon test coordinates
      zoom: 6,
    });

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true },
      defaultMode: "draw_polygon",
    });

    map.addControl(draw, "top-right");

    mapRef.current = map;
    drawRef.current = draw;

    return () => map.remove();
  }, []);

  // 3. Handle Map Camera Adjustment when Active Project Cycles
  useEffect(() => {
    if (!mapRef.current || !selectedProject || !selectedProject.sites.length)
      return;

    try {
      // Extract the first coordinate coordinate pair to focus camera
      const coords = selectedProject.sites[0].boundary.coordinates[0][0];
      mapRef.current.flyTo({ center: coords, zoom: 8, essential: true });
    } catch (e) {
      console.warn(
        "Could not parse geometry coordinates for camera tracking:",
        e,
      );
    }
  }, [selectedProject]);

  // 4. Handle Submitting a New Mapped Forest Site Plot
  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newTitle) return;

    const drawnData = drawRef.current.getAll();
    if (!drawnData.features.length) {
      alert(
        "Please use the polygon tool to draw at least one forest boundary on the map first.",
      );
      return;
    }

    setLoading(true);
    try {
      // Format the canvas inputs into our Pydantic schema layout structure
      const payload = {
        title: newTitle,
        description: newDesc,
        sites: [
          {
            site_name: `${newTitle} Primary Plot`,
            boundary: drawnData.features[0].geometry,
          },
        ],
      };

      await api.post("/projects", payload);
      setNewTitle("");
      setNewDesc("");
      drawRef.current.deleteAll(); // Wipe map canvas clean
      fetchProjects(); // Hot-reload sidebar list
      alert("Project boundaries saved successfully into PostGIS!");
    } catch (err) {
      alert("Data mapping insertion crashed. Verify token parameters.");
    } finally {
      setLoading(false);
    }
  };

  // 5. Mock Environmental Analytics Data Structure
  const chartData = {
    labels: ["2021", "2022", "2023", "2024", "2025", "2026"],
    datasets: [
      {
        label: "Carbon Sequestration (Metric Tons / Year)",
        data:
          selectedProject?.id % 2 === 0
            ? [120, 240, 410, 630, 890, 1150]
            : [80, 150, 300, 500, 750, 1000],
        borderColor: "#059669",
        backgroundColor: "rgba(5, 150, 105, 0.1)",
        tension: 0.3,
        fill: true,
      },
    ],
  };

  return (
    <div style={styles.dashboardContainer}>
      {/* SIDEBAR DASHBOARD CONTROL LAYER */}
      <div style={styles.sidebar}>
        <div style={styles.header}>
          <h2 style={styles.branding}>Darukaa Panel</h2>
          <button onClick={onLogout} style={styles.logoutBtn}>
            Sign Out
          </button>
        </div>

        {/* DATA INSERTION CARD */}
        <form onSubmit={handleCreateProject} style={styles.cardForm}>
          <h3 style={styles.sectionTitle}>Map a New Project Site</h3>
          <input
            type="text"
            placeholder="Project Title (e.g. Borneo Reforest)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            style={styles.input}
            required
          />
          <textarea
            placeholder="Environmental Objective Description..."
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            style={{ ...styles.input, height: "60px", resize: "none" }}
          />
          <p style={styles.helperText}>
            ℹ️ Click the polygon tool in the top-right of the map to trace
            borders before saving.
          </p>
          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading ? "Persisting Data..." : "Save Site to PostGIS"}
          </button>
        </form>

        {/* TRACKED SITES LOG */}
        <div style={styles.listContainer}>
          <h3 style={styles.sectionTitle}>Active Nature Projects</h3>
          {projects.map((p) => (
            <div
              key={p.id}
              onClick={() => setSelectedProject(p)}
              style={{
                ...styles.projectItem,
                borderLeft:
                  selectedProject?.id === p.id
                    ? "4px solid #059669"
                    : "4px solid #e5e7eb",
                backgroundColor:
                  selectedProject?.id === p.id ? "#f3fbf7" : "#ffffff",
              }}
            >
              <h4 style={styles.projectTitle}>{p.title}</h4>
              <p style={styles.projectDesc}>
                {p.description || "No description listed."}
              </p>
              <span style={styles.badge}>
                {p.sites?.length || 0} Plot Layer
              </span>
            </div>
          ))}
        </div>

        {/* TIME SERIES ANALYTICS DRAWER */}
        {selectedProject && (
          <div style={styles.analyticsWrapper}>
            <h3 style={styles.sectionTitle}>Carbon Sequestration Yield</h3>
            <div style={{ height: "160px" }}>
              <Line
                data={chartData}
                options={{ responsive: true, maintainAspectRatio: false }}
              />
            </div>
          </div>
        )}
      </div>

      {/* INTERACTIVE MAP CANVAS CONTAINER */}
      <div ref={mapContainerRef} style={styles.mapContainer} />
    </div>
  );
}

const styles = {
  dashboardContainer: {
    display: "flex",
    width: "100vw",
    height: "100vh",
    overflow: "hidden",
    fontFamily: "system-ui, sans-serif",
    backgroundColor: "#f9fafb",
  },
  sidebar: {
    width: "420px",
    height: "100%",
    borderRight: "1px solid #e5e7eb",
    display: "flex",
    flexDirection: "column",
    padding: "1.5rem",
    boxSizing: "border-box",
    backgroundColor: "#ffffff",
    overflowY: "auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.5rem",
  },
  branding: {
    margin: 0,
    fontSize: "1.35rem",
    fontWeight: "700",
    color: "#111827",
  },
  logoutBtn: {
    padding: "0.4rem 0.8rem",
    borderRadius: "6px",
    border: "1px solid #d1d5db",
    backgroundColor: "#ffffff",
    fontSize: "0.85rem",
    cursor: "pointer",
    fontWeight: "500",
  },
  cardForm: {
    backgroundColor: "#f9fafb",
    padding: "1rem",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
    marginBottom: "1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  sectionTitle: {
    margin: "0 0 0.5rem 0",
    fontSize: "0.9rem",
    fontWeight: "700",
    textTransform: "uppercase",
    tracking: "0.05em",
    color: "#4b5563",
  },
  input: {
    padding: "0.6rem",
    borderRadius: "6px",
    border: "1px solid #d1d5db",
    fontSize: "0.9rem",
    outline: "none",
    backgroundColor: "#ffffff",
  },
  helperText: {
    margin: 0,
    fontSize: "0.78rem",
    color: "#6b7280",
    lineHeight: "1.3",
  },
  submitBtn: {
    padding: "0.6rem",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#059669",
    color: "#ffffff",
    fontWeight: "600",
    cursor: "pointer",
    fontSize: "0.9rem",
  },
  listContainer: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    marginBottom: "1.5rem",
  },
  projectItem: {
    padding: "1rem",
    borderRadius: "6px",
    border: "1px solid #e5e7eb",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  projectTitle: {
    margin: "0 0 0.25rem 0",
    fontSize: "1rem",
    fontWeight: "600",
    color: "#111827",
  },
  projectDesc: {
    margin: "0 0 0.5rem 0",
    fontSize: "0.85rem",
    color: "#6b7280",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  badge: {
    fontSize: "0.75rem",
    fontWeight: "600",
    color: "#047857",
    backgroundColor: "#d1fae5",
    padding: "0.2rem 0.5rem",
    borderRadius: "12px",
  },
  analyticsWrapper: { borderTop: "1px solid #e5e7eb", paddingTop: "1.25rem" },
  mapContainer: { flex: 1, height: "100%" },
};
