import { exec } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const CATEGORIES = ['Visual', 'Auditory', 'Kinesthetic', 'ReadWrite']

const CONTENT_LIBRARY = [
  {
    id: 'visual-1',
    category: 'Visual',
    title: 'Concept Maps and Diagram Packs',
    format: 'Infographic + mind map',
    action: 'Start with the chapter concept map, then annotate links between ideas.',
    targetMode: 'visual',
    actionType: 'flashcards'
  },
  {
    id: 'visual-2',
    category: 'Visual',
    title: 'Color-Coded Slide Summaries',
    format: 'Slides + visual cues',
    action: 'Review summary slides and tag weak topics with red markers.',
    targetMode: 'visual',
    actionType: 'flashcards'
  },
  {
    id: 'auditory-1',
    category: 'Auditory',
    title: 'Audio Explainers and Recaps',
    format: 'Podcast-style notes',
    action: 'Listen at 1.0x and pause after each section to speak back key points.',
    targetMode: 'auditory',
    actionType: 'summary'
  },
  {
    id: 'auditory-2',
    category: 'Auditory',
    title: 'Discussion-Driven Revision',
    format: 'Q&A prompts',
    action: 'Use spoken Q&A prompts and answer aloud before checking hints.',
    targetMode: 'auditory',
    actionType: 'summary'
  },
  {
    id: 'kinesthetic-1',
    category: 'Kinesthetic',
    title: 'Practice-First Quiz Trails',
    format: 'Interactive challenge set',
    action: 'Solve 10 short tasks first, then read explanations only for misses.',
    targetMode: 'kinesthetic',
    actionType: 'quiz'
  },
  {
    id: 'kinesthetic-2',
    category: 'Kinesthetic',
    title: 'Experiment and Simulation Tasks',
    format: 'Hands-on workflow',
    action: 'Complete mini simulations and document what changed each run.',
    targetMode: 'kinesthetic',
    actionType: 'quiz'
  },
  {
    id: 'readwrite-1',
    category: 'ReadWrite',
    title: 'Structured Notes and Cheat Sheets',
    format: 'Text-first guide',
    action: 'Create Cornell notes from the guide and compress into one-page cheatsheet.',
    targetMode: 'readwrite',
    actionType: 'summary'
  },
  {
    id: 'readwrite-2',
    category: 'ReadWrite',
    title: 'Reading Sprints with Recall Logs',
    format: 'Reading + written recall',
    action: 'Read for 20 minutes, then write 5 key takeaways from memory.',
    targetMode: 'readwrite',
    actionType: 'summary'
  }
]

export const normalizeQuestionnaire = (input) => {
  if (Array.isArray(input)) return input.map(Number)
  if (typeof input === 'object' && input !== null) {
    // try to get from numbered keys or values if it's an object of 15 keys
    return Object.values(input).map(Number).slice(0, 20)
  }
  return []
}

export const predictLearningStyle = (q) => {
  return new Promise((resolve, reject) => {
    if (!q || q.length !== 20) return reject(new Error("Invalid questionnaire length"))
    
    // Build CLI arguments
    const args = q.map((ans, idx) => `--q${idx + 1} ${ans}`).join(' ')
    const scriptPath = path.resolve(__dirname, '../../ML/predict.py')
    
    // Execute python prediction script
    const pythonExec = process.platform === 'win32' ? 'python' : 'python3'
    exec(`${pythonExec} "${scriptPath}" ${args}`, (error, stdout, stderr) => {
      if (error) {
        console.error("Python model error:", stderr)
        return reject(error)
      }
      
      const prediction = stdout.trim()
      if (CATEGORIES.includes(prediction)) {
        resolve(prediction)
      } else {
        console.error("Unrecognized ML prediction:", prediction)
        resolve(CATEGORIES[0])
      }
    })
  })
}

export const recommendContent = ({ learningStyle, questionnaire }) => {
  if (!CATEGORIES.includes(learningStyle)) {
    return []
  }

  return CONTENT_LIBRARY
    .map((item) => {
      let rank = 0
      if (item.category === learningStyle) rank += 10
      if (learningStyle === 'Kinesthetic' && item.format.includes('Interactive')) rank += 2
      if (learningStyle === 'ReadWrite' && item.format.includes('Text')) rank += 2
      return { ...item, rank }
    })
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 6)
    .map(({ rank, ...rest }) => rest)
}
