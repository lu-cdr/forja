import { Component, type ReactNode } from 'react'

/** Evita tela em branco: mostra o erro e um jeito de voltar. Os dados ficam intactos no banco. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {}

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="p-6">
        <h1 className="font-display text-3xl font-bold">A forja engasgou</h1>
        <p className="mt-2 text-sm text-iron-300">Algo deu errado nesta tela. Seus treinos continuam salvos.</p>
        <pre className="mt-3 overflow-x-auto rounded-xl bg-iron-850 p-3 text-xs text-danger">{this.state.error.message}</pre>
        <a href="#/" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-rubber px-4 font-semibold text-iron-950">
          Voltar para Hoje
        </a>
      </div>
    )
  }
}
