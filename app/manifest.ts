import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ShepherdWell",
    short_name: "ShepherdWell",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#F28C28",
  };
}
