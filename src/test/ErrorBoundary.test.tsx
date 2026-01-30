import { render, screen } from '@testing-library/react'
import { expect, describe, it } from 'vitest'
import ErrorBoundary from '../components/ErrorBoundary'

// Simple component that throws an error
const ThrowError = () => {
  throw new Error('Test error')
}

describe('ErrorBoundary', () => {
  it('displays error information when a child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument()
  })

  it('provides recovery options', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Go to Home/i })).toBeInTheDocument()
  })
})