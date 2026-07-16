import React from 'react'
import { Sparkles, Brain, Network, Headphones, BookOpen, Award, Zap, Cpu, Flame, Layers } from 'lucide-react'

function About() {
  const varkDetails = [
    {
      icon: <Network size={28} color="#4F86F7" />,
      title: "Visual (V)",
      color: "#4F86F7",
      desc: "Designed for spatial learners who process structural relationships, flows, and maps.",
      tools: ["Dynamic Concept Mindmaps", "Color-Coded Active Recall Flashcards", "Cloud-GPU Concept Illustration Cards"]
    },
    {
      icon: <Headphones size={28} color="#34D399" />,
      title: "Auditory (A)",
      color: "#34D399",
      desc: "Tailored for learners who benefit from spoken explanations, dialogue, and mnemonic sounds.",
      tools: ["Dual-Host Radio Podcasts", "Aura AI Spoken Conversational Tutor", "60-Second Verbal Recap Summaries", "Spoken Audio Quizzes"]
    },
    {
      icon: <BookOpen size={28} color="#F59E0B" />,
      title: "Read / Write (R)",
      color: "#F59E0B",
      desc: "Perfect for learners who synthesize information through structured text, outlines, and summaries.",
      tools: ["Classic Cornell Active Recall Notes", "Socratic Text Q&A Study Guides", "Executive Outlines & Glossary Notebooks"]
    },
    {
      icon: <Flame size={28} color="#EC4899" />,
      title: "Kinesthetic (K)",
      color: "#EC4899",
      desc: "Built for active, tactile learners who master concepts through hands-on decision paths and scenarios.",
      tools: ["Real-world Scenario Roleplays", "Progressive Cloze Fill-in-the-Blanks", "Sandbox Practice Evaluation Quizzes"]
    }
  ]

  const architectureSteps = [
    {
      icon: <Layers size={22} color="var(--primary)" />,
      title: "Multimodal VARK Resolution",
      desc: "Fleming's scoring algorithm evaluates multi-select questionnaire options to map a student's sensory breakdown (bimodal, trimodal, quadmodal) using relative threshold offsets."
    },
    {
      icon: <Brain size={22} color="var(--success)" />,
      title: "LangGraph Cognitive Routing",
      desc: "Adaptive RAG pipelines route notes and context chunks dynamically to format instructions custom-tailored for the student's active sensory modality."
    },
    {
      icon: <Cpu size={22} color="var(--accent)" />,
      title: "Free-Tier Payload Optimization",
      desc: "Context documents are sliced dynamically into high-yield chunks under 1,500 tokens, bypassing rate limits on Groq free tier models (Llama 3.1 8B Instant) with sub-second response times."
    }
  ]

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '10px 0' }}>
      {/* Premium Hero Banner */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, rgba(79, 134, 247, 0.08) 0%, rgba(139, 92, 246, 0.04) 100%)',
        border: '1px solid var(--border)',
        borderRadius: '24px',
        padding: '50px 40px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-md)',
        marginBottom: '40px'
      }}>
        {/* Neon blur accent */}
        <div style={{
          position: 'absolute',
          top: '-100px',
          right: '-100px',
          width: '300px',
          height: '300px',
          background: 'var(--primary)',
          filter: 'blur(150px)',
          opacity: 0.15,
          pointerEvents: 'none'
        }} />
        
        <h1 style={{
          fontSize: '2.8em',
          fontWeight: 900,
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '15px',
          letterSpacing: '-0.5px'
        }}>
          Sensory-Adaptive AI Study Studio
        </h1>
        
        <p style={{
          fontSize: '1.2em',
          color: 'var(--text)',
          maxWidth: '800px',
          margin: '0 auto 30px',
          lineHeight: '1.7',
          fontWeight: 500
        }}>
          ConnectiLearn is a pioneering educational platform that adapts study materials in real-time to match your cognitive profile, built on Neil Fleming's scientific VARK model.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ padding: '10px 20px', background: 'var(--bg-secondary)', borderRadius: '50px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9em', fontWeight: 600 }}>
            <Award size={16} color="var(--primary)" /> 85% VARK Problem Solved
          </div>
          <div style={{ padding: '10px 20px', background: 'var(--bg-secondary)', borderRadius: '50px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9em', fontWeight: 600 }}>
            <Zap size={16} color="var(--warning)" /> LangGraph Orchestration
          </div>
          <div style={{ padding: '10px 20px', background: 'var(--bg-secondary)', borderRadius: '50px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9em', fontWeight: 600 }}>
            <Cpu size={16} color="var(--success)" /> FastAPI & Llama 3.1
          </div>
        </div>
      </div>

      {/* VARK Grid */}
      <h2 style={{ fontSize: '1.6em', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-dark)' }}>
        <Sparkles size={24} style={{ color: 'var(--primary)' }} /> The 4 Sensory Modalities
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '25px', marginBottom: '40px' }}>
        {varkDetails.map((style, idx) => (
          <div key={idx} className="card" style={{
            padding: '24px',
            borderRadius: '20px',
            border: '1.5px solid var(--border)',
            transition: 'transform 0.25s ease, border-color 0.25s ease',
            cursor: 'default',
            position: 'relative',
            background: 'var(--bg-tertiary)',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-6px)'
            e.currentTarget.style.borderColor = style.color
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none'
            e.currentTarget.style.borderColor = 'var(--border)'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: `${style.color}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px'
            }}>
              {style.icon}
            </div>

            <h3 style={{ fontSize: '1.25em', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '10px' }}>
              {style.title}
            </h3>
            
            <p style={{ fontSize: '0.9em', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '20px' }}>
              {style.desc}
            </p>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '15px' }}>
              <strong style={{ display: 'block', fontSize: '0.78em', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: '10px' }}>
                Key Study Tools:
              </strong>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {style.tools.map((t, ti) => (
                  <div key={ti} style={{ fontSize: '0.85em', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: style.color }}>•</span> {t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* RAG & AI Pipeline Architecture Showcase */}
      <h2 style={{ fontSize: '1.6em', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-dark)' }}>
        <Brain size={24} style={{ color: 'var(--accent)' }} /> Scientific Methodology & Architecture
      </h2>
      <div className="card" style={{
        padding: '30px',
        borderRadius: '24px',
        border: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
        marginBottom: '45px'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px' }}>
          {architectureSteps.map((step, idx) => (
            <div key={idx} style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'var(--bg-tertiary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid var(--border)'
                }}>
                  {step.icon}
                </div>
                <h4 style={{ margin: 0, fontSize: '1.05em', fontWeight: 700, color: 'var(--text-dark)' }}>
                  {step.title}
                </h4>
              </div>
              <p style={{ margin: 0, fontSize: '0.88em', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Tech Stack Footer Card */}
      <div className="card" style={{
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        padding: '24px 30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '1.1em', fontWeight: 800, color: 'var(--text-dark)' }}>ConnectiLearn Platform Stack</h4>
          <p style={{ margin: 0, fontSize: '0.82em', color: 'var(--text-muted)' }}>Developed for publication under advanced sensory-adaptive education research.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '0.8em', fontWeight: 700 }}>
          <span style={{ padding: '6px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px' }}>React 18 & Vite</span>
          <span style={{ padding: '6px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px' }}>FastAPI (Python)</span>
          <span style={{ padding: '6px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px' }}>MongoDB Atlas</span>
          <span style={{ padding: '6px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px' }}>LangGraph Agents</span>
          <span style={{ padding: '6px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px' }}>Groq Cloud API</span>
        </div>
      </div>
    </div>
  )
}

export default About
