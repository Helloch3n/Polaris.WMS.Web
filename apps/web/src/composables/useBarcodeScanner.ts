import { onMounted, onUnmounted } from 'vue'

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  return audioCtx
}

export function playScanSound(success = true) {
  try {
    const ctx = getAudioContext()
    if (ctx.state === 'suspended') {
      ctx.resume()
    }
    
    if (success) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime) // High-pitch A5
      gain.gain.setValueAtTime(0.1, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08)
      osc.start()
      osc.stop(ctx.currentTime + 0.08)
    } else {
      // First low buzz
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(150, ctx.currentTime) // Low buzzer
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)
      osc.start()
      osc.stop(ctx.currentTime + 0.15)
      
      // Second low buzz after 200ms
      setTimeout(() => {
        try {
          const ctx2 = getAudioContext()
          const osc2 = ctx2.createOscillator()
          const gain2 = ctx2.createGain()
          osc2.connect(gain2)
          gain2.connect(ctx2.destination)
          osc2.type = 'sawtooth'
          osc2.frequency.setValueAtTime(150, ctx2.currentTime)
          gain2.gain.setValueAtTime(0.15, ctx2.currentTime)
          gain2.gain.exponentialRampToValueAtTime(0.01, ctx2.currentTime + 0.15)
          osc2.start()
          osc2.stop(ctx2.currentTime + 0.15)
        } catch {}
      }, 200)
    }
  } catch (err) {
    console.warn('AudioContext sound failed:', err)
  }
}

export function speakText(text: string) {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 1.2
    window.speechSynthesis.speak(utterance)
  }
}

export function useBarcodeScanner() {
  let buffer = ''
  let lastKeyTime = 0
  const SCAN_SPEED_THRESHOLD = 45 // ms between keystrokes

  function handleKeyDown(e: KeyboardEvent) {
    // Ignore modifier keys
    if (e.ctrlKey || e.metaKey || e.altKey) {
      return
    }

    const now = Date.now()
    const diff = now - lastKeyTime
    lastKeyTime = now

    // If key is Enter
    if (e.key === 'Enter') {
      if (buffer.length >= 3 && diff < 100) {
        // Looks like a scanned barcode
        e.preventDefault()
        const scannedCode = buffer.trim()
        buffer = ''
        
        // Dispatch scan event globally
        window.dispatchEvent(
          new CustomEvent('barcode-scanned', {
            detail: scannedCode,
          })
        )
      } else {
        buffer = ''
      }
      return
    }

    // Ignore single character keys like Shift, Escape, etc.
    if (e.key.length > 1) {
      return
    }

    // Check if it's rapid typing (from scanner)
    if (buffer === '' || diff < SCAN_SPEED_THRESHOLD) {
      buffer += e.key
    } else {
      // Too slow, reset buffer and assume human typing
      buffer = e.key
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })

  return {
    playScanSound,
    speakText,
  }
}
