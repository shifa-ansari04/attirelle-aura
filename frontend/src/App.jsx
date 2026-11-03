import { useRef, useState } from "react";
import "./App.css";

const looks = [
  {
    name: "The Soft Contrast",
    style: "Elegant Edit",
    score: 92,
    top: "Burgundy",
    bottom: "Ivory",
    topColor: "#762d42",
    bottomColor: "#e8ddc7",
    image: "soft-contrast.jpg",
  },
  {
    name: "Quiet Luxury",
    style: "Minimal Edit",
    score: 89,
    top: "Soft Cream",
    bottom: "Espresso",
    topColor: "#e8d8bd",
    bottomColor: "#35251f",
    image: "quiet-luxury.jpg",
  },
  {
    name: "The Burgundy Edit",
    style: "Chic Edit",
    score: 95,
    top: "Deep Wine",
    bottom: "Sand",
    topColor: "#5c2037",
    bottomColor: "#cbb69a",
    image: "burgundy-edit.jpg",
  },
  {
    name: "Everyday Ease",
    style: "Casual Edit",
    score: 87,
    top: "Oatmeal",
    bottom: "Charcoal",
    topColor: "#c9b49b",
    bottomColor: "#383039",
    image: "everyday-ease.jpg",
  },
];

// Formats bold text in the AI response.
function renderInline(text) {
  return text.split(/(\*\*.*?\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    return part.replace(/\*/g, "");
  });
}

// Converts Markdown headings and lists into readable React elements.
function formatAnalysis(text) {
  if (!text) return null;

  const lines = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !/^[-–—]{2,}$/.test(line));

  const cleanedLines = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Remove decorative symbols and Markdown heading markers
    line = line
      .replace(/^✦\s*/, "")
      .replace(/^#{1,6}\s*/, "")
      .trim();

    if (!line) continue;

    // Join headings split across separate lines, such as "1." and "Compatibility Score"
    if (/^\d+\.$/.test(line) && lines[i + 1]) {
      const nextLine = lines[i + 1]
        .replace(/^✦\s*/, "")
        .replace(/^#{1,6}\s*/, "")
        .trim();

      line = `${line} ${nextLine}`;
      i++;
    }

    if (line) cleanedLines.push(line);
  }

  return cleanedLines.map((line, index) => {
    const heading = line.match(/^(\d+)\.\s+(.+)$/);

    if (heading) {
      return (
        <h4 className="analysis-heading" key={index}>
          <span className="analysis-number">{heading[1].padStart(2, "0")}</span>
          {renderInline(heading[2])}
        </h4>
      );
    }

    if (/^(✦|•|[-*])\s*/.test(line)) {
      return (
        <div className="analysis-bullet" key={index}>
          <span>✦</span>
          <p>{renderInline(line.replace(/^(✦|•|[-*])\s*/, ""))}</p>
        </div>
      );
    }

    const score = line.match(/^(?:SCORE:\s*)?(\d{1,3})\s*\/\s*100$/i);
    if (score) {
      return (
        <div className="analysis-score" key={index}>
          <span>{score[1]}</span>
          <small>/ 100</small>
        </div>
      );
    }

    if (/^(Needs Styling|Well Matched|Excellent Match|Good Match)(?:\s*[-—:]\s*.*)?$/i.test(line)) {
      return (
        <p className="analysis-verdict" key={index}>
          {line}
        </p>
      );
    }

    return (
      <p className="analysis-paragraph" key={index}>
        {renderInline(line)}
      </p>
    );
  });
}

