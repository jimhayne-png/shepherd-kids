import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ShepherdKids",
    short_name: "ShepherdKids",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#F28C28",
  };
}
