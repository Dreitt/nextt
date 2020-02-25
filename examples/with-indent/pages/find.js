import React, { Component } from 'react'
import Page from '../components/Page'
import { audit } from '@indent/node'

export default class extends Component {
  state = { sessionId: '' }

  static getInitialProps = () => {
    audit.write({
      event: 'server_side_event'
    })

    return {}
  }

  handleInput = e => {
    this.setState({ sessionId: e.target.value })
  }

  handleSubmit = e => {
    e.preventDefault()

    let { sessionId } = this.state

    audit.write({
      event: 'session/find',
      resources: [{
        id: sessionId,
        kind: 'session/id'
      }]
    })

    this.setState({ sessionId: '' })
  }

  render() {
    return (
      <Page>
        <h1>Find a session</h1>
        <form onSubmit={this.handleSubmit}>
          <label>
            <span>Session ID:</span>
            <input onChange={this.handleInput} value={this.state.sessionId} />
          </label>
          <button type="submit">submit</button>
        </form>
      </Page>
    )
  }
}