function App() {
  const studioRef = useRef(null);

  const [topImage, setTopImage] = useState(null);
  const [bottomImage, setBottomImage] = useState(null);
  const [message, setMessage] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  function handleImage(event, setImage) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("Please choose an image file.");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setMessage("Please choose a JPG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage("Each image must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    setImage({
      file,
      url: URL.createObjectURL(file),
    });

    setMessage("");
  }

  async function handleMatch() {
    if (isAnalyzing) return;

    if (!topImage || !bottomImage) {
      setMessage("Upload both clothing pieces to prepare your outfit.");
      return;
    }

    if (!topImage.file || !bottomImage.file) {
      setMessage("Please upload valid images for both pieces.");
      return;
    }

    setIsAnalyzing(true);
    setMessage("Analyzing your outfit with Attirelle Aura AI...");

    try {
      const formData = new FormData();

      formData.append("top", topImage.file);
      formData.append("bottom", bottomImage.file);

      const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
      const response = await fetch(`${apiBaseUrl}/analyze-outfit`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      console.log("AI response:", data);

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to analyze your outfit."
        );
      }

      setMessage(
        data.analysis ||
          data.message ||
          "Outfit analysis completed!"
      );
    } catch (error) {
      console.error("Outfit analysis error:", error);

      setMessage(
        error.message ||
          "Couldn't connect to the outfit service. Please check that the backend is running."
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  const isLoadingMessage = message.startsWith("Analyzing");

  return (
    <main>
      <header className="navbar">
        <a className="brand" href="#home">
          <img
            src="/images/attirelle-aura-transparent.png"
            alt="Attirelle Aura — Your style, beautifully matched"
            className="brand-logo"
          />
        </a>

        <nav>
          <a className="nav-active" href="#home">Home</a>
          <a href="#studio">AI Studio</a>
          <a href="#inspiration">Inspiration</a>
          <a href="#about">About</a>
        </nav>

        <a
          className="nav-cta"
          href="#studio"
          aria-label="Go to the AI styling studio"
        >
          <span>Try your style</span> ↗
        </a>
      </header>

      <section className="hero" id="home">
        <div className="hero-glow" />

        <div className="hero-copy">
          <p className="eyebrow">YOUR PERSONAL AI STYLIST</p>

          <h1>
            Your wardrobe.
            <br />
            Your style.
            <br />
            <em>Perfectly matched.</em>
          </h1>

          <p className="hero-description">
            Upload your clothes, discover beautiful combinations,
            and find the looks that feel uniquely you.
          </p>

          <div className="hero-actions">
            <button
              className="primary-button"
              onClick={() =>
                studioRef.current?.scrollIntoView({
                  behavior: "smooth",
                })
              }
            >
              Find your perfect match <span>→</span>
            </button>

            <a className="text-link" href="#about">
              How it works <span>↓</span>
            </a>
          </div>

          <p className="hero-note">
            YOUR CLOSET, REIMAGINED — ONE LOOK AT A TIME
          </p>
        </div>

        <div
          className="hero-visual"
          aria-label="Fashion editorial display"
        >
          <div className="hero-arch" />

          <img
            className="hero-fashion-image"
            src="/images/hero-mannequins.jpeg"
            alt="Styled outfit inspiration"
          />

          <div className="image-caption">
            <span>THE STYLE EDIT</span>
            <span>NO. 001 — YOUR NEXT LOOK</span>
          </div>

          <p className="handwritten">
            Better outfits,
            <br />
            brighter you ♡
          </p>
        </div>

        <div className="feature-strip">
          <div className="feature">
            <span className="feature-icon">✧</span>
            <div>
              <strong>Smart outfit matching</strong>
              <p>Discover colours and styles that work together.</p>
            </div>
          </div>

          <div className="feature">
            <span className="feature-icon">♧</span>
            <div>
              <strong>Your wardrobe, your way</strong>
              <p>Compare combinations from your own clothes.</p>
            </div>
          </div>

          <div className="feature">
            <span className="feature-icon">♧</span>
            <div>
              <strong>Shop the look</strong>
              <p>Explore pieces to complete your outfit.</p>
            </div>
          </div>
        </div>
      </section>

      <section
        className="studio-section"
        id="studio"
        ref={studioRef}
      >
        <div className="studio-intro">
          <p className="eyebrow dark-eyebrow">
            THE AI STYLING STUDIO
          </p>

          <h2>
            Find your
            <br />
            perfect match.
          </h2>

          <p>
            Two pieces. Endless possibilities.
            Let’s find a combination that works for you.
          </p>

          <span className="studio-handwriting">
            Upload.
            <br />
            Select.
            <br />
            Match. ♡
          </span>
        </div>

        <label className="upload-card">
          <span className="upload-number">01 / YOUR TOP</span>
          <strong>Upload your top</strong>
          <span className="upload-subtitle">
            Shirts, tops, blouses, tees...
          </span>

          <span className="upload-zone">
            {topImage ? (
              <img src={topImage.url} alt="Your selected top" />
            ) : (
              <>
                <span className="upload-icon">↑</span>
                <span>Click to upload or drag your image here</span>
                <small>JPG, PNG, or WebP · Max 5 MB</small>
              </>
            )}
          </span>

          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => handleImage(event, setTopImage)}
          />

          <span className="choose-file">Choose top image ↗</span>
        </label>

        <div className="plus-symbol">+</div>

        <label className="upload-card">
          <span className="upload-number">02 / YOUR BOTTOMS</span>
          <strong>Upload your bottoms</strong>
          <span className="upload-subtitle">
            Trousers, jeans, skirts...
          </span>

          <span className="upload-zone">
            {bottomImage ? (
              <img
                src={bottomImage.url}
                alt="Your selected bottoms"
              />
            ) : (
              <>
                <span className="upload-icon">↑</span>
                <span>Click to upload or drag your image here</span>
                <small>JPG, PNG, or WebP · Max 5 MB</small>
              </>
            )}
          </span>

          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) =>
              handleImage(event, setBottomImage)
            }
          />

          <span className="choose-file">
            Choose bottoms image ↗
          </span>
        </label>

        <div className="analysis-card">
          <span className="analysis-star">✦</span>
          <h3>
            Your style.
            <br />
            Made to match.
          </h3>

          <ul>
            <li>Colour harmony</li>
            <li>Style compatibility</li>
            <li>Personalised suggestions</li>
          </ul>

          <div className="analysis-decoration">✳</div>
        </div>

        <div className="match-action">
          <button
            className="primary-button"
            onClick={handleMatch}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? "Finding your match..." : "Check my outfit"}
            <span>{isAnalyzing ? "…" : "→"}</span>
          </button>

          {message && (
            <div
              className="status-message"
              aria-live="polite"
              aria-busy={isAnalyzing}
            >
              <strong>
                {isLoadingMessage
                  ? "Your personal stylist"
                  : isAnalyzing
                    ? "Analysing your outfit"
                    : "Your outfit result"}
              </strong>

              {isLoadingMessage || isAnalyzing ? (
                <p>{message}</p>
              ) : (
                <div className="analysis-content">
                  {formatAnalysis(message)}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="looks-section" id="inspiration">
        <div className="looks-heading">
          <div>
            <h2>Trending Looks</h2>
            <p>REAL COMBINATIONS. TIMELESS STYLE.</p>
          </div>

          <a href="#studio">Create your own ↗</a>
        </div>

        <div className="looks-grid">
          {looks.map((look) => (
            <article className="look-card" key={look.name}>
              <div className="look-art">
                <img
                  className="look-image"
                  src={`/images/${look.image}`}
                  alt={look.name}
                />
              </div>

              <div className="look-info">
                <span className="look-style">{look.style}</span>
                <h3>{look.name}</h3>
                <p>
                  {look.top} + {look.bottom}
                </p>

                <div className="look-score">
                  <strong>{look.score}%</strong>
                  <span>Style inspiration</span>
                </div>

                <button
                  className="look-arrow"
                  aria-label={`Explore ${look.name}`}
                  onClick={() => {
                    setMessage(
                      `${look.name} is a design example. Upload your clothes to try your own combination.`
                    );

                    studioRef.current?.scrollIntoView({
                      behavior: "smooth",
                    });
                  }}
                >
                  ↗
                </button>
              </div>
            </article>
          ))}
        </div>

        <p className="demo-note">
          ✦ Outfit scores are illustrative design examples, not real AI results.
        </p>
      </section>

      <footer id="about">
        <img
          src="/images/attirelle-aura-transparent.png"
          alt="Attirelle Aura — Your style, beautifully matched"
          className="brand-logo"
        />

        <p>Made for your wardrobe. Designed around your style.</p>

        <a href="#home">Back to top ↑</a>
      </footer>
    </main>
  );
}

export default App;