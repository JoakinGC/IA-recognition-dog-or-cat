import { useState } from 'react'

import './App.css'
import ImageClassifier from './componets/ImageClassifier'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <ImageClassifier/>
    </>
  )
}

export default App
