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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

mapboxgl.accessToken =
  "pk.eyJ1IjoiaGFyc2hiaGFyd2FuaSIsImEiOiJjbXU3OTdpanEwZ3d6MnlzOG4wN3hzNDNwIn0.WKAw4utu4tMpi5NwfoZ_kg";

export default function Dashboard({ onLogout }) {
  const mapRef = useRef(null);
  const drawRef = useRef(null);

  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [analyticsData, setAnalyticsData] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [loading, setLoading] = useState(false);

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

  const fetchAnalytics = async (projectId) => {
    try {
      const res = await api.get(`/projects/${projectId}/analytics`);
      setAnalyticsData(res.data);
    } catch (err) {
      console.error("Failed to stream live dataset records:", err);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject?.id) {
      fetchAnalytics(selectedProject.id);
    }
  }, [selectedProject]);

  useEffect(() => {
    if (mapRef.current) return;

    const mapInitTimer = setTimeout(() => {
      try {
        const map = new mapboxgl.Map({
          container: "map-canvas",
          style: "mapbox://styles/mapbox/outdoors-v12",
          center: [-62.0, -10.5],
          zoom: 4,
          trackResize: true,
        });

        mapRef.current = map;

        map.on("load", () => {
          if (!mapRef.current) return;

          // Initialize vector source layer contexts natively
          mapRef.current.addSource("active-project-source", {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: [],
            },
          });

          mapRef.current.addLayer({
            id: "project-fill-layer",
            type: "fill",
            source: "active-project-source",
            layout: {},
            paint: {
              "fill-color": "#059669",
              "fill-opacity": 0.25,
            },
          });

          mapRef.current.addLayer({
            id: "project-outline-layer",
            type: "line",
            source: "active-project-source",
            layout: {},
            paint: {
              "line-color": "#047857",
              "line-width": 3,
            },
          });

          const draw = new MapboxDraw({
            displayControlsDefault: false,
            controls: { polygon: true, trash: true },
            defaultMode: "draw_polygon",
          });

          mapRef.current.addControl(draw, "top-right");
          drawRef.current = draw;
          mapRef.current.resize();
        });
      } catch (err) {
        console.error("Mapbox rendering failed initialization:", err);
      }
    }, 100);

    return () => {
      clearTimeout(mapInitTimer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        drawRef.current = null;
      }
    };
  }, []);

  // FIXED selectedProject effect mapping: cleanly parses 3D coordinate rings and draws layers
  useEffect(() => {
    if (
      !mapRef.current ||
      !selectedProject ||
      !selectedProject.sites ||
      !selectedProject.sites.length
    )
      return;

    try {
      // 1. Isolate the zero-index site object out of the project sites array list securely
      const targetSite = selectedProject.sites[0];

      if (
        targetSite &&
        targetSite.boundary &&
        targetSite.boundary.coordinates
      ) {
        const polygonCoordinates = targetSite.boundary.coordinates;

        // 2. Unpack the nested loop array to fetch a flat [lng, lat] coordinate point for camera flight paths
        const firstPoint = polygonCoordinates[0][0];

        mapRef.current.flyTo({
          center: firstPoint,
          zoom: 7,
          essential: true,
        });

        // 3. Assemble clean GeoJSON layouts mapping matching specifications
        const geoJsonFeature = {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: polygonCoordinates,
          },
        };

        // 4. Mount geometry coordinates directly to active hardware vectors via setData()
        const targetSource = mapRef.current.getSource("active-project-source");
        if (targetSource) {
          targetSource.setData({
            type: "FeatureCollection",
            features: [geoJsonFeature],
          });
        }
      }
    } catch (e) {
      console.warn("Geospatial layer rendering bypassed:", e);
    }
  }, [selectedProject]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    if (!drawRef.current) {
      alert("Map rendering tools are loading. Please wait a moment.");
      return;
    }

    const drawnData = drawRef.current.getAll();
    if (!drawnData || !drawnData.features || !drawnData.features.length) {
      alert(
        "Please use the polygon tool to draw at least one forest boundary on the map first.",
      );
      return;
    }

    setLoading(true);
    try {
      const geoGeometry = drawnData.features[0].geometry;

      const payload = {
        title: newTitle.trim(),
        description: newDesc.trim() || null,
        sites: [
          {
            site_name: `${newTitle.trim()} Primary Plot`,
            boundary: {
              type: "Polygon",
              coordinates: geoGeometry.coordinates,
            },
          },
        ],
      };

      await api.post("/projects", payload);
      setNewTitle("");
      setNewDesc("");
      drawRef.current.deleteAll();
      fetchProjects();
      alert("Project boundaries saved successfully into PostGIS!");
    } catch (err) {
      console.error("API error during project persistence:", err);
      const backendMessage =
        err.response?.data?.detail || "Data mapping insertion crashed.";
      alert(
        typeof backendMessage === "object"
          ? JSON.stringify(backendMessage)
          : backendMessage,
      );
    } finally {
      setLoading(false);
    }
  };

  const chartData = {
    labels: analyticsData.map((row) => row.record_year),
    datasets: [
      {
        label: "Carbon Sequestration (Metric Tons / Year)",
        data: analyticsData.map((row) => parseFloat(row.carbon_tonnes)),
        borderColor: "#059669",
        backgroundColor: "rgba(5, 150, 105, 0.1)",
        tension: 0.3,
        fill: true,
      },
    ],
  };

  return (
    <div style={styles.dashboardContainer}>
      <div style={styles.sidebar}>
        <div style={styles.header}>
          <h2 style={styles.branding}>Darukaa Panel</h2>
          <button onClick={onLogout} style={styles.logoutBtn}>
            Sign Out
          </button>
        </div>

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
              <span style={styles.badge}>Active Plot Layer</span>
            </div>
          ))}
        </div>

        {selectedProject && analyticsData.length > 0 && (
          <div style={styles.analyticsWrapper}>
            <h3 style={styles.sectionTitle}>Live Carbon Sequestration Yield</h3>
            <div style={{ height: "160px" }}>
              <Line
                data={chartData}
                options={{ responsive: true, maintainAspectRatio: false }}
              />
            </div>
          </div>
        )}
      </div>

      <div id="map-canvas" style={styles.mapContainer} />
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
    color: "#111827",
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
    zIndex: 10,
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
    color: "#374151",
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
    color: "#4b5563",
  },
  input: {
    padding: "0.6rem",
    borderRadius: "6px",
    border: "1px solid #d1d5db",
    fontSize: "0.9rem",
    outline: "none",
    backgroundColor: "#ffffff",
    color: "#111827",
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
  analyticsWrapper: {
    borderTop: "1px solid #e5e7eb",
    paddingTop: "1.25rem",
    color: "#111827",
  },
  mapContainer: {
    width: "calc(100vw - 420px)",
    height: "100vh",
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: "420px",
    backgroundColor: "#e5e7eb",
  },
};
