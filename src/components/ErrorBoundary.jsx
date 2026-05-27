import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
          <div className="text-4xl mb-4">😅</div>
          <div className="text-sm font-semibold text-text-primary mb-2">出了点小问题</div>
          <div className="text-xs text-text-muted mb-4">刷新一下就好了</div>
          <button
            className="px-6 py-2 bg-caramel text-white rounded-pill text-sm"
            onClick={() => { this.setState({ error: null }); window.location.reload() }}
          >
            刷新页面
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
