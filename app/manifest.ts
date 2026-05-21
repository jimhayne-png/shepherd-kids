import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ShepherdWell",
    short_name: "ShepherdWell",
    description: "Church Growth & Member Engagement Platform",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#F28C28",
    icons: [
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: "/shepherdwell-logo.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/shepherdwell-logo.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
