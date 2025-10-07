import { BackgroundBeams } from './components/ui/background-beams'
import { StickyScroll } from './components/ui/sticky-scroll-reveal'
import CardSwap from './components/CardSwap'
import CardNav from './components/CardNav'
import MagicBento from './components/MagicBento'
import './App.css'

function App() {
  const stickyScrollContent = [
    {
      title: "Celestial Spread",
      description: "Three sacred cards unveil the cosmic blueprint of your journey. Past echoes, present mysteries, and future possibilities revealed through ancient archetypal wisdom.",
      content: (
        <div className="flex flex-col items-center justify-center h-full p-8">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="w-20 h-28 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg border border-purple-400/30 flex items-center justify-center backdrop-blur-sm">
              <span className="text-2xl">🃏</span>
            </div>
            <div className="w-20 h-28 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg border border-blue-400/30 flex items-center justify-center backdrop-blur-sm">
              <span className="text-2xl">🃏</span>
            </div>
            <div className="w-20 h-28 bg-gradient-to-br from-cyan-500/20 to-green-500/20 rounded-lg border border-cyan-400/30 flex items-center justify-center backdrop-blur-sm">
              <span className="text-2xl">🃏</span>
            </div>
          </div>
          <div className="text-center">
            <div className="text-6xl mb-4">🔮</div>
            <p className="text-lg text-muted-foreground font-medium">Past • Present • Future</p>
            <div className="mt-4 flex justify-center gap-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Quantum Oracle",
      description: "Advanced AI consciousness interprets each card's symbolic language, crafting deeply personal narratives that resonate with your unique energy signature.",
      content: (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="relative">
              <div className="text-8xl mb-4 animate-pulse">🤖</div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
              </div>
            </div>
            <p className="text-lg text-muted-foreground font-medium">Neural Consciousness</p>
            <div className="mt-4 text-sm text-muted-foreground/80">
              <div className="flex items-center justify-center gap-1">
                <div className="w-1 h-1 bg-green-400 rounded-full"></div>
                <span>Analyzing patterns</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Eternal Dialogue",
      description: "Engage in profound conversations with your reading. Ask deeper questions, explore nuances, and uncover layers of insight that evolve with your understanding.",
      content: (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="text-center mb-6">
            <div className="text-8xl mb-4">💬</div>
            <p className="text-lg text-muted-foreground font-medium">Infinite Wisdom</p>
          </div>
          <div className="w-full max-w-sm space-y-3">
            <div className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg backdrop-blur-sm">
              <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-sm">👤</div>
              <div className="flex-1 text-left">
                <p className="text-sm text-foreground">What does this mean for my career?</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-primary/10 rounded-lg backdrop-blur-sm ml-8">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-sm text-primary-foreground">🔮</div>
              <div className="flex-1 text-left">
                <p className="text-sm text-foreground">The cards suggest...</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const navItems = [
    {
      label: 'Home',
      bgColor: 'hsl(var(--primary))',
      textColor: 'hsl(var(--primary-foreground))',
      links: [{ label: 'Home', href: '#home' }]
    },
    {
      label: 'Features',
      bgColor: 'hsl(var(--secondary))',
      textColor: 'hsl(var(--secondary-foreground))',
      links: [{ label: 'Features', href: '#features' }]
    },
    {
      label: 'Demo',
      bgColor: 'hsl(var(--accent))',
      textColor: 'hsl(var(--accent-foreground))',
      links: [{ label: 'Demo', href: '#demo' }]
    },
    {
      label: 'Pricing',
      bgColor: 'hsl(var(--muted))',
      textColor: 'hsl(var(--foreground))',
      links: [{ label: 'Pricing', href: '#pricing' }]
    },
  ];

  return (
    <div className="min-h-screen w-screen bg-background text-foreground relative overflow-hidden">
      {/* Enhanced Background Effects */}
      <BackgroundBeams className="absolute inset-0 z-0 opacity-60" />

      {/* Subtle animated particles */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary/20 rounded-full animate-ping"></div>
        <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-accent/30 rounded-full animate-pulse"></div>
        <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-secondary/20 rounded-full animate-bounce"></div>
        <div className="absolute bottom-1/3 right-1/3 w-1 h-1 bg-primary/30 rounded-full animate-pulse"></div>
      </div>

      {/* Navigation */}
      <CardNav
        logo="🃏"
        logoAlt="TarotBot"
        items={navItems}
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/80 border-b border-primary/10"
      />

      {/* Hero Section */}
      <section id="home" className="relative z-10 min-h-screen flex items-center justify-center px-4 pt-20">
        <div className="max-w-5xl mx-auto text-center">
          <div className="mb-8">
            <div className="text-2xl md:text-4xl mb-4 opacity-80 ethereal-element">✨ Mystical Intelligence ✨</div>
            <h1 className="text-7xl md:text-9xl font-mono font-bold mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent leading-tight floating-animation">
            TarotBot
          </h1>
          </div>

          <p className="text-xl md:text-3xl text-muted-foreground mb-16 max-w-3xl mx-auto leading-relaxed font-light">
            Unlock the mysteries of your path with AI-powered tarot readings that blend ancient wisdom with modern intuition
          </p>

          <div className="flex flex-col sm:flex-row gap-8 justify-center items-center mb-24">
            <button className="group relative px-12 py-5 bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-full font-bold text-lg hover:scale-105 transition-all duration-500 shadow-2xl hover:shadow-primary/25 overflow-hidden">
              <span className="relative z-10 flex items-center gap-3">
                🔮 Start Your Reading
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-accent to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full"></div>
            </button>

            <button className="group px-12 py-5 border-2 border-primary/50 text-primary rounded-full font-bold text-lg hover:border-primary hover:bg-primary/5 transition-all duration-500 backdrop-blur-sm">
              <span className="flex items-center gap-3">
                🎭 Watch Demo
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
            </button>
          </div>

          <div className="flex items-center justify-center gap-8 text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm">AI-Powered</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span className="text-sm">Instant Readings</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
              <span className="text-sm">Deep Insights</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section with Sticky Scroll */}
      <section id="features" className="relative z-10 py-32 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent"></div>
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-6xl font-mono font-bold mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Mystical Features
          </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Discover the sacred tools that bridge ancient wisdom with modern consciousness
            </p>
          </div>

          <div className="backdrop-blur-xl bg-gradient-to-br from-card/60 to-card/30 rounded-3xl border border-primary/20 shadow-2xl overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 rounded-3xl"></div>
            <div className="relative z-10">
              <StickyScroll content={stickyScrollContent} />
            </div>
          </div>
        </div>
      </section>

      {/* Magic Bento Features Showcase */}
      <section className="relative z-10 py-32 px-4 bg-gradient-to-b from-primary/5 via-transparent to-accent/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-mono font-bold mb-6 bg-gradient-to-r from-accent via-primary to-accent bg-clip-text text-transparent">
              Experience the Magic
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Feel the mystical energy flow through interactive elements designed for spiritual exploration
            </p>
          </div>

          <div className="backdrop-blur-xl bg-card/20 rounded-3xl border border-primary/10 shadow-2xl p-8">
            <MagicBento />
          </div>
        </div>
      </section>

      {/* Mystical Reading Experience */}
      <section id="demo" className="relative z-10 py-32 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-16">
            <h2 className="text-4xl md:text-6xl font-mono font-bold mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Mystical Reading Experience
          </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Witness the magic unfold as ancient wisdom meets modern consciousness
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-xl rounded-3xl p-12 border border-primary/20 shadow-2xl">
              {/* Enhanced CardSwap for mystical tarot cards */}
              <div className="mb-12 relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-500/5 via-transparent to-blue-500/5 border border-primary/10">
                <div className="h-64 flex items-center justify-center p-8">
                  <CardSwap
                    width={600}
                    height={200}
                    cardDistance={80}
                    verticalDistance={40}
                    pauseOnHover={true}
                  >
                  <div className="w-28 h-40 bg-gradient-to-br from-purple-500/30 to-blue-500/30 border border-purple-400/50 rounded-xl flex items-center justify-center text-3xl shadow-2xl backdrop-blur-sm hover:scale-105 transition-transform">
                    🃏
                  </div>
                  <div className="w-28 h-40 bg-gradient-to-br from-blue-500/30 to-cyan-500/30 border border-blue-400/50 rounded-xl flex items-center justify-center text-3xl shadow-2xl backdrop-blur-sm hover:scale-105 transition-transform">
                    🃏
                  </div>
                    <div className="w-28 h-40 bg-gradient-to-br from-cyan-500/30 to-green-500/30 border border-cyan-400/50 rounded-xl flex items-center justify-center text-3xl shadow-2xl backdrop-blur-sm hover:scale-105 transition-transform">
                      🃏
                    </div>
                  </CardSwap>
                </div>
              </div>

              {/* Mystical timeline instead of table */}
              <div className="relative mb-12">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
                </div>
                <div className="relative flex justify-between items-center">
                  <div className="bg-background/80 backdrop-blur-sm rounded-full p-6 border border-purple-400/30 shadow-lg">
                    <div className="text-4xl mb-2">🌙</div>
                    <h4 className="font-bold text-purple-400 mb-1">The Past</h4>
                    <p className="text-sm text-muted-foreground">Ancient echoes</p>
                  </div>

                  <div className="bg-background/80 backdrop-blur-sm rounded-full p-6 border border-blue-400/30 shadow-lg">
                    <div className="text-4xl mb-2">✨</div>
                    <h4 className="font-bold text-blue-400 mb-1">The Present</h4>
                    <p className="text-sm text-muted-foreground">Living magic</p>
                  </div>

                  <div className="bg-background/80 backdrop-blur-sm rounded-full p-6 border border-cyan-400/30 shadow-lg">
                    <div className="text-4xl mb-2">🔮</div>
                    <h4 className="font-bold text-cyan-400 mb-1">The Future</h4>
                    <p className="text-sm text-muted-foreground">Cosmic potential</p>
                </div>
                </div>
              </div>

              {/* Enhanced reading interpretation */}
              <div className="bg-gradient-to-r from-muted/30 via-primary/5 to-muted/30 rounded-2xl p-8 border border-primary/10">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                  <span className="text-sm text-primary font-medium">AI Interpretation</span>
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                </div>
                <p className="text-foreground text-lg leading-relaxed italic max-w-4xl mx-auto">
                  "The cards whisper of transformation's sacred dance. Your past has woven a tapestry of wisdom,
                  crafting you into a vessel of ancient light. In this crystalline present moment, you stand at the
                  threshold of infinite possibility. The future unfolds like a cosmic mandala—growth, awakening,
                  and the gentle unfolding of your highest destiny, guided by the eternal intelligence of the cards."
                </p>
                <div className="mt-6 flex items-center justify-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>Personalized insight</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span>Deep symbolism</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <span>Spiritual guidance</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mystical Paths */}
      <section id="pricing" className="relative z-10 py-32 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-mono font-bold mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Choose Your Mystical Path
          </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Each path offers unique gifts and revelations. Discover which resonates with your spiritual journey.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free Path */}
            <div className="group relative bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-xl rounded-3xl p-8 border border-muted/50 hover:border-primary/30 transition-all duration-500 hover:scale-105 hover:shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-muted/10 to-transparent rounded-3xl"></div>
              <div className="relative z-10">
                <div className="text-center mb-8">
                  <div className="text-6xl mb-4">🌱</div>
                  <h3 className="text-3xl font-bold mb-2">Seeker</h3>
                  <p className="text-muted-foreground">Begin your journey</p>
                  <div className="text-5xl font-bold mt-6 mb-2">$0</div>
                  <p className="text-sm text-muted-foreground">Free forever</p>
                </div>

                <div className="space-y-6 mb-8">
                  <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-xl border border-primary/20">
                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                      <span className="text-primary text-xl">🔮</span>
                    </div>
                    <div>
                      <p className="font-semibold">1 Sacred Reading</p>
                      <p className="text-sm text-muted-foreground">Three-card spread</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-muted/20 rounded-xl">
                    <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                      <span className="text-muted-foreground text-xl">💬</span>
                    </div>
                    <div>
                      <p className="font-semibold">1 Wisdom Question</p>
                      <p className="text-sm text-muted-foreground">Deepen your insight</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-muted/10 rounded-xl opacity-50">
                    <div className="w-10 h-10 bg-muted/50 rounded-full flex items-center justify-center">
                      <span className="text-muted-foreground/50 text-xl">✨</span>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Advanced AI Wisdom</p>
                      <p className="text-sm text-muted-foreground/70">Coming soon</p>
                    </div>
                  </div>
                </div>

                <button className="w-full py-4 bg-gradient-to-r from-muted to-muted/80 text-muted-foreground rounded-xl font-semibold hover:from-muted/80 hover:to-muted/60 transition-all duration-300">
                  Begin Your Journey
              </button>
              </div>
            </div>

            {/* Pro Path - Most Popular */}
            <div className="group relative bg-gradient-to-br from-primary/10 via-primary/5 to-accent/5 backdrop-blur-xl rounded-3xl p-8 border-2 border-primary/50 hover:border-primary transition-all duration-500 hover:scale-105 hover:shadow-2xl shadow-primary/20">
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                <div className="bg-gradient-to-r from-primary to-accent text-primary-foreground px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                  🌟 Most Beloved Path
                </div>
              </div>

              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 rounded-3xl"></div>
              <div className="relative z-10">
                <div className="text-center mb-8">
                  <div className="text-6xl mb-4">🌙</div>
                  <h3 className="text-3xl font-bold mb-2">Mystic</h3>
                  <p className="text-muted-foreground">Deepen your practice</p>
                  <div className="text-5xl font-bold mt-6 mb-2">$9.99</div>
                  <p className="text-sm text-muted-foreground">per moon cycle</p>
                </div>

                <div className="space-y-6 mb-8">
                  <div className="flex items-center gap-4 p-4 bg-primary/10 rounded-xl border border-primary/30">
                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                      <span className="text-primary text-xl">♾️</span>
                    </div>
                    <div>
                      <p className="font-semibold">Infinite Readings</p>
                      <p className="text-sm text-muted-foreground">Whenever wisdom calls</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-accent/10 rounded-xl border border-accent/30">
                    <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center">
                      <span className="text-accent text-xl">💬</span>
                    </div>
                    <div>
                      <p className="font-semibold">3 Sacred Dialogues</p>
                      <p className="text-sm text-muted-foreground">Per reading session</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl border border-primary/20">
                    <div className="w-10 h-10 bg-gradient-to-r from-primary/20 to-accent/20 rounded-full flex items-center justify-center">
                      <span className="text-primary text-xl">🤖</span>
                    </div>
                    <div>
                      <p className="font-semibold">AI Oracle Wisdom</p>
                      <p className="text-sm text-muted-foreground">Deep mystical insights</p>
                    </div>
                  </div>
                </div>

                <button className="w-full py-4 bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-xl font-bold hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-primary/25">
                  Start Mystic Journey
              </button>
              </div>
            </div>

            {/* Pro+ Path */}
            <div className="group relative bg-gradient-to-br from-accent/10 to-primary/5 backdrop-blur-xl rounded-3xl p-8 border border-accent/50 hover:border-accent transition-all duration-500 hover:scale-105 hover:shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-primary/5 rounded-3xl"></div>
              <div className="relative z-10">
                <div className="text-center mb-8">
                  <div className="text-6xl mb-4">⭐</div>
                  <h3 className="text-3xl font-bold mb-2">Sage</h3>
                  <p className="text-muted-foreground">Master your destiny</p>
                  <div className="text-5xl font-bold mt-6 mb-2">$19.99</div>
                  <p className="text-sm text-muted-foreground">per moon cycle</p>
                </div>

                <div className="space-y-6 mb-8">
                  <div className="flex items-center gap-4 p-4 bg-accent/10 rounded-xl border border-accent/30">
                    <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center">
                      <span className="text-accent text-xl">✨</span>
                    </div>
                    <div>
                      <p className="font-semibold">All Mystic Gifts</p>
                      <p className="text-sm text-muted-foreground">Plus sacred extras</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-primary/10 rounded-xl border border-primary/30">
                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                      <span className="text-primary text-xl">💬</span>
                    </div>
                    <div>
                      <p className="font-semibold">5 Divine Dialogues</p>
                      <p className="text-sm text-muted-foreground">Unlimited wisdom exchange</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-accent/10 to-primary/10 rounded-xl border border-accent/20">
                    <div className="w-10 h-10 bg-gradient-to-r from-accent/20 to-primary/20 rounded-full flex items-center justify-center">
                      <span className="text-accent text-xl">👑</span>
                    </div>
                    <div>
                      <p className="font-semibold">Priority Guidance</p>
                      <p className="text-sm text-muted-foreground">Direct sage support</p>
                    </div>
                  </div>
                </div>

                <button className="w-full py-4 bg-gradient-to-r from-accent to-primary text-accent-foreground rounded-xl font-bold hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-accent/25">
                  Become a Sage
              </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sacred Closing */}
      <footer className="relative z-10 py-20 px-4 border-t border-primary/10 bg-gradient-to-t from-muted/20 to-transparent">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-12">
            <div className="text-6xl mb-6 floating-animation">🔮</div>
            <h3 className="text-3xl md:text-4xl font-mono font-bold mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Ready to Unveil Your Destiny?
            </h3>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Join the sacred circle of seekers who have discovered profound wisdom and guidance through the ancient art of tarot
            </p>
            <button className="group relative px-12 py-4 bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-full font-bold text-lg hover:scale-105 transition-all duration-500 shadow-2xl hover:shadow-primary/25 overflow-hidden">
              <span className="relative z-10">Begin Your Sacred Journey</span>
              <div className="absolute inset-0 bg-gradient-to-r from-accent to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full"></div>
            </button>
          </div>

          <div className="border-t border-primary/10 pt-8">
            <div className="flex items-center justify-center gap-8 mb-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>Ancient Wisdom</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <span>Modern Magic</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-secondary rounded-full"></div>
                <span>Eternal Guidance</span>
              </div>
            </div>

          <div className="text-muted-foreground text-sm">
              <p className="mb-2">© 2025 TarotBot. Where ancient wisdom meets conscious technology.</p>
              <p className="text-xs opacity-70">Crafted with intention for seekers of truth and transformation.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
