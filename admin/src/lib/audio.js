/**
 * Web Audio API notification sounds for Park N Munch Admin
 */

function getAudioContext() {
  try {
    if (typeof window === 'undefined') return null
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return null
    return new AudioContext()
  } catch {
    return null
  }
}

/**
 * Plays a pleasant two-tone chime (880Hz then 1108Hz).
 * Used when a new order arrives.
 */
export function playNotificationSound() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const masterGain = ctx.createGain()
    masterGain.gain.setValueAtTime(0.3, ctx.currentTime)
    masterGain.connect(ctx.destination)

    const tones = [
      { freq: 880, startTime: 0, duration: 0.25 },
      { freq: 1108, startTime: 0.22, duration: 0.35 },
    ]

    tones.forEach(({ freq, startTime, duration }) => {
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(masterGain)

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(freq, ctx.currentTime + startTime)

      gainNode.gain.setValueAtTime(0, ctx.currentTime + startTime)
      gainNode.gain.linearRampToValueAtTime(0.8, ctx.currentTime + startTime + 0.02)
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration)

      oscillator.start(ctx.currentTime + startTime)
      oscillator.stop(ctx.currentTime + startTime + duration)
    })

    setTimeout(() => {
      try {
        ctx.close()
      } catch {
        // ignore
      }
    }, 1500)
  } catch (err) {
    console.warn('Audio playback failed:', err)
  }
}

/**
 * Plays an error sound (lower pitch descending tones).
 * Used for error feedback.
 */
export function playErrorSound() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const masterGain = ctx.createGain()
    masterGain.gain.setValueAtTime(0.2, ctx.currentTime)
    masterGain.connect(ctx.destination)

    const tones = [
      { freq: 440, startTime: 0, duration: 0.2 },
      { freq: 330, startTime: 0.18, duration: 0.3 },
    ]

    tones.forEach(({ freq, startTime, duration }) => {
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(masterGain)

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(freq, ctx.currentTime + startTime)

      gainNode.gain.setValueAtTime(0, ctx.currentTime + startTime)
      gainNode.gain.linearRampToValueAtTime(0.6, ctx.currentTime + startTime + 0.02)
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration)

      oscillator.start(ctx.currentTime + startTime)
      oscillator.stop(ctx.currentTime + startTime + duration)
    })

    setTimeout(() => {
      try {
        ctx.close()
      } catch {
        // ignore
      }
    }, 1500)
  } catch (err) {
    console.warn('Error sound playback failed:', err)
  }
}
