"use client";

const stars = [
  { x: "6%", y: "8%", s: 0.7, c: "#ffffff", o: 0.48 },
  { x: "9%", y: "18%", s: 0.8, c: "#c989ff", o: 0.45 },
  { x: "13%", y: "12%", s: 0.6, c: "#ffd96c", o: 0.5 },
  { x: "18%", y: "22%", s: 0.7, c: "#ffffff", o: 0.42 },
  { x: "24%", y: "10%", s: 0.6, c: "#ffffff", o: 0.38 },
  { x: "31%", y: "17%", s: 0.7, c: "#c989ff", o: 0.42 },
  { x: "38%", y: "9%", s: 0.6, c: "#ffd96c", o: 0.48 },
  { x: "47%", y: "14%", s: 0.7, c: "#ffffff", o: 0.44 },
  { x: "58%", y: "11%", s: 0.6, c: "#ffffff", o: 0.4 },
  { x: "66%", y: "18%", s: 0.8, c: "#ffd96c", o: 0.52 },
  { x: "74%", y: "12%", s: 0.7, c: "#c989ff", o: 0.45 },
  { x: "83%", y: "20%", s: 0.6, c: "#ffffff", o: 0.42 },
  { x: "92%", y: "13%", s: 0.7, c: "#ffd96c", o: 0.5 },

  { x: "7%", y: "34%", s: 0.6, c: "#ffffff", o: 0.38 },
  { x: "14%", y: "43%", s: 0.7, c: "#c989ff", o: 0.42 },
  { x: "21%", y: "37%", s: 0.6, c: "#ffd96c", o: 0.46 },
  { x: "29%", y: "48%", s: 0.7, c: "#ffffff", o: 0.42 },
  { x: "36%", y: "33%", s: 0.6, c: "#ffffff", o: 0.36 },
  { x: "44%", y: "42%", s: 0.7, c: "#c989ff", o: 0.4 },
  { x: "53%", y: "36%", s: 0.6, c: "#ffffff", o: 0.38 },
  { x: "62%", y: "46%", s: 0.7, c: "#ffd96c", o: 0.44 },
  { x: "71%", y: "32%", s: 0.6, c: "#ffffff", o: 0.36 },
  { x: "80%", y: "44%", s: 0.7, c: "#c989ff", o: 0.44 },
  { x: "91%", y: "38%", s: 0.6, c: "#ffffff", o: 0.38 },

  { x: "10%", y: "62%", s: 0.7, c: "#ffffff", o: 0.4 },
  { x: "18%", y: "70%", s: 0.6, c: "#ffd96c", o: 0.44 },
  { x: "27%", y: "64%", s: 0.7, c: "#c989ff", o: 0.42 },
  { x: "35%", y: "76%", s: 0.6, c: "#ffffff", o: 0.36 },
  { x: "46%", y: "67%", s: 0.7, c: "#ffffff", o: 0.4 },
  { x: "57%", y: "73%", s: 0.6, c: "#c989ff", o: 0.4 },
  { x: "68%", y: "63%", s: 0.7, c: "#ffd96c", o: 0.46 },
  { x: "77%", y: "75%", s: 0.6, c: "#ffffff", o: 0.38 },
  { x: "88%", y: "66%", s: 0.7, c: "#c989ff", o: 0.42 },
  { x: "95%", y: "72%", s: 0.6, c: "#ffffff", o: 0.36 },

  { x: "8%", y: "88%", s: 0.6, c: "#ffffff", o: 0.34 },
  { x: "20%", y: "84%", s: 0.7, c: "#c989ff", o: 0.38 },
  { x: "33%", y: "91%", s: 0.6, c: "#ffd96c", o: 0.42 },
  { x: "48%", y: "86%", s: 0.6, c: "#ffffff", o: 0.36 },
  { x: "63%", y: "90%", s: 0.7, c: "#ffffff", o: 0.36 },
  { x: "78%", y: "85%", s: 0.6, c: "#c989ff", o: 0.38 },
  { x: "93%", y: "91%", s: 0.6, c: "#ffd96c", o: 0.4 },
];

const softStars = [
  { x: "15%", y: "26%", size: 4, color: "#c989ff", opacity: 0.22 },
  { x: "72%", y: "19%", size: 4, color: "#ffd96c", opacity: 0.24 },
  { x: "83%", y: "58%", size: 5, color: "#c989ff", opacity: 0.2 },
  { x: "28%", y: "74%", size: 4, color: "#ffd96c", opacity: 0.22 },
];

export default function StarField() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {stars.map((star, index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            left: star.x,
            top: star.y,
            width: star.s * 2,
            height: star.s * 2,
            borderRadius: "50%",
            background: star.c,
            opacity: star.o,
            boxShadow: `0 0 ${star.s * 5}px ${star.c}`,
          }}
        />
      ))}

      {softStars.map((star, index) => (
        <div
          key={`soft-${index}`}
          style={{
            position: "absolute",
            left: star.x,
            top: star.y,
            width: star.size,
            height: star.size,
            borderRadius: "50%",
            background: star.color,
            opacity: star.opacity,
            filter: "blur(1px)",
            boxShadow: `0 0 ${star.size * 5}px ${star.color}`,
          }}
        />
      ))}
    </div>
  );
}