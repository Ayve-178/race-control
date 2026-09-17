import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(cleanup)

// testing-library sets this for the duration of a render, so an act() called before anything
// has been rendered, advancing the race clock to give a chart some history first, warns that
// it is not in a react test environment. it is; the flag just has not been turned on yet.
const reactGlobals = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
reactGlobals.IS_REACT_ACT_ENVIRONMENT = true

// jsdom has no svg geometry engine. it creates an svg <path> as a plain SVGElement and
// implements neither getTotalLength nor getPointAtLength, so anything that places a marker on
// the circuit throws the moment it renders. the stub is a straight line a thousand units long,
// which is enough to assert that the map asks for the right distance along the path without
// pretending jsdom can lay out a racing circuit. real browsers do this properly.
Object.assign(SVGElement.prototype, {
  getTotalLength: () => 1000,
  getPointAtLength: (length: number) => ({ x: length, y: 0 }),
})
